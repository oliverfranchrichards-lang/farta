'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { EstablishmentStatus } from './establishment-status';
import styles from '../../../admin.module.css';

type Establishment = { id: string; name: string; address_label: string | null; city: string | null; state: string | null; status: string };

export function EstablishmentsAdmin({ initialEstablishments }: { initialEstablishments: Establishment[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return initialEstablishments.filter((item) => {
      const text = [item.name, item.address_label ?? '', item.city ?? '', item.state ?? ''].join(' ').toLocaleLowerCase('pt-BR');
      return (!normalized || text.includes(normalized)) && (!status || item.status === status);
    });
  }, [initialEstablishments, query, status]);
  return <>
    <div className={styles.filterBar} role="search" aria-label="Filtrar estabelecimentos">
      <label className={styles.filterField} htmlFor="establishment-search">Buscar estabelecimento<input id="establishment-search" type="search" placeholder="Buscar estabelecimento..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className={styles.filterField} htmlFor="establishment-status">Status<select id="establishment-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todas as empresas</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select></label>
      <button className={styles.clearFilter} type="button" onClick={() => { setQuery(''); setStatus(''); }} disabled={!query && !status}>Limpar filtros</button>
    </div>
    <p className={styles.filterSummary} role="status">Mostrando {filtered.length} de {initialEstablishments.length} estabelecimentos</p>
    {filtered.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhum estabelecimento corresponde aos filtros.</p></Card> : <div className={styles.companyTableCard}><table className={styles.companyTable}><caption className={styles.visuallyHidden}>Estabelecimentos cadastrados</caption><thead><tr><th scope="col">Estabelecimento</th><th scope="col">Status</th><th scope="col">Endereço</th><th scope="col">Ações</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><strong>{item.name}</strong><span>Ponto de operação</span></td><td><span className={`${styles.status} ${item.status === 'ACTIVE' ? styles.active : styles.inactive}`}>{item.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</span></td><td>{item.address_label ?? 'Endereço não informado'}{item.city ? ` · ${item.city}${item.state ? `/${item.state}` : ''}` : ''}</td><td><div className={styles.actionLinks}><EstablishmentStatus id={item.id} initialStatus={item.status} compact /></div></td></tr>)}</tbody></table></div>}
  </>;
}
