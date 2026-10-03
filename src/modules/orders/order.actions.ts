"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveCustomerContext } from "@/modules/customer/context.server";

export type ConfirmOrderResult =
  | { ok: true; orderId: string; orderNumber: number }
  | { ok: false; message: string };

export type FinalOrderPriceResult = { ok: true } | { ok: false; message: string };

export type OrderListItem = {
  id: string;
  orderNumber: number;
  createdAt: string;
  totalMinor: number;
  units: number;
  status: string;
  delivery: string;
};

export async function listOrders(): Promise<{ ok: true; orders: OrderListItem[] } | { ok: false; orders: []; message: string }> {
  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, orders: [], message: context.message };
  const { data, error } = await supabase.from("orders").select("id, order_number, created_at, total_minor, status, confirmed_window, order_items(quantity)").order("created_at", { ascending: false });
  if (error) return { ok: false, orders: [], message: "Não foi possível carregar os pedidos." };
  return { ok: true, orders: (data ?? []).map(order => ({
    id: order.id,
    orderNumber: order.order_number,
    createdAt: order.created_at,
    totalMinor: order.total_minor,
    units: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
    status: order.status,
    delivery: typeof order.confirmed_window === "object" && order.confirmed_window && "label" in order.confirmed_window ? String(order.confirmed_window.label) : "Aguardando previsão",
})) };
}

export type OrderNotification = { id: string; orderId: string; orderNumber: number; toStatus: string; changedAt: string; reason: string | null };

export async function listOrderNotifications(): Promise<{ ok: true; notifications: OrderNotification[] } | { ok: false; notifications: []; message: string }> {
  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, notifications: [], message: context.message };
  const { data, error } = await supabase.from("orders").select("id, order_number, order_status_history(id, to_status, changed_at, reason)").order("created_at", { ascending: false });
  if (error) return { ok: false, notifications: [], message: "Não foi possível carregar as notificações." };
  const notifications = (data ?? []).flatMap(order => (order.order_status_history ?? []).map(entry => ({ id: entry.id, orderId: order.id, orderNumber: order.order_number, toStatus: entry.to_status, changedAt: entry.changed_at, reason: entry.reason }))).sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  return { ok: true, notifications };
}

export type OrderDetails = {
  id: string;
  orderNumber: number;
  status: string;
  createdAt: string;
  totalMinor: number;
  approximateTotalMinor: number | null;
  finalTotalMinor: number | null;
  finalConfirmedAt: string | null;
  delivery: string;
  address: string;
  items: Array<{ id: string; name: string; unit: string; quantity: number; unitPriceMinor: number; subtotalMinor: number; approximateUnitPriceMinor: number | null; finalUnitPriceMinor: number | null }>;
  history: Array<{ fromStatus: string | null; toStatus: string; changedAt: string; reason: string | null }>;
};

export async function getOrderDetails(orderId: string): Promise<{ ok: true; order: OrderDetails } | { ok: false; message: string }> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(orderId)) return { ok: false, message: "Pedido inválidao." };
  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, message: context.message };
  const { data: order, error } = await supabase.from("orders").select("id, order_number, status, created_at, total_minor, approximate_total_minor, final_total_minor, final_confirmed_at, confirmed_window, address_snapshot, order_items(id, sku_name_snapshot, sale_unit_snapshot, quantity, unit_price_minor, subtotal_minor, approximate_unit_price_minor, final_unit_price_minor, approximate_subtotal_minor, final_subtotal_minor, product_variants(name, products(name, brand))), order_status_history(from_status, to_status, changed_at, reason)").eq("id", orderId).maybeSingle();
  if (error || !order) return { ok: false, message: "Não foi possível carregar os detalhes do pedido." };
  const snapshot = order.address_snapshot && typeof order.address_snapshot === "object" ? order.address_snapshot as Record<string, unknown> : null;
  const street = snapshot ? [snapshot.address_line, snapshot.address_number].filter(Boolean).map(String).join(", ") : "";
  const address = snapshot ? [
    snapshot.label ? `${String(snapshot.label)}: ${street}` : street,
    snapshot.address_complement ? String(snapshot.address_complement) : "",
    [snapshot.district, snapshot.city && snapshot.state ? `${String(snapshot.city)}/${String(snapshot.state)}` : snapshot.city].filter(Boolean).map(String).join(", "),
    snapshot.postal_code ? `CEP ${String(snapshot.postal_code)}` : "",
  ].filter(Boolean).join(" · ") : "Endereço não informado";
  return { ok: true, order: {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    createdAt: order.created_at,
    totalMinor: order.total_minor,
    approximateTotalMinor: order.approximate_total_minor,
    finalTotalMinor: order.final_total_minor,
    finalConfirmedAt: order.final_confirmed_at,
    delivery: typeof order.confirmed_window === "object" && order.confirmed_window && "label" in order.confirmed_window ? String(order.confirmed_window.label) : "Aguardando previsão",
    address,
    items: (order.order_items ?? []).map(item => ({ id: item.id, name: item.product_variants?.products?.name ?? item.sku_name_snapshot, unit: `${item.product_variants?.name ?? item.sku_name_snapshot} · ${item.sale_unit_snapshot}`, quantity: item.quantity, unitPriceMinor: item.final_unit_price_minor ?? item.approximate_unit_price_minor ?? item.unit_price_minor, subtotalMinor: item.final_subtotal_minor ?? item.approximate_subtotal_minor ?? item.subtotal_minor, approximateUnitPriceMinor: item.approximate_unit_price_minor, finalUnitPriceMinor: item.final_unit_price_minor })),
    history: (order.order_status_history ?? []).map(entry => ({ fromStatus: entry.from_status, toStatus: entry.to_status, changedAt: entry.changed_at, reason: entry.reason })),
  } };
}

