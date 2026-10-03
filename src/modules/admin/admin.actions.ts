"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCompany(companyId: string) {
  const { data, error } = await (await createClient()).rpc('admin_get_company', { p_company_id: companyId });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) return { ok: false as const, message: 'Empresa não encontrada ou acesso não autorizado.' };
  return { ok: true as const, company: data as Record<string, unknown> };
}

export async function listCompanies() {
  const { data, error } = await (await createClient()).rpc("admin_list_companies");
  if (error) return { ok: false as const, message: "Não foi possível carregar as empresas." };
  return { ok: true as const, companies: data ?? [] };
}

export async function listEstablishments(companyId: string) {
  const { data, error } = await (await createClient()).rpc("admin_list_establishments", { p_company_id: companyId });
  if (error) return { ok: false as const, message: "Não foi possível carregar os estabelecimentos." };
  return { ok: true as const, establishments: data ?? [] };
}

export async function listCompanyInvitations(companyId: string) {
  const { data, error } = await (await createClient()).rpc("admin_list_company_invitations", { p_company_id: companyId });
  if (error) return { ok: false as const, message: "Não foi possível carregar os convites." };
  return { ok: true as const, invitations: data ?? [] };
}

export async function revokeCompanyInvitation(invitationId: string) {
  const { error } = await (await createClient()).rpc("revoke_company_invitation", { p_invitation_id: invitationId });
  if (error) return { ok: false as const, message: "Não foi possível revogar o convite." };
  return { ok: true as const };
}

export async function updateCompany(companyId: string, data: Record<string, string | number>) {
  const { data: result, error } = await (await createClient()).rpc("admin_update_company", { p_company_id: companyId, p_data: data });
  if (error || !result?.[0]) return { ok: false as const, message: "Não foi possível atualizar a empresa." };
  return { ok: true as const, company: result[0] };
}

export async function setEstablishmentStatus(establishmentId: string, status: "ACTIVE" | "INACTIVE") {
  const { error } = await (await createClient()).rpc("admin_set_establishment_status", { p_establishment_id: establishmentId, p_status: status });
  if (error) return { ok: false as const, message: "Não foi possível atualizar o estabelecimento." };
  return { ok: true as const };
}

export async function setCompanyStatus(companyId: string, status: 'ACTIVE' | 'INACTIVE') {
  const { error } = await (await createClient()).rpc('admin_set_company_status', { p_company_id: companyId, p_status: status });
  if (error) return { ok: false as const, message: 'Não foi possível atualizar o status da empresa.' };
  return { ok: true as const };
}

export type AdminCompanyPrice = {
  company_id: string; company_name: string; company_status: string; sku_id: string; product_id: string;
  product_name: string; brand: string | null; variant_name: string; sku_code: string; sale_unit: string;
  sku_status: string; product_status: string; minimum_quantity: number; price_id: string | null; amount_minor: number | null;
  currency_code: string | null; price_status: string | null; valid_from: string | null; valid_until: string | null;
};

export async function listAdminCompanyPrices(companyId: string) {
  const { data, error } = await (await createClient()).rpc('admin_list_company_prices', { p_company_id: companyId });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível carregar os preços.'), prices: [] as AdminCompanyPrice[] };
  return { ok: true as const, prices: (data ?? []) as AdminCompanyPrice[] };
}

export async function upsertAdminCompanyPrice(input: { companyId: string; skuId: string; amountMinor: number }) {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) return { ok: false as const, message: 'Informe um preço válido maior ou igual a zero.' };
  const { data, error } = await (await createClient()).rpc('admin_upsert_company_sku_price', {
    p_company_id: input.companyId, p_sku_id: input.skuId, p_amount_minor: input.amountMinor,
  });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível atualizar o preço.') };
  return { ok: true as const, price: data?.[0] as { price_id: string; amount_minor: number } };
}

export async function upsertAdminCompanyPrices(input: { companyIds: string[]; skuId: string; amountMinor: number }) {
  if (!input.companyIds.length || !Number.isInteger(input.amountMinor) || input.amountMinor < 0) return { ok: false as const, message: 'Informe empresas e um preço válido maior ou igual a zero.' };
  const { data, error } = await (await createClient()).rpc('admin_upsert_company_sku_prices', { p_company_ids: input.companyIds, p_sku_id: input.skuId, p_amount_minor: input.amountMinor });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível aplicar o preço às empresas.') };
  return { ok: true as const, count: Number(data ?? 0) };
}

