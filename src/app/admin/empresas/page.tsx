import Link from 'next/link';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { listCompanies } from '@/modules/admin/admin.actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from '../admin.module.css';

export default async function CompaniesPage() {
  await requirePlatformAdmin();
  const result = await listCompanies();
  const totalEstablishments = result.ok ? result.companies.reduce((total, company) => total + Number(company.establishments_count ?? 0), 0) : 0;
  return <main className={styles.page}>
    <div className={styles.breadcrumb}>Administração <span aria-hidden="true">›</span> Empresas</div>
    <header className={styles.header}><div><h1>Empresas</h1><p>Gerencie empresas, estabelecimentos e acessos.</p></div><Link href="/admin/empresas/nova"><Button>Cadastrar empresa</Button></Link></header>
    {!result.ok ? <div className={styles.feedback} role="alert">{result.message}</div> : result.companies.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhuma empresa cadastrada.</p><Link href="/admin/empresas/nova">Cadastrar a primeira empresa</Link></Card> : <>
      <div className={styles.summaryHeader}><h2>Empresas cadastradas <span className={styles.count}>{result.companies.length}</span></h2><span>{totalEstablishments} estabelecimentos no total</span></div>
      <div className={styles.grid}>{result.companies.map(company => <Card key={company.id} className={`${styles.card} ${styles.companyCard}`}><div className={styles.companyCardHeader}><span className={styles.iconTile} aria-hidden="true">◆</span><span className={styles.overline}>Empresa</span></div><h2>{company.display_name}</h2><p>{company.legal_name}</p>{company.tax_id && <p className={styles.taxId}>CNPJ&nbsp; {company.tax_id}</p>}<div className={styles.establishmentBand}><span aria-hidden="true">⌂</span>{company.establishments_count} estabelecimento{company.establishments_count === 1 ? '' : 's'}</div><div className={styles.cardFooter}><Link href={`/admin/empresas/${company.id}`}>Editar empresa</Link><Link className={styles.softLink} href={`/admin/empresas/${company.id}/estabelecimentos`}>Ver estabelecimentos&nbsp; →</Link></div></Card>)}</div>
      <div className={styles.callout}><span className={styles.iconTile} aria-hidden="true">⌘</span><div><p><strong>Administração de empresas.</strong></p><p>Selecione uma empresa para editar seus dados, estabelecimentos e acessos.</p></div></div>
    </>}
  </main>;
}
