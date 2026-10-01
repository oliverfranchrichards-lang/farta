import Link from "next/link";
import { requirePlatformAdmin } from "@/modules/admin/admin.context";
import { InviteForm } from "./invite-form";
import { listCompanyInvitations } from "@/modules/admin/admin.actions";
import { Card } from "@/components/ui/Card";
import styles from "../../../admin.module.css";

export default async function InvitationsPage({ params }: { params: Promise<{ companyId: string }> }) {
  await requirePlatformAdmin();
  const { companyId } = await params;
  const invitations = await listCompanyInvitations(companyId);
  const items = invitations.ok ? invitations.invitations : [];
  return <main className={styles.page}><div className={styles.breadcrumb}><Link href={`/admin/empresas/${companyId}/estabelecimentos`}>Administração</Link> <span aria-hidden="true">›</span> Convites</div><header className={styles.header}><div><h1>Convites</h1><p>Envie convites para pessoas acessarem esta empresa.</p></div></header><InviteForm companyId={companyId} /><div className={styles.summaryHeader}><h2>Convites enviados <span className={styles.count}>{items.length}</span></h2></div>{!invitations.ok ? <div className={styles.feedback} role="alert">Não foi possível carregar os convites.</div> : items.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhum convite enviado.</p></Card> : <div className={styles.grid}>{items.map(item => <Card key={item.invitation_id} className={styles.card}><span className={styles.overline}>Acesso à empresa</span><h2>{item.invited_email}</h2><p>Status: <strong>{item.status}</strong></p><p>Expira em: {new Date(item.expires_at).toLocaleDateString("pt-BR")}</p></Card>)}</div>}</main>;
}
