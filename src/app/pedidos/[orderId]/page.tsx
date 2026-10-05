import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOrderDetails } from "@/modules/orders/order.actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ReceiptAction } from "./receipt-action";
import { CancelOrderAction } from "./cancel-action";
import { FinalPriceAction } from "./final-price-action";
import styles from "./order-detail.module.css";

const labels: Record<string, string> = {
  SUBMITTED_FOR_REVIEW: "Aguardando análise",
  PRICED_AWAITING_CUSTOMER_CONFIRMATION: "Aguardando sua confirmação",
  CUSTOMER_CONFIRMED: "Confirmado",
  CONFIRMED: "Confirmado",
  PICKING: "Em separação",
  READY_FOR_DISPATCH: "Pronto para envio",
  DISPATCHED: "Em rota",
  DELIVERED: "Entregue",
  RECEIPT_CONFIRMED: "Recebido",
  CANCELLED: "Cancelado",
};

const money = (minor: number) => (minor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function historyTone(status: string) {
  if (status === "DELIVERED" || status === "RECEIPT_CONFIRMED") return styles.historySuccess;
  if (status === "DISPATCHED" || status === "READY_FOR_DISPATCH") return styles.historyInfo;
  if (status === "PICKING" || status === "PRICED_AWAITING_CUSTOMER_CONFIRMATION") return styles.historyWarning;
  if (status === "CANCELLED") return styles.historyDanger;
  return "";
}

export default async function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const current = await getCurrentUser();
  if (!current) redirect("/auth/login");
  if (current.profile.role !== "CUSTOMER") redirect("/acesso-negado?area=pedidos");
  const { orderId } = await params;
  const result = await getOrderDetails(orderId);
  if (!result.ok) notFound();
  const { order } = result;
  const tone = order.status === "CANCELLED" ? "error" : order.status === "DELIVERED" || order.status === "RECEIPT_CONFIRMED" || order.status === "CUSTOMER_CONFIRMED" ? "success" : order.status === "PICKING" || order.status === "PRICED_AWAITING_CUSTOMER_CONFIRMATION" ? "warning" : order.status === "DISPATCHED" || order.status === "READY_FOR_DISPATCH" ? "info" : "default";

  return <main className={styles.page}>
    <Link className={styles.backLink} href="/pedidos">← Voltar para meus pedidos</Link>
    <PageHeader eyebrow="PEDIDO" title={`#${order.orderNumber}`} description={`${new Date(order.createdAt).toLocaleString("pt-BR")} · ${order.delivery}`} actions={<Badge tone={tone}>{labels[order.status] ?? order.status}</Badge>} />
    <div className={styles.grid}>
      <Card className={styles.summary}>
        <h2>Resumo do pedido</h2>
        <dl><div><dt>Observações</dt><dd className={styles.customerNote}>{order.customerNote || 'Nenhuma observação informada'}</dd></div><div><dt>Entrega</dt><dd>{order.delivery}</dd></div><div><dt>Endereço</dt><dd>{order.address}</dd></div></dl>
        <div className={styles.total}><span>{order.status === "PRICED_AWAITING_CUSTOMER_CONFIRMATION" ? "Total final" : "Total"}</span><strong>{money(order.totalMinor)}</strong></div>
        {order.approximateTotalMinor !== null && order.finalTotalMinor === null && <p className={styles.priceHint}>Este é um total aproximado. O valor final será definido pela operação antes da confirmação.</p>}
        {order.status === "PRICED_AWAITING_CUSTOMER_CONFIRMATION" && <FinalPriceAction orderId={order.id} />}
        {order.status === "DELIVERED" && <ReceiptAction orderId={order.id} />}
        {(order.status === "CONFIRMED" || order.status === "CUSTOMER_CONFIRMED") && <CancelOrderAction orderId={order.id} />}
        {order.status === "PICKING" && <p className={styles.helper}>Este pedido já entrou em separação e não pode ser cancelado.</p>}
      </Card>
      <Card className={styles.items}>
        <h2>Itens do pedido</h2>
        <div>{order.items.map(item => <div className={styles.item} key={item.id}><span><strong>{item.name}</strong><small>{item.quantity} × {item.unit} · {money(item.unitPriceMinor)}</small></span><strong>{money(item.subtotalMinor)}</strong></div>)}</div>
      </Card>
      <Card className={styles.history}>
        <h2>Histórico</h2>
        <ol>{order.history.map((entry, index) => <li className={historyTone(entry.toStatus)} key={`${entry.changedAt}-${index}`}><strong>{labels[entry.toStatus] ?? entry.toStatus}</strong><small>{new Date(entry.changedAt).toLocaleString("pt-BR")}</small>{entry.reason && <small>{entry.reason}</small>}</li>)}</ol>
      </Card>
    </div>
  </main>;
}
