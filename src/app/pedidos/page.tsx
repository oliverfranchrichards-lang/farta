"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { listOrders, type OrderListItem } from "@/modules/orders/order.actions";
import { CancelOrderAction } from "./[orderId]/cancel-action";
import styles from "./pedidos.module.css";

type OrderStatus = "Aguardando análise" | "Aguardando sua confirmação" | "Confirmado" | "Em separação" | "Pronto para envio" | "Em rota" | "Entregue" | "Recebido" | "Cancelado";
type Order = OrderListItem & { statusLabel: OrderStatus };

const statuses: Array<"Todos" | OrderStatus> = ["Todos", "Aguardando análise", "Aguardando sua confirmação", "Confirmado", "Em separação", "Pronto para envio", "Em rota", "Entregue", "Recebido", "Cancelado"];
const labels: Record<string, OrderStatus> = { SUBMITTED_FOR_REVIEW: "Aguardando análise", PRICED_AWAITING_CUSTOMER_CONFIRMATION: "Aguardando sua confirmação", CUSTOMER_CONFIRMED: "Confirmado", CONFIRMED: "Confirmado", PICKING: "Em separação", READY_FOR_DISPATCH: "Pronto para envio", DISPATCHED: "Em rota", DELIVERED: "Entregue", RECEIPT_CONFIRMED: "Recebido", CANCELLED: "Cancelado" };
const statusLabel = (status: string): OrderStatus => labels[status] ?? "Confirmado";
const statusTone = (status: OrderStatus) => status === "Entregue" || status === "Recebido" || status === "Confirmado" ? "success" as const : status === "Cancelado" ? "error" as const : status === "Em separação" || status === "Aguardando sua confirmação" ? "warning" as const : status === "Pronto para envio" || status === "Em rota" ? "info" as const : "default" as const;
const money = (minor: number) => (minor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"Todos" | OrderStatus>("Todos");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await listOrders();
      if (!active) return;
      setLoading(false);
      if (!result.ok) { setNotice(result.message); return; }
      const next = result.orders.map(order => ({ ...order, statusLabel: statusLabel(order.status) }));
      setOrders(current => {
        if (initialized.current && current.length > 0) {
          const changed = next.find(item => current.find(previous => previous.id === item.id)?.status !== item.status);
          if (changed) setNotice(`O pedido #${changed.orderNumber} foi atualizado para ${changed.statusLabel}.`);
        }
        return next;
      });
      initialized.current = true;
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const visibleOrders = useMemo(() => orders.filter(order => (filter === "Todos" || order.statusLabel === filter) && String(order.orderNumber).includes(query.trim())), [filter, orders, query]);
  const totalMinor = orders.reduce((sum, order) => sum + order.totalMinor, 0);
  const inProgress = orders.filter(order => !["DELIVERED", "RECEIPT_CONFIRMED", "CANCELLED"].includes(order.status)).length;

  return <main className={styles.page}><section className={styles.content}>
    <div className={styles.titleRow}><div><p className={styles.eyebrow}>OPERAÇÃO</p><h1>Meus pedidos</h1><p>Acompanhe separação, entrega e histórico das suas compras.</p></div><Link href="/pedido" className={styles.newOrder}>+ Criar pedido</Link></div>
    <section className={styles.summary} aria-label="Resumo dos pedidos"><Card><span className={styles.count}>{orders.length}</span><p>Pedidos no período</p></Card><Card><span className={styles.count}>{inProgress}</span><p>Pedidos em andamento</p></Card><Card><span className={styles.warning}>{orders.filter(order => order.status === "DELIVERED").length}</span><p>Aguardando recebimento</p></Card><Card><span className={styles.value}>{money(totalMinor)}</span><p>Total em pedidos</p></Card></section>
    <Card className={styles.panel}>
      <div className={styles.toolbar}><Input id="orders-search" label="Buscar pedidos" placeholder="Buscar por número do pedido" value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} className={styles.searchInput} /><div className={styles.filters} role="group" aria-label="Filtrar pedidos">{statuses.map(item => <Button key={item} type="button" variant="tertiary" aria-pressed={filter === item} className={filter === item ? styles.selected : ""} onClick={() => setFilter(item)}>{item}</Button>)}</div></div>
      {notice && <div className={styles.notice} role="status" aria-live="polite">{notice}<Button type="button" variant="tertiary" onClick={() => setNotice("")} aria-label="Fechar aviso">×</Button></div>}
      {loading ? <div className={styles.empty} role="status">Carregando pedidos…</div> : <>
        <div className={styles.tableWrap}><table><caption className={styles.visuallyHidden}>Lista de pedidos</caption><thead><tr><th scope="col">Pedido</th><th scope="col">Data</th><th scope="col">Itens</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Previsão</th><th scope="col"><span className={styles.visuallyHidden}>Ações</span></th></tr></thead><tbody>{visibleOrders.map(order => <tr key={order.id}><td><strong>#{order.orderNumber}</strong><small>Pedido da empresa</small></td><td>{new Date(order.createdAt).toLocaleString("pt-BR")}</td><td>{order.units} unidades</td><td><b>{money(order.totalMinor)}</b></td><td><Badge tone={statusTone(order.statusLabel)}>{order.statusLabel}</Badge></td><td>{order.delivery}</td><td><Link className={styles.details} href={`/pedidos/${order.id}`}>Ver detalhes</Link>{(order.status === "CONFIRMED" || order.status === "CUSTOMER_CONFIRMED") && <CancelOrderAction orderId={order.id} />}</td></tr>)}</tbody></table></div>
        <div className={styles.mobileList} aria-label="Pedidos em formato de lista">{visibleOrders.map(order => <Card className={styles.mobileOrder} key={order.id}><div><strong>#{order.orderNumber}</strong><Badge tone={statusTone(order.statusLabel)}>{order.statusLabel}</Badge></div><p>{new Date(order.createdAt).toLocaleDateString("pt-BR")} · {order.units} unidades</p><p>{order.delivery}</p><strong>{money(order.totalMinor)}</strong><Link className={styles.details} href={`/pedidos/${order.id}`}>Ver detalhes</Link>{(order.status === "CONFIRMED" || order.status === "CUSTOMER_CONFIRMED") && <CancelOrderAction orderId={order.id} />}</Card>)}</div>
        {visibleOrders.length === 0 && <div className={styles.empty} role="status"><strong>Nenhum pedido encontrado</strong><p>Tente outro número ou remova os filtros aplicados.</p><Button type="button" variant="secondary" onClick={() => { setQuery(""); setFilter("Todos"); }}>Limpar filtros</Button></div>}
      </>}
    </Card>
  </section></main>;
}