export type AdminOrder = { id: string; order_number: number; company_id: string; company_name: string; establishment_name: string; created_at: string; status: string; total_minor: number; units: number; delivery_window: string };

export type CompanyOrderDetails = {
  id: string; orderNumber: number; companyId: string; companyName: string; establishmentName: string;
  customer?: { name: string | null; phone: string | null } | null;
  status: string; createdAt: string; confirmedWindow: Record<string, unknown> | null; requestedWindow: Record<string, unknown> | null;
  address: Record<string, unknown>; subtotalMinor: number; deliveryFeeMinor: number; totalMinor: number;
  customerNote: string | null;
  approximateSubtotalMinor: number | null; approximateTotalMinor: number | null; finalSubtotalMinor: number | null; finalTotalMinor: number | null; finalConfirmedAt: string | null;
  items: Array<{ id: string; skuId: string; skuCode: string | null; productName: string; brand: string | null; variantName: string; unit: string; quantity: number; unitPriceMinor: number; subtotalMinor: number; approximateUnitPriceMinor: number | null; approximateSubtotalMinor: number | null; finalUnitPriceMinor: number | null; finalSubtotalMinor: number | null }>;
  history: Array<{ fromStatus: string | null; toStatus: string; changedAt: string; reason: string | null }>;
};

export async function getCompanyOrderDetails(orderId: string) {
  const { data, error } = await (await createClient()).rpc('company_get_order_details', { p_order_id: orderId });
  if (error) {
    console.error('COMPANY_ORDER_DETAILS_FAILED', JSON.stringify({ code: error.code, message: error.message, orderId }));
    const message = error.message.includes('ORDER_NOT_FOUND') ? 'Pedido não encontrado.' : error.message.includes('FORBIDDEN') ? 'Você não tem acesso a este pedido.' : 'Não foi possível carregar os detalhes do pedido.';
    return { ok: false as const, message };
  }
  return { ok: true as const, order: data as unknown as CompanyOrderDetails };
}

export async function listAdminOrders(status?: string) {
  const { data, error } = await (await createClient()).rpc('admin_list_orders', { p_status: status || undefined });
  if (error) return { ok: false as const, message: 'Não foi possível carregar a fila de pedidos.', orders: [] as AdminOrder[] };
  return { ok: true as const, orders: (data ?? []) as AdminOrder[] };
}

export async function startOrderPicking(orderId: string) {
  const { error } = await (await createClient()).rpc('admin_start_order_picking', { p_order_id: orderId });
  if (error) return { ok: false as const, message: error.message.includes('INVALID_ORDER_TRANSITION') ? 'Este pedido não está mais aguardando separação.' : 'Não foi possível iniciar a separação.' };
  return { ok: true as const };
}

export async function listCompanyOrders(status?: string) {
  const { data, error } = await (await createClient()).rpc('company_list_orders', { p_status: status || undefined });
  if (error) return { ok: false as const, message: 'Não foi possível carregar a fila de pedidos.', orders: [] as AdminOrder[] };
  return { ok: true as const, orders: (data ?? []) as AdminOrder[] };
}

export type CompanyDriver = { id: string; full_name: string };

export async function listCompanyDrivers() {
  const { data, error } = await (await createClient()).rpc('company_list_drivers');
  if (error) return { ok: false as const, message: 'Não foi possível carregar os entregadores.', drivers: [] as CompanyDriver[] };
  return { ok: true as const, drivers: (data ?? []) as CompanyDriver[] };
}

export async function assignCompanyOrderDriver(orderId: string, driverProfileId: string) {
  const { error } = await (await createClient()).rpc('company_assign_order_driver', {
    p_order_id: orderId,
    p_driver_profile_id: driverProfileId,
  });
  if (error) {
    const message = error.message.includes('DRIVER_NOT_AVAILABLE')
      ? 'O entregador selecionado não está disponível.'
      : error.message.includes('DELIVERY_ALREADY_ASSIGNED')
        ? 'Este pedido já possui um entregador atribuído.'
        : 'Não foi possível atribuir o entregador.';
    return { ok: false as const, message };
  }
  return { ok: true as const };
}

