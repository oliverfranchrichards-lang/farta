'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import styles from '../admin.module.css';

type Company = { id: string; display_name: string; legal_name: string; tax_id: string | null; status: string; establishments_count: number };

export function CompaniesAdmin({ initialCompanies }: { initialCompanies: Company[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return initialCompanies.filter((company) => {
      const matchesQuery = !normalized || [company.display_name, company.legal_name, company.tax_id ?? ''].some((value) => value.toLocaleLowerCase('pt-BR').includes(normalized));
      return matchesQuery && (!status || company.status === status);
    });
  }, [initialCompanies, query, status]);
  const totalEstablishments = filtered.reduce((total, company) => total + Number(company.establishments_count ?? 0), 0);

  return <>
    <div className={styles.filterBar} role="search" aria-label="Filtrar empresas">
      <label className={styles.filterField} htmlFor="company-search">Buscar empresa<input id="company-search" type="search" placeholder="Nome, razão social ou CNPJ" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className={styles.filterField} htmlFor="company-status">Status<select id="company-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todas</option><option value="ACTIVE">Ativas</option><option value="INACTIVE">Inativas</option></select></label>
      <button className={styles.clearFilter} type="button" onClick={() => { setQuery(''); setStatus(''); }} disabled={!query && !status}>Limpar filtros</button>
    </div>
    <p className={styles.filterSummary} role="status">Exibindo {filtered.length} de {initialCompanies.length} empresas · {totalEstablishments} estabelecimentos</p>
    {filtered.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhuma empresa corresponde aos filtros.</p></Card> : <div className={styles.grid}>{filtered.map(company => <Card key={company.id} className={`${styles.card} ${styles.companyCard}`}><div className={styles.companyCardHeader}><span className={styles.iconTile} aria-hidden="true">◆</span><span className={styles.overline}>Empresa</span></div><h2>{company.display_name}</h2><p>{company.legal_name}</p>{company.tax_id && <p className={styles.taxId}>CNPJ&nbsp; {company.tax_id}</p>}<p><span className={`${styles.status} ${company.status === 'ACTIVE' ? styles.active : styles.inactive}`}>{company.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}</span></p><div className={styles.establishmentBand}><span aria-hidden="true">⌂</span>{company.establishments_count} estabelecimento{company.establishments_count === 1 ? '' : 's'}</div><div className={styles.cardFooter}><Link href={`/admin/empresas/${company.id}`}>Editar empresa</Link><Link className={styles.softLink} href={`/admin/empresas/${company.id}/estabelecimentos`}>Ver estabelecimentos&nbsp; →</Link></div></Card>)}</div>}
  </>;
}
