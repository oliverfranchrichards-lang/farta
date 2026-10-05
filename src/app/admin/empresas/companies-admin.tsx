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
      <label className={styles.filterField} htmlFor="company-search">Buscar empresa<input id="company-search" type="search" placeholder="Buscar empresa..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label className={styles.filterField} htmlFor="company-status">Status<select id="company-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todas as empresas</option><option value="ACTIVE">Ativas</option><option value="INACTIVE">Inativas</option></select></label>
      <button className={styles.clearFilter} type="button" onClick={() => { setQuery(''); setStatus(''); }} disabled={!query && !status}>Limpar filtros</button>
    </div>
    <p className={styles.filterSummary} role="status">Mostrando {filtered.length} de {initialCompanies.length} empresas · {totalEstablishments} estabelecimentos</p>
    {filtered.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhuma empresa corresponde aos filtros.</p></Card> : <div className={styles.companyTableCard}><table className={styles.companyTable}><caption className={styles.visuallyHidden}>Empresas cadastradas</caption><thead><tr><th scope="col">Empresa</th><th scope="col">CNPJ</th><th scope="col">Estabelecimentos</th><th scope="col">Ações</th></tr></thead><tbody>{filtered.map(company => <tr key={company.id}><td><strong>{company.display_name}</strong><span>{company.legal_name}</span><em className={`${styles.status} ${company.status === 'ACTIVE' ? styles.active : styles.inactive}`}>{company.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}</em></td><td>{company.tax_id ?? '—'}</td><td>{company.establishments_count}</td><td><div className={styles.actionLinks}><Link className={styles.iconAction} href={`/admin/empresas/${company.id}`} aria-label={`Editar ${company.display_name}`} title="Editar empresa"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 16 9.5-9.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /><path d="m13.5 6.5 4 4" /></svg><span className={styles.visuallyHidden}>Editar</span></Link><Link className={styles.iconAction} href={`/admin/empresas/${company.id}/estabelecimentos`} aria-label={`Ver estabelecimentos de ${company.display_name}`} title="Ver estabelecimentos"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg><span className={styles.visuallyHidden}>Ver estabelecimentos</span></Link></div></td></tr>)}</tbody></table></div>}
  </>;
}