export async function startCompanyOrderPicking(orderId: string) {
  const { error } = await (await createClient()).rpc('company_start_order_picking', { p_order_id: orderId });
  if (error) console.error('ORDER_PICKING_START_FAILED', JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint, orderId }));
  if (error) return { ok: false as const, message: error.message.includes('INVALID_ORDER_TRANSITION') ? 'Este pedido não está mais aguardando separação.' : 'Não foi possível iniciar a separação.' };
  return { ok: true as const };
}

export type FinalPriceInput = { skuId: string; unitPriceMinor: number };

export async function setOrderFinalPrices(orderId: string, items: FinalPriceInput[], reason?: string) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(orderId) || !Array.isArray(items) || items.length === 0 || items.some((item) => !uuid.test(item.skuId) || !Number.isInteger(item.unitPriceMinor) || item.unitPriceMinor < 0)) {
    return { ok: false as const, message: 'Informe um preÃ§o final vÃ¡lido para cada item.' };
  }
  const { error } = await (await createClient()).rpc('set_order_final_prices', {
    p_order_id: orderId,
    p_items: items.map((item) => ({ sku_id: item.skuId, unit_price_minor: item.unitPriceMinor })),
    p_reason: reason?.trim() || undefined,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (!error) return { ok: true as const };
  console.error('ORDER_FINAL_PRICES_FAILED', JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint, orderId }));
  const message = error.message.includes('FORBIDDEN')
    ? 'Seu perfil nÃ£o pode definir preÃ§os finais.'
    : error.message.includes('INVALID_ORDER_TRANSITION')
      ? 'Este pedido nÃ£o estÃ¡ mais aguardando anÃ¡lise.'
      : error.message.includes('INVALID_FINAL_PRICE')
        ? 'Confira os preÃ§os finais informados.'
        : 'NÃ£o foi possÃ­vel salvar os preÃ§os finais.';
  return { ok: false as const, message };
}

export type OrderNextStatus = 'PICKING' | 'READY_FOR_DISPATCH' | 'DISPATCHED' | 'DELIVERED' | 'RECEIPT_CONFIRMED';

export async function advanceOrderStatus(orderId: string, toStatus: OrderNextStatus) {
  const { error } = await (await createClient()).rpc('advance_order_status', { p_order_id: orderId, p_to_status: toStatus });
  if (error) {
    console.error('ORDER_STATUS_ADVANCE_FAILED', JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint, orderId, toStatus }));
    return { ok: false as const, message: error.message.includes('INVALID_ORDER_TRANSITION') ? 'Essa transição não está disponível para o seu perfil.' : 'Não foi possível atualizar o pedido.' };
  }
  return { ok: true as const };
}

type CompanyInput = {
  legalName: string; displayName: string; taxId: string; stateRegistration?: string;
  corporateEmail: string; corporatePhone?: string; fiscalAddressLine: string; fiscalAddressNumber: string;
  fiscalAddressComplement?: string; fiscalDistrict: string; fiscalCity: string; fiscalState: string;
  fiscalPostalCode: string; legalRepresentativeName: string; legalRepresentativeEmail: string;
  legalRepresentativePhone?: string; operationalContactName: string; operationalContactEmail: string;
  operationalContactPhone?: string; paymentTermsDays?: number; creditLimitMinor?: number;
};

export async function createCompany(input: CompanyInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_company", {
    p_company: {
      legal_name: input.legalName, display_name: input.displayName, tax_id: input.taxId,
      state_registration: input.stateRegistration, corporate_email: input.corporateEmail,
      corporate_phone: input.corporatePhone, fiscal_address_line: input.fiscalAddressLine,
      fiscal_address_number: input.fiscalAddressNumber, fiscal_address_complement: input.fiscalAddressComplement,
      fiscal_district: input.fiscalDistrict, fiscal_city: input.fiscalCity, fiscal_state: input.fiscalState,
      fiscal_postal_code: input.fiscalPostalCode, legal_representative_name: input.legalRepresentativeName,
      legal_representative_email: input.legalRepresentativeEmail, legal_representative_phone: input.legalRepresentativePhone,
      operational_contact_name: input.operationalContactName, operational_contact_email: input.operationalContactEmail,
      operational_contact_phone: input.operationalContactPhone, payment_terms_days: input.paymentTermsDays ?? 0,
      credit_limit_minor: input.creditLimitMinor ?? 0,
    },
  });
  if (error || !data?.[0]) return { ok: false as const, message: "Não foi possível cadastrar a empresa." };
  return { ok: true as const, company: data[0] };
}

