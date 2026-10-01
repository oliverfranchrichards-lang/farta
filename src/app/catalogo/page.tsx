"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { CartItemControls } from "@/components/cart/CartItemControls";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCustomerContext, selectCustomerEstablishment } from "@/modules/customer/customer.actions";
import { addCatalogItem, getActiveCart, listCatalog, setCartItemQuantity, type ActiveCart, type CatalogListItem } from "@/modules/orders/order.actions";
import styles from "./catalogo.module.css";

const money = (value: number) => (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function fallbackImageUrl(product: CatalogListItem) {
  const name = product.name.toLowerCase();
  const imageId = name.includes("banana") ? "photo-1574226516831-e1dff420e8f8" : name.includes("tomate") ? "photo-1546094096-0df4bcaaa337" : name.includes("cebola") ? "photo-1518977956812-cd3dbadaaf31" : name.includes("batata") ? "photo-1518977676601-b53f82aba655" : name.includes("alface") ? "photo-1622205313162-be1d5712a43c" : name.includes("limão") ? "photo-1590502593747-42a996133562" : name.includes("maçã") ? "photo-1560806887-1e4cd0b6cbd6" : name.includes("leite") ? "photo-1550583724-b2692b85b150" : name.includes("queijo") || name.includes("requeijão") ? "photo-1452195100486-9cc805987862" : name.includes("iogurte") || name.includes("creme de leite") || name.includes("leite condensado") ? "photo-1488477181946-6428a0291777" : name.includes("pão") || name.includes("torrada") ? "photo-1509440159596-0249088772ff" : name.includes("croissant") || name.includes("bolo") ? "photo-1555507036-ab1c0f9f3c4f" : name.includes("café") ? "photo-1495474472287-4d71bcdd2085" : name.includes("refrigerante") ? "photo-1554866585-cd94860890b7" : name.includes("suco") || name.includes("chá") ? "photo-1600271886742-f049cd451bba" : name.includes("detergente") || name.includes("sabão") || name.includes("limpador") || name.includes("água sanitária") ? "photo-1583947215259-38e31be8751f" : name.includes("papel higiênico") || name.includes("papel toalha") ? "photo-1584622650111-993a426fbf0a" : name.includes("copo") || name.includes("prato") || name.includes("guardanapo") || name.includes("saco") || name.includes("alumínio") ? "photo-1604594849809-dfedbc827105" : name.includes("pizza") ? "photo-1574071318508-1cdbab80d002" : name.includes("batata palito") ? "photo-1573080496219-bb080dd4f877" : name.includes("nuggets") ? "photo-1562967914-608f82629710" : name.includes("açaí") ? "photo-1577805947697-89e18249d767" : name.includes("água") ? "photo-1564419320461-6870880221ad" : "photo-1542838132-92c53300491e";
  return `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=640&q=80`;
}

const semanticImages: Record<string, string> = {
  banana: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Cavendish_banana_from_Maracaibo.jpg/960px-Cavendish_banana_from_Maracaibo.jpg",
  tomato: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/960px-Tomato_je.jpg",
  onion: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Harvested_vegetables%28Onions%29.jpg/960px-Harvested_vegetables%28Onions%29.jpg",
  potato: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/HK_WC_%E7%81%A3%E4%BB%94%E9%81%93_Road_market_shop_vegetable_potato_night_October_2023_R12S.jpg/960px-HK_WC_%E7%81%A3%E4%BB%94%E9%81%93_Road_market_shop_vegetable_potato_night_October_2023_R12S.jpg",
  lettuce: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Lactuca_sativa_%27Ashbrook%27.jpg/960px-Lactuca_sativa_%27Ashbrook%27.jpg",
  lemon: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Lemon.jpg/960px-Lemon.jpg",
  apple: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/960px-Red_Apple.jpg",
  milk: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/The_Milk_Carton_Kids_at_9-30_Club_in_Washington_DC_August_2012.jpg/960px-The_Milk_Carton_Kids_at_9-30_Club_in_Washington_DC_August_2012.jpg",
  cheese: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Cheese_roll_at_The_Original_Tea_Hut_at_High_Beach%2C_Essex%2C_England.jpg/960px-Cheese_roll_at_The_Original_Tea_Hut_at_High_Beach%2C_Essex%2C_England.jpg",
  yogurt: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/%E0%A6%AC%E0%A6%97%E0%A7%81%E0%A6%A1%E0%A6%BC%E0%A6%BE%E0%A6%B0_%E0%A6%A6%E0%A6%87.jpg/960px-%E0%A6%AC%E0%A6%97%E0%A7%81%E0%A6%A1%E0%A6%BC%E0%A6%BE%E0%A6%B0_%E0%A6%A6%E0%A6%87.jpg",
  bread: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Bread_loaf.jpg/960px-Bread_loaf.jpg",
  pastry: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Pain_au_chocolat_Luc_Viatour.jpg/960px-Pain_au_chocolat_Luc_Viatour.jpg",
  coffee: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Roasted_coffee_beans.jpg/960px-Roasted_coffee_beans.jpg",
  soda: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/15-09-26-RalfR-WLC-0098_-_Coca-Cola_glass_bottle_%28Germany%29.jpg/960px-15-09-26-RalfR-WLC-0098_-_Coca-Cola_glass_bottle_%28Germany%29.jpg",
  juice: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/Orange_juice_1_edit1.jpg/960px-Orange_juice_1_edit1.jpg",
  cleaning: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Afwasmiddel_Una_Aldi.JPG/960px-Afwasmiddel_Una_Aldi.JPG",
  paper: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Toilet_paper_advertising.jpg/960px-Toilet_paper_advertising.jpg",
  disposable: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/A_crow_with_a_plastic_cup_in_its_beak%2C_Lodhi_Gardens%2C_Delhi.jpg/960px-A_crow_with_a_plastic_cup_in_its_beak%2C_Lodhi_Gardens%2C_Delhi.jpg",
  frozen: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Vegetarian_Pizza.jpg/960px-Vegetarian_Pizza.jpg",
};

function semanticImageUrl(product: CatalogListItem) {
  const name = product.name.toLowerCase();
  const key = name.includes("banana") ? "banana" : name.includes("tomate") ? "tomato" : name.includes("cebola") ? "onion" : name.includes("batata") ? "potato" : name.includes("alface") ? "lettuce" : name.includes("limão") ? "lemon" : name.includes("maçã") ? "apple" : name.includes("leite") ? "milk" : name.includes("queijo") || name.includes("requeijão") ? "cheese" : name.includes("iogurte") || name.includes("creme de leite") || name.includes("leite condensado") ? "yogurt" : name.includes("pão") || name.includes("torrada") ? "bread" : name.includes("croissant") || name.includes("bolo") ? "pastry" : name.includes("café") ? "coffee" : name.includes("refrigerante") ? "soda" : name.includes("suco") || name.includes("chá") ? "juice" : name.includes("detergente") || name.includes("sabão") || name.includes("limpador") || name.includes("água sanitária") ? "cleaning" : name.includes("papel") ? "paper" : name.includes("copo") || name.includes("prato") || name.includes("guardanapo") || name.includes("saco") || name.includes("alumínio") ? "disposable" : "frozen";
  return `${semanticImages[key]}?utm_source=commons.wikimedia.org&utm_campaign=farta-mvp`;
}

export default function Catalogo() {
  const [products, setProducts] = useState<CatalogListItem[]>([]);
  const [cart, setCart] = useState<ActiveCart | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [sortAscending, setSortAscending] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [establishments, setEstablishments] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [busySkus, setBusySkus] = useState<string[]>([]);
  const [itemError, setItemError] = useState<{ skuId: string; quantity: number; message: string } | null>(null);
  const [undo, setUndo] = useState<{ skuId: string; name: string; quantity: number } | null>(null);
  const busyRef = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    Promise.all([getCustomerContext(), listCatalog(), getActiveCart()]).then(([context, catalog, currentCart]) => {
      if (!active) return;
      if (context.ok) { setEstablishments(context.establishments); setSelectedId(context.selected?.id ?? ""); } else setNotice(context.message);
      if (catalog.ok) setProducts(catalog.products); else setNotice(catalog.message);
      if (currentCart.ok) setCart(currentCart.cart); else setNotice(currentCart.message);
      setLoading(false);
    }).catch(() => { if (active) { setNotice("Não foi possível carregar o catálogo. Tente novamente."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(products.map(product => product.category)))], [products]);
  const visible = useMemo(() => products.filter(product => category === "Todos" || product.category === category).filter(product => `${product.name} ${product.brand} ${product.detail}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sortAscending ? a.priceMinor - b.priceMinor : b.priceMinor - a.priceMinor), [category, products, query, sortAscending]);

  async function reloadCart() {
    const result = await getActiveCart();
    if (result.ok) setCart(result.cart); else setNotice(result.message);
  }

  async function changeEstablishment(id: string) {
    if (!id || id === selectedId || busy || busySkus.length > 0) return;
    setCart(null); setItemError(null); setUndo(null); setNotice("Atualizando estabelecimento…"); setBusy(true);
    try { const result = await selectCustomerEstablishment(id); if (result.ok) { setSelectedId(id); await reloadCart(); setNotice("Estabelecimento atualizado."); } else setNotice(result.message); }
    catch { setNotice("Não foi possível atualizar o estabelecimento. Tente novamente."); }
    finally { setBusy(false); }
  }

  async function add(skuId: string) {
    if (busy || busyRef.current.has(skuId)) return;
    busyRef.current.add(skuId); setBusySkus([...busyRef.current]); setItemError(null);
    const result = await addCatalogItem(skuId);
    if (result.ok) { await reloadCart(); setNotice("Produto adicionado ao carrinho compartilhado."); } else setNotice(result.message);
    busyRef.current.delete(skuId); setBusySkus([...busyRef.current]);
  }

  async function changeQuantity(skuId: string, quantity: number) {
    if (!cart || busy || busyRef.current.has(skuId)) return;
    busyRef.current.add(skuId); setBusySkus([...busyRef.current]); setItemError(null); setNotice(""); setUndo(null);
    const removed = quantity === 0 ? cart.items.find(item => item.skuId === skuId) : undefined;
    const result = await setCartItemQuantity({ cartId: cart.id, skuId, quantity });
    if (result.ok) { await reloadCart(); if (removed) setUndo({ skuId, name: removed.name, quantity: removed.quantity }); } else setItemError({ skuId, quantity, message: result.message });
    busyRef.current.delete(skuId); setBusySkus([...busyRef.current]);
  }

  async function undoRemoval() {
    if (!undo || busy || busyRef.current.has(undo.skuId)) return;
    const item = undo; setUndo(null); busyRef.current.add(item.skuId); setBusySkus([...busyRef.current]);
    const result = await addCatalogItem(item.skuId, item.quantity);
    if (result.ok) await reloadCart(); else setNotice(result.message);
    busyRef.current.delete(item.skuId); setBusySkus([...busyRef.current]);
  }

  return <main className={styles.page} aria-busy={busy || loading}><div className={styles.content}>
    <div className={styles.contextBar}><label htmlFor="catalog-establishment">Estabelecimento</label><select id="catalog-establishment" value={selectedId} disabled={busy || loading || busySkus.length > 0} onChange={event => void changeEstablishment(event.target.value)}><option value="">Selecione</option>{establishments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{busy && <span role="status" aria-live="polite">Atualizando estabelecimento…</span>}</div>
    <PageHeader eyebrow="COMPRAR" title="Catálogo de produtos" description="Encontre itens para reposição, compare disponibilidade e monte seu pedido de forma rápida e eficiente." />
    <section className={styles.search} aria-label="Busca e filtros"><Input id="catalog-search" label="Buscar produto, marca, categoria ou embalagem" value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Buscar produto, marca, categoria ou embalagem" className={styles.searchInputControl} /><Button type="button" onClick={() => setNotice(query ? `Resultados para “${query}”.` : "Informe o que deseja buscar.")}>Buscar</Button><Button type="button" variant="secondary" onClick={() => { setQuery(""); setCategory("Todos"); }}>Limpar filtros</Button></section>
    {notice && <div className={styles.notice} role="status" aria-live="polite">{notice}<Button type="button" variant="tertiary" onClick={() => setNotice("")} aria-label="Fechar aviso">×</Button></div>}
    {undo && <div className={styles.undoNotice} role="status">{undo.name} removido do carrinho. <Button type="button" variant="tertiary" onClick={() => void undoRemoval()}>Desfazer</Button></div>}
    <div className={styles.chips} role="group" aria-label="Categorias">{categories.map(item => <Button type="button" variant="tertiary" aria-pressed={category === item} className={category === item ? styles.selected : ""} key={item} onClick={() => setCategory(item)}>{item}</Button>)}</div>
    <div className={styles.filters}><Button type="button" variant="tertiary" className={styles.sort} onClick={() => setSortAscending(current => !current)} aria-pressed={sortAscending}>Ordenar: {sortAscending ? "menor preço" : "maior preço"}</Button></div>
    <section className={styles.workspace}><div className={styles.productGrid}>{loading ? <p role="status">Carregando catálogo…</p> : visible.length === 0 ? <p role="status">Nenhum produto encontrado. Tente limpar os filtros.</p> : visible.map(product => { const imageUrl = product.imageUrl ?? semanticImageUrl(product); return <Card className={styles.product} key={product.skuId}><Badge tone="success">Disponível</Badge><div className={styles.productImage}><Image src={imageUrl} alt={product.imageAlt ?? product.name} width={640} height={480} /></div><small>{product.brand} / {product.detail}</small><h2>{product.name}</h2><strong>{money(product.priceMinor)}</strong><p>Preço por {product.detail}</p><Button type="button" variant="secondary" disabled={busy || busySkus.includes(product.skuId)} onClick={() => void add(product.skuId)}>{busySkus.includes(product.skuId) ? "Adicionando…" : "Adicionar"}</Button></Card>; })}</div>
      <Card className={styles.summary} aria-label="Resumo do pedido"><div><h2>Pedido em criação</h2><span aria-live="polite">{cart?.units ?? 0} itens</span></div><p>Carrinho compartilhado por estabelecimento</p>{!cart?.items.length ? <p role="status">Seu carrinho está vazio.</p> : cart.items.map(item => <div className={styles.line} key={item.id}><div className={styles.lineInfo}><strong>{item.name}</strong><span>{money(item.subtotalMinor)}</span></div><CartItemControls name={item.name} quantity={item.quantity} pending={busySkus.includes(item.skuId)} disabled={busy} onChange={quantity => void changeQuantity(item.skuId, quantity)} onRemove={() => void changeQuantity(item.skuId, 0)} />{itemError?.skuId === item.skuId && <p className={styles.itemError} role="alert">{itemError.message} <Button type="button" variant="tertiary" onClick={() => void changeQuantity(item.skuId, itemError.quantity)}>Tentar novamente</Button></p>}</div>)}<footer><p>Subtotal</p><strong aria-live="polite">{money(cart?.totalMinor ?? 0)}</strong><Link href="/pedido">Ver pedido →</Link></footer></Card>
    </section>
  </div></main>;
}
