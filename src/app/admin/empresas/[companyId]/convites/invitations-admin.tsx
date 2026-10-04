'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import styles from '../../../admin.module.css';

type Invitation = { invitation_id: string; invited_email: string; status: string; expires_at: string; created_at: string };
const statusLabel: Record<string, string> = { PENDING: 'Pendente', ACCEPTED: 'Aceito', EXPIRED: 'Expirado', REVOKED: 'Revogado' };

export function InvitationsAdmin({ initialInvitations }: { initialInvitations: Invitation[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const filtered = useMemo(() => initialInvitations.filter((item) => (!query.trim() || item.invited_email.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))) && (!status || item.status === status)), [initialInvitations, query, status]);
  const statuses = Array.from(new Set(initialInvitations.map((item) => item.status)));
  return <>
    <div className={styles.filterBar} role="search" aria-label="Filtrar convites">
      <label className={styles.filterField} htmlFor="invitation-search">Buscar convite<input id="invitation-search" type="search" placeholder="E-mail convidado" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className={styles.filterField} htmlFor="invitation-status">Status<select id="invitation-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel[value] ?? value}</option>)}</select></label>
      <button className={styles.clearFilter} type="button" onClick={() => { setQuery(''); setStatus(''); }} disabled={!query && !status}>Limpar filtros</button>
    </div>
    <p className={styles.filterSummary} role="status">Exibindo {filtered.length} de {initialInvitations.length} convites</p>
    {filtered.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhum convite corresponde aos filtros.</p></Card> : <div className={styles.grid}>{filtered.map(item => <Card key={item.invitation_id} className={styles.card}><div className={styles.companyCardHeader}><span className={styles.iconTile} aria-hidden="true">✉</span><span className={styles.overline}>Acesso à empresa</span></div><h2>{item.invited_email}</h2><p>Status: <strong className={`${styles.status} ${item.status === 'ACCEPTED' ? styles.active : item.status === 'PENDING' ? styles.pending : styles.inactive}`}>{statusLabel[item.status] ?? item.status}</strong></p><p>Expira em: {new Date(item.expires_at).toLocaleDateString('pt-BR')}</p></Card>)}</div>}
  </>;
}
