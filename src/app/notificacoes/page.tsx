import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listOrderNotifications } from "@/modules/orders/order.actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

const labels: Record<string, string> = { CONFIRMED: "Pedido confirmado", PICKING: "Pedido em separação", READY_FOR_DISPATCH: "Pedido pronto para envio", DISPATCHED: "Pedido em rota", DELIVERED: "Pedido entregue", RECEIPT_CONFIRMED: "Recebimento confirmado", CANCELLED: "Pedido cancelado" };

export default async function NotificationsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/auth/login");
  if (current.profile.role !== "CUSTOMER") redirect("/acesso-negado?area=notificacoes");
  const result = await listOrderNotifications();
  return <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px" }}><Link href="/">← Voltar ao início</Link><header style={{ margin: "28px 0" }}><p style={{ opacity: .7 }}>ATUALIZAÇÕES</p><h1>Notificações</h1><p>Acompanhe as mudanças recentes dos seus pedidos.</p></header><Card>{!result.ok ? <p role="alert">{result.message}</p> : result.notifications.length === 0 ? <p>Nenhuma atualização encontrada.</p> : <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>{result.notifications.map(item => <li key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 20, padding: "16px 0", borderBottom: "1px solid var(--color-border, #ddd)" }}><div><strong>{labels[item.toStatus] ?? item.toStatus}</strong><p style={{ margin: "6px 0" }}>Pedido <Link href={`/pedidos/${item.orderId}`}>#{item.orderNumber}</Link>{item.reason ? ` · ${item.reason}` : ""}</p></div><div style={{ textAlign: "right" }}><Badge tone={item.toStatus === "CANCELLED" ? "error" : item.toStatus === "DELIVERED" || item.toStatus === "RECEIPT_CONFIRMED" ? "success" : "default"}>{new Date(item.changedAt).toLocaleString("pt-BR")}</Badge></div></li>)}</ul>}</Card></main>;
}
