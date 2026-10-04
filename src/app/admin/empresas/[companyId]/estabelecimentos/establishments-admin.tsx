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
      <label className={styles.filterField} htmlFor="establishment-search">Buscar estabelecimento<input id="establishment-search" type="search" placeholder="Nome, endereço ou cidade" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className={styles.filterField} htmlFor="establishment-status">Status<select id="establishment-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select></label>
      <button className={styles.clearFilter} type="button" onClick={() => { setQuery(''); setStatus(''); }} disabled={!query && !status}>Limpar filtros</button>
    </div>
    <p className={styles.filterSummary} role="status">Exibindo {filtered.length} de {initialEstablishments.length} estabelecimentos</p>
    {filtered.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhum estabelecimento corresponde aos filtros.</p></Card> : <div className={styles.grid}>{filtered.map(item => <Card key={item.id} className={`${styles.card} ${styles.establishmentCard}`}><div className={styles.companyCardHeader}><span className={styles.iconTile} aria-hidden="true">⌂</span><span className={styles.overline}>Ponto de operação</span></div><h2>{item.name}</h2><p>{item.address_label ?? 'Endereço não informado'}</p><p>{item.city ?? ''}{item.state ? ` — ${item.state}` : ''}</p><div className={styles.statusInline}><EstablishmentStatus id={item.id} initialStatus={item.status} /></div></Card>)}</div>}
  </>;
}