export async function confirmOrderReceipt(orderId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(orderId)) return { ok: false, message: "Pedido inválidao." };
  const { error } = await (await createClient()).rpc("advance_order_status", { p_order_id: orderId, p_to_status: "RECEIPT_CONFIRMED" });
  if (error) {
    console.error("ORDER_RECEIPT_CONFIRM_FAILED", JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint, orderId }));
    if (error.message.includes("INVALID_ORDER_TRANSITION")) return { ok: false, message: "Este pedido ainda não est disponível para confirmação." };
    return { ok: false, message: "Não foi possível confirmar o recebimento." };
  }
  return { ok: true };
}

export async function cancelOrder(orderId: string, reason: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const normalizedReason = reason.trim();
  if (!uuid.test(orderId)) return { ok: false, message: "Pedido inválidao." };
  if (normalizedReason.length < 3) return { ok: false, message: "Informe o motivo do cancelamento." };
  if (normalizedReason.length > 500) return { ok: false, message: "O motivo deve ter no máximo 500 caracteres." };
  const { error } = await (await createClient()).rpc("cancel_order", { p_order_id: orderId, p_reason: normalizedReason });
  if (error) {
    console.error("ORDER_CANCEL_FAILED", JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint, orderId }));
    if (error.message.includes("INVALID_ORDER_TRANSITION")) return { ok: false, message: "Este pedido não pode mais ser cancelado." };
    if (error.message.includes("FORBIDDEN")) return { ok: false, message: "Seu perfil não pode cancelar este pedido." };
    return { ok: false, message: "Não foi possível cancelar o pedido." };
  }
  return { ok: true };
}

export type CatalogListItem = { skuId: string; name: string; brand: string; detail: string; saleUnit: string; category: string; priceMinor: number | null; minimumQuantity: number; imageUrl?: string | null; imageAlt?: string };

export type ActiveCartItem = { id: string; skuId: string; name: string; brand: string; detail: string; saleUnit: string; minimumQuantity: number; quantity: number; unitPriceMinor: number; subtotalMinor: number };
export type ActiveCart = { id: string; establishmentId: string; items: ActiveCartItem[]; totalMinor: number; units: number };

