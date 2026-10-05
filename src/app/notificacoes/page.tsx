import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listOrderNotifications } from "@/modules/orders/order.actions";
import styles from "./notificacoes.module.css";

const labels: Record<string, string> = {
  CONFIRMED: "Pedido confirmado",
  PICKING: "Pedido em separação",
  READY_FOR_DISPATCH: "Pedido pronto para envio",
  DISPATCHED: "Pedido em rota",
  DELIVERED: "Pedido entregue",
  RECEIPT_CONFIRMED: "Recebimento confirmado",
  CANCELLED: "Pedido cancelado",
};

function notificationTone(status: string) {
  if (status === "CANCELLED") return "error" as const;
  if (status === "DELIVERED" || status === "RECEIPT_CONFIRMED") return "success" as const;
  if (status === "PICKING") return "warning" as const;
  if (status === "READY_FOR_DISPATCH" || status === "DISPATCHED") return "info" as const;
  return "default" as const;
}

export default async function NotificationsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/auth/login");
  if (current.profile.role !== "CUSTOMER") redirect("/acesso-negado?area=notificacoes");

  const result = await listOrderNotifications();

  return <main className={styles.page}>
    <section className={styles.content}>
      <Link className={styles.backLink} href="/">← Voltar ao início</Link>
      <PageHeader eyebrow="ATUALIZAÇÕES" title="Notificações" description="Acompanhe as mudanças recentes dos seus pedidos." />
      <Card className={styles.panel}>
        {!result.ok ? <div className={styles.error} role="alert"><strong>Não foi possível carregar as notificações.</strong><p>{result.message}</p></div> : result.notifications.length === 0 ? <div className={styles.empty} role="status"><strong>Nenhuma atualização encontrada</strong><p>As mudanças dos seus pedidos aparecerão aqui.</p><Link className={styles.emptyAction} href="/pedidos">Ver meus pedidos</Link></div> : <ul className={styles.list}>
          {result.notifications.map((item) => <li className={styles.item} key={item.id}>
            <div className={styles.itemCopy}>
              <strong>{labels[item.toStatus] ?? item.toStatus}</strong>
              <p>Pedido <Link href={`/pedidos/${item.orderId}`}>#{item.orderNumber}</Link>{item.reason ? ` · ${item.reason}` : ""}</p>
            </div>
            <Badge tone={notificationTone(item.toStatus)}><time dateTime={item.changedAt}>{new Date(item.changedAt).toLocaleString("pt-BR")}</time></Badge>
          </li>)}
        </ul>}
      </Card>
    </section>
  </main>;
}