export async function createEstablishment(input: {
  companyId: string; name: string; address: {
    label: string; addressLine: string; addressNumber: string; addressComplement?: string;
    district: string; city: string; state: string; postalCode: string;
  };
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_establishment", {
    p_company_id: input.companyId, p_name: input.name,
    p_address: { label: input.address.label, address_line: input.address.addressLine, address_number: input.address.addressNumber,
      address_complement: input.address.addressComplement, district: input.address.district, city: input.address.city,
      state: input.address.state, postal_code: input.address.postalCode },
  });
  if (error || !data?.[0]) return { ok: false as const, message: "Não foi possível cadastrar o estabelecimento." };
  return { ok: true as const, establishment: data[0] };
}

export type AdminCategory = { id: string; name: string; sort_order: number; status: string; created_at: string; updated_at: string };
export type AdminProduct = { id: string; category_id: string; category_name: string; name: string; brand: string | null; description: string | null; status: string; created_at: string; updated_at: string };
export type AdminVariant = { id: string; product_id: string; sku_code: string; name: string; attributes: Record<string, unknown>; sale_unit: string; minimum_quantity: number; status: string; created_at: string; updated_at: string };
export type AdminProductImage = { id: string; product_id: string | null; variant_id: string | null; storage_object_path: string; mime_type: string; byte_size: number; alt_text: string; sort_order: number; is_primary: boolean };

function catalogError(error: { message?: string } | null, fallback: string) {
  const message = error?.message ?? '';
  if (message.includes('FORBIDDEN')) return 'Você não tem permissão para gerenciar o catálogo.';
  if (message.includes('ALREADY_EXISTS') || message.includes('SKU_ALREADY_EXISTS')) return 'Já existe um cadastro com esses dados.';
  if (message.includes('CATEGORY_REASSIGN_CONFIRMATION_REQUIRED')) return 'Confirme a realocação dos produtos para Outros antes de continuar.';
  if (message.includes('OTHER_CATEGORY_REQUIRED')) return 'A categoria Outros é necessária para o catálogo.';
  if (message.includes('CATEGORY_NOT_AVAILABLE')) return 'A categoria selecionada está inativa.';
  if (message.includes('INVALID_IMAGE')) return 'Imagem inválida. Use JPEG, PNG ou WebP de até 5 MB e informe o texto alternativo.';
  return fallback;
}

export async function listAdminCategories(status?: 'ACTIVE' | 'INACTIVE') {
  const { data, error } = await (await createClient()).rpc('admin_list_categories', { p_status: status ?? undefined });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível carregar as categorias.'), categories: [] as AdminCategory[] };
  return { ok: true as const, categories: (data ?? []) as AdminCategory[] };
}

export async function createAdminCategory(input: { name: string; sortOrder?: number }) {
  const { data, error } = await (await createClient()).rpc('admin_create_category', { p_name: input.name, p_sort_order: input.sortOrder ?? 0 });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível criar a categoria.') };
  return { ok: true as const, category: data?.[0] as AdminCategory };
}

export async function updateAdminCategory(input: { id: string; name: string; sortOrder: number; status: 'ACTIVE' | 'INACTIVE'; confirmReassign?: boolean }) {
  const { error } = await (await createClient()).rpc('admin_update_category', { p_category_id: input.id, p_name: input.name, p_sort_order: input.sortOrder, p_status: input.status, p_confirm_reassign: input.confirmReassign ?? false });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível atualizar a categoria.') };
  return { ok: true as const };
}

export async function deleteAdminCategory(id: string, confirmReassign = false) {
  const { error } = await (await createClient()).rpc('admin_delete_category', { p_category_id: id, p_confirm_reassign: confirmReassign });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível excluir a categoria.') };
  return { ok: true as const };
}

export async function listAdminProducts(status?: 'ACTIVE' | 'INACTIVE') {
  const { data, error } = await (await createClient()).rpc('admin_list_products', { p_status: status ?? undefined });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível carregar os produtos.'), products: [] as AdminProduct[] };
  return { ok: true as const, products: (data ?? []) as AdminProduct[] };
}