export async function setCartItemQuantity(input: { cartId: string; skuId: string; quantity: number }): Promise<{ ok: true } | { ok: false; message: string }> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!input || typeof input !== "object" || !uuid.test(input.cartId) || !uuid.test(input.skuId) || !Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > 9999) {
    return { ok: false, message: "Quantidade inválida." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_active_cart_item_quantity", { p_cart_id: input.cartId, p_sku_id: input.skuId, p_quantity: input.quantity });
  if (!error) return { ok: true };
  const code = error.message.match(/(ACTIVE_PROFILE_REQUIRED|ACTIVE_MEMBERSHIP_REQUIRED|ACTIVE_CART_NOT_FOUND|CART_ITEM_NOT_FOUND|PRICE_UNAVAILABLE|MINIMUM_QUANTITY_NOT_MET|INVALID_QUANTITY)/)?.[1];
  const messages: Record<string, string> = {
    ACTIVE_PROFILE_REQUIRED: "Entre novamente para atualizar o carrinho.",
    ACTIVE_MEMBERSHIP_REQUIRED: "Seu acesso Ò  empresa não está ativo.",
    ACTIVE_CART_NOT_FOUND: "O carrinho foi alterado. Atualize a página.",
    CART_ITEM_NOT_FOUND: "Este item não estÒ¡ mais no carrinho. Atualize a página.",
    PRICE_UNAVAILABLE: "O preço deste item não estÒ¡ mais disponível.",
    MINIMUM_QUANTITY_NOT_MET: "A quantidade deve respeitar o minimo deste SKU.",
    INVALID_QUANTITY: "Quantidade inválida.",
  };
  return { ok: false, message: (code && messages[code]) ?? "Não foi possível atualizar o carrinho." };
}

export async function getActiveCart(): Promise<{ ok: true; cart: ActiveCart | null } | { ok: false; cart: null; message: string }> {
  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, cart: null, message: context.message };
  if (!context.selected) return { ok: false, cart: null, message: "Nenhum estabelecimento ativo foi encontrado." };
  const { data: carts, error } = await supabase.from("carts").select("id, establishment_id, cart_items(id, sku_id, quantity, displayed_unit_price_minor, product_variants(name, sale_unit, minimum_quantity, products(name, brand)))").eq("company_id", context.companyId).eq("establishment_id", context.selected.id).eq("status", "ACTIVE").limit(1);
  if (error) return { ok: false, cart: null, message: "Não foi possível carregar o carrinho." };
  const row = carts?.[0];
  if (!row) return { ok: true, cart: null };
  const items = (row.cart_items ?? []).map(item => {
    const variant = item.product_variants;
    const product = variant?.products;
    const unitPriceMinor = Number(item.displayed_unit_price_minor ?? 0);
    return { id: item.id, skuId: item.sku_id, name: product?.name ?? "Produto", brand: product?.brand ?? "", detail: variant ? `${variant.name} · ${variant.sale_unit}` : "", saleUnit: variant?.sale_unit ?? "UNIT", minimumQuantity: Number(variant?.minimum_quantity ?? 1), quantity: item.quantity, unitPriceMinor, subtotalMinor: unitPriceMinor * item.quantity };
  });
  return { ok: true, cart: { id: row.id, establishmentId: row.establishment_id, items, totalMinor: items.reduce((sum, item) => sum + item.subtotalMinor, 0), units: items.reduce((sum, item) => sum + item.quantity, 0) } };
}

