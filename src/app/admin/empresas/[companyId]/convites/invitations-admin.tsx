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
      <label className={styles.filterField} htmlFor="invitation-search">Buscar convite<input id="invitation-search" type="search" placeholder="Buscar convite..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className={styles.filterField} htmlFor="invitation-status">Status<select id="invitation-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos os convites</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel[value] ?? value}</option>)}</select></label>
      <button className={styles.clearFilter} type="button" onClick={() => { setQuery(''); setStatus(''); }} disabled={!query && !status}>Limpar filtros</button>
    </div>
    <p className={styles.filterSummary} role="status">Mostrando {filtered.length} de {initialInvitations.length} convites</p>
    {filtered.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhum convite corresponde aos filtros.</p></Card> : <div className={styles.companyTableCard}><table className={styles.companyTable}><caption className={styles.visuallyHidden}>Convites enviados</caption><thead><tr><th scope="col">Convite</th><th scope="col">Status</th><th scope="col">Enviado em</th><th scope="col">Expira em</th></tr></thead><tbody>{filtered.map(item => <tr key={item.invitation_id}><td><strong>{item.invited_email}</strong></td><td><span className={`${styles.status} ${item.status === 'ACCEPTED' ? styles.active : item.status === 'PENDING' ? styles.pending : styles.inactive}`}>{statusLabel[item.status] ?? item.status}</span></td><td>{new Date(item.created_at).toLocaleDateString('pt-BR')}</td><td>{new Date(item.expires_at).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table></div>}
  </>;
}