export async function createAdminProduct(input: { categoryId: string; name: string; brand?: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
  const { data, error } = await (await createClient()).rpc('admin_create_product', { p_category_id: input.categoryId, p_name: input.name, p_brand: input.brand || undefined, p_description: input.description || undefined, p_status: input.status ?? 'ACTIVE' });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível criar o produto.') };
  return { ok: true as const, product: data?.[0] as AdminProduct };
}

export async function updateAdminProduct(input: { id: string; categoryId: string; name: string; brand?: string; description?: string; status: 'ACTIVE' | 'INACTIVE' }) {
  const { error } = await (await createClient()).rpc('admin_update_product', { p_product_id: input.id, p_category_id: input.categoryId, p_name: input.name, p_brand: input.brand || '', p_description: input.description || '', p_status: input.status });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível atualizar o produto.') };
  return { ok: true as const };
}

export async function listAdminVariants(productId: string) {
  const { data, error } = await (await createClient()).rpc('admin_list_variants', { p_product_id: productId });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível carregar as variantes.'), variants: [] as AdminVariant[] };
  return { ok: true as const, variants: (data ?? []) as AdminVariant[] };
}

export async function createAdminVariant(input: { productId: string; skuCode: string; name: string; saleUnit: string; minimumQuantity: number; status?: 'ACTIVE' | 'INACTIVE' }) {
  const { data, error } = await (await createClient()).rpc('admin_create_variant', { p_product_id: input.productId, p_sku_code: input.skuCode, p_name: input.name, p_sale_unit: input.saleUnit, p_minimum_quantity: input.minimumQuantity, p_status: input.status ?? 'ACTIVE', p_attributes: {} });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível criar a variante.') };
  return { ok: true as const, variant: data?.[0] as AdminVariant };
}

export async function updateAdminVariant(input: { id: string; skuCode: string; name: string; saleUnit: string; minimumQuantity: number; status: 'ACTIVE' | 'INACTIVE' }) {
  const { error } = await (await createClient()).rpc('admin_update_variant', { p_variant_id: input.id, p_sku_code: input.skuCode, p_name: input.name, p_sale_unit: input.saleUnit, p_minimum_quantity: input.minimumQuantity, p_status: input.status, p_attributes: {} });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível atualizar a variante.') };
  return { ok: true as const };
}

export async function listAdminProductImages(owner: { productId?: string; variantId?: string }) {
  const { data, error } = await (await createClient()).rpc('admin_list_product_images', { p_product_id: owner.productId ?? undefined, p_variant_id: owner.variantId ?? undefined });
  if (error) return { ok: false as const, message: catalogError(error, 'Não foi possível carregar as imagens.'), images: [] as AdminProductImage[] };
  return { ok: true as const, images: (data ?? []) as AdminProductImage[] };
}

export async function uploadAdminProductImage(input: { productId?: string; variantId?: string; altText: string; file: File; isPrimary?: boolean }) {
  const allowed = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
  const extension = allowed.get(input.file.type);
  if ((!input.productId && !input.variantId) || (input.productId && input.variantId) || !extension || input.file.size < 1 || input.file.size > 5 * 1024 * 1024 || !input.altText.trim()) {
    return { ok: false as const, message: 'Imagem inválida. Use JPEG, PNG ou WebP de até 5 MB e informe o texto alternativo.' };
  }
  const supabase = await createClient();
  const ownerId = input.productId ?? input.variantId!;
  const path = `products/${ownerId}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from('catalog-product-images').upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (upload.error) return { ok: false as const, message: 'Não foi possível armazenar a imagem.' };
  const { data, error } = await supabase.rpc('admin_create_product_image', { p_product_id: input.productId ?? null as unknown as string, p_variant_id: input.variantId ?? null as unknown as string, p_storage_object_path: path, p_mime_type: input.file.type, p_byte_size: input.file.size, p_alt_text: input.altText.trim(), p_is_primary: input.isPrimary ?? false, p_sort_order: 0 });
  if (error) { await supabase.storage.from('catalog-product-images').remove([path]); return { ok: false as const, message: catalogError(error, 'Não foi possível cadastrar a imagem.') }; }
  return { ok: true as const, image: data };
}

export async function getAdminImageUrl(path: string) {
  const { data, error } = await (await createClient()).storage.from('catalog-product-images').createSignedUrl(path, 3600);
  return error || !data?.signedUrl ? { ok: false as const, message: 'Não foi possível abrir a imagem.' } : { ok: true as const, url: data.signedUrl };
}