export async function listCatalog(): Promise<{ ok: true; products: CatalogListItem[] } | { ok: false; products: []; message: string }> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("company_id").maybeSingle();
  if (!profile?.company_id) return { ok: false, products: [], message: "FaÒ§a login para consultar o catálogo." };
  const [{ data: products, error: productsError }, { data: variants, error: variantsError }, { data: prices, error: pricesError }, { data: categories }, { data: images, error: imagesError }] = await Promise.all([
    supabase.from("products").select("id, name, brand, category_id").eq("status", "ACTIVE"),
    supabase.from("product_variants").select("id, product_id, name, sale_unit, minimum_quantity").eq("status", "ACTIVE"),
    supabase.from("prices").select("sku_id, amount_minor, valid_from, valid_until").eq("company_id", profile.company_id).eq("status", "ACTIVE").lte("valid_from", new Date().toISOString()).or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`).order("valid_from", { ascending: false }),
    supabase.from("categories").select("id, name").eq("status", "ACTIVE"),
    supabase.from("product_images").select("product_id, variant_id, storage_object_path, alt_text, is_primary, sort_order").order("is_primary", { ascending: false }).order("sort_order", { ascending: true }),
  ]);
  if (imagesError) return { ok: false, products: [], message: "Não foi possível carregar o catálogo." };
  if (productsError || variantsError || pricesError) return { ok: false, products: [], message: "Não foi possível carregar o catálogo." };
  const categoryMap = new Map((categories ?? []).map(category => [category.id, category.name]));
  const priceMap = new Map<string, number | null>();
  for (const price of prices ?? []) if (!priceMap.has(price.sku_id)) priceMap.set(price.sku_id, price.amount_minor);
  for (const variant of variants ?? []) if (!priceMap.has(variant.id)) priceMap.set(variant.id, null);
  const variantImageMap = new Map<string, { url: string; alt: string }>();
  const productImageMap = new Map<string, { url: string; alt: string }>();
  for (const image of images ?? []) {
    const value = { url: image.storage_object_path, alt: image.alt_text };
    if (image.variant_id && !variantImageMap.has(image.variant_id)) variantImageMap.set(image.variant_id, value);
    if (image.product_id && !productImageMap.has(image.product_id)) productImageMap.set(image.product_id, value);
  }
  const privateImagePaths = [...variantImageMap.values(), ...productImageMap.values()].map(image => image.url).filter(url => !/^https?:\/\//i.test(url));
  const signedImages = new Map<string, string>();
  if (privateImagePaths.length) {
    const { data: signed } = await supabase.storage.from('catalog-product-images').createSignedUrls(privateImagePaths, 3600);
    for (const item of signed ?? []) if (item.path && item.signedUrl) signedImages.set(item.path, item.signedUrl);
  }
  const productMap = new Map((products ?? []).map(product => [product.id, product]));
  return { ok: true, products: (variants ?? []).flatMap(variant => { const product = productMap.get(variant.product_id); const priceMinor = priceMap.get(variant.id); const image = variantImageMap.get(variant.id) ?? (product ? productImageMap.get(product.id) : undefined); const imageUrl = image ? (/^https?:\/\//i.test(image.url) ? image.url : signedImages.get(image.url) ?? null) : null; return product && priceMinor !== undefined ? [{ skuId: variant.id, name: product.name, brand: product.brand ?? "", detail: `${variant.name} · ${variant.sale_unit}`, category: categoryMap.get(product.category_id) ?? "Outros", priceMinor, saleUnit: variant.sale_unit, minimumQuantity: variant.minimum_quantity, imageUrl, imageAlt: image?.alt }] : []; }) };
}

export async function addCatalogItem(skuId: string, quantity = 1): Promise<{ ok: true; quantity: number } | { ok: false; message: string }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(skuId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return { ok: false, message: "Quantidade inválida." };
  const supabase = await createClient();
  const { data: visibleVariant } = await supabase.from("product_variants").select("id").eq("id", skuId).eq("status", "ACTIVE").maybeSingle();
  if (!visibleVariant) return { ok: false, message: "Este produto não está disponível para venda." };
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, message: context.message };
  if (!context.selected) return { ok: false, message: "Selecione um estabelecimento antes de adicionar produtos." };
  const { data, error } = await supabase.rpc("add_to_establishment_cart", { p_establishment_id: context.selected.id, p_sku_id: skuId, p_quantity: quantity });
  if (error || !data?.[0]) {
    const code = error?.message.match(/(PRICE_UNAVAILABLE|ESTABLISHMENT_NOT_AVAILABLE|SKU_NOT_AVAILABLE|ACTIVE_MEMBERSHIP_REQUIRED|ACTIVE_PROFILE_REQUIRED|MINIMUM_QUANTITY_NOT_MET|INVALID_QUANTITY)/)?.[1];
    const messages: Record<string, string> = {
      PRICE_UNAVAILABLE: "Este produto não possui preço disponível no momento.",
      ESTABLISHMENT_NOT_AVAILABLE: "O estabelecimento selecionado não estÒ¡ disponível.",
      SKU_NOT_AVAILABLE: "Este produto não estÒ¡ disponível para venda.",
      ACTIVE_MEMBERSHIP_REQUIRED: "Seu acesso Ò  empresa não está ativo.",
      ACTIVE_PROFILE_REQUIRED: "Entre novamente para adicionar produtos ao carrinho.",
      MINIMUM_QUANTITY_NOT_MET: "A quantidade deve respeitar o minimo deste SKU.",
      INVALID_QUANTITY: "A quantidade informada Ò© inválida.",
    };
    return { ok: false, message: (code && messages[code]) ?? "Não foi possível adicionar o item ao carrinho." };
  }
  return { ok: true, quantity: data[0].quantity };
}

export async function confirmActiveCart(input: {
  cartId: string;
  addressId: string;
  deliveryWindow: "Hoje" | "Amanhã";
}): Promise<ConfirmOrderResult> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!input || typeof input !== "object" || !uuid.test(input.cartId) || !uuid.test(input.addressId)) return { ok: false, message: "Selecione um endereço vÒ¡lido." };
  if (input.deliveryWindow !== "Hoje" && input.deliveryWindow !== "Amanhã") return { ok: false, message: "Selecione uma janela de entrega válida." };
  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, message: context.message };
  if (!context.selected) return { ok: false, message: "Selecione um estabelecimento." };
  const { data: selectedCart } = await supabase.from("carts").select("establishment_id").eq("id", input.cartId).eq("company_id", context.companyId).maybeSingle();
  if (selectedCart?.establishment_id !== context.selected.id) return { ok: false, message: "O carrinho não pertence ao estabelecimento selecionado." };
  const { data, error } = await supabase.rpc("submit_order_for_review", {
    p_cart_id: input.cartId,
    p_address_id: input.addressId,
    p_window_label: input.deliveryWindow,
    p_idempotency_key: crypto.randomUUID(),
  });

  if (error || !data?.[0]) {
    const code = error?.message.match(/(ACTIVE_PROFILE_REQUIRED|ACTIVE_MEMBERSHIP_REQUIRED|ACTIVE_CART_NOT_FOUND|ADDRESS_REQUIRED|ADDRESS_NOT_AVAILABLE|CART_EMPTY|INSUFFICIENT_STOCK|PRICE_UNAVAILABLE|INVENTORY_LOCATION_NOT_FOUND|MINIMUM_QUANTITY_NOT_MET|INVALID_DELIVERY_WINDOW)/)?.[1];
    const messages: Record<string, string> = {
      ACTIVE_PROFILE_REQUIRED: "Seu perfil operacional ainda não foi configurado. Saia e entre novamente.",
      ACTIVE_CART_NOT_FOUND: "Não há um carrinho ativo para este estabelecimento.",
      ACTIVE_MEMBERSHIP_REQUIRED: "Seu acesso Ò  empresa não está ativo.",
      ADDRESS_REQUIRED: "Selecione um endereço de entrega.",
      ADDRESS_NOT_AVAILABLE: "O endereço selecionado não está ativo para este estabelecimento.",
      CART_EMPTY: "Adicione ao menos um item ao carrinho antes de confirmar.",
      INSUFFICIENT_STOCK: "Um dos itens não possui estoque suficiente.",
      PRICE_UNAVAILABLE: "Um dos itens não possui preço vigente.",
      INVENTORY_LOCATION_NOT_FOUND: "O local de estoque ainda não estÒ¡ configurado.",
      MINIMUM_QUANTITY_NOT_MET: "Revise as quantidades mÃ­nimas dos itens antes de enviar o pedido.",
      INVALID_DELIVERY_WINDOW: "Selecione uma janela de entrega válida.",
    };
    const message = (code && messages[code]) ?? "Não foi possível enviar o pedido para análise.";
    return { ok: false, message };
  }

  return { ok: true, orderId: data[0].order_id, orderNumber: data[0].order_number };
}

export async function confirmFinalOrderPrice(orderId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(orderId)) return { ok: false, message: "Pedido invÃ¡lido." };
  const { error } = await (await createClient()).rpc("confirm_final_order_price", {
    p_order_id: orderId,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (!error) return { ok: true };
  console.error("ORDER_FINAL_PRICE_CONFIRM_FAILED", JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint, orderId }));
  const code = error.message.match(/(FORBIDDEN|ORDER_NOT_FOUND|INVALID_ORDER_TRANSITION|FINAL_PRICE_REQUIRED|INSUFFICIENT_STOCK)/)?.[1];
  const messages: Record<string, string> = {
    FORBIDDEN: "Seu perfil nÃ£o pode confirmar este pedido.",
    ORDER_NOT_FOUND: "Pedido nÃ£o encontrado.",
    INVALID_ORDER_TRANSITION: "Este pedido ainda nÃ£o estÃ¡ pronto para confirmaÃ§Ã£o.",
    FINAL_PRICE_REQUIRED: "O pedido ainda nÃ£o possui preÃ§os finais.",
    INSUFFICIENT_STOCK: "Um dos itens ficou sem estoque para esta confirmaÃ§Ã£o.",
  };
  return { ok: false, message: (code && messages[code]) ?? "NÃ£o foi possÃ­vel confirmar os preÃ§os finais." };
}
