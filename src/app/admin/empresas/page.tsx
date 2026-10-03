import Link from 'next/link';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { listCompanies } from '@/modules/admin/admin.actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CompaniesAdmin } from './companies-admin';
import styles from '../admin.module.css';

export default async function CompaniesPage() {
  await requirePlatformAdmin();
  const result = await listCompanies();
  return <main className={styles.page}>
    <div className={styles.breadcrumb}>Administração <span aria-hidden="true">›</span> Empresas</div>
    <header className={styles.header}><div><h1>Empresas</h1><p>Gerencie empresas, estabelecimentos e acessos.</p></div><Link href="/admin/empresas/nova"><Button>Cadastrar empresa</Button></Link></header>
    {!result.ok ? <div className={styles.feedback} role="alert">{result.message}</div> : result.companies.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhuma empresa cadastrada.</p><Link href="/admin/empresas/nova">Cadastrar a primeira empresa</Link></Card> : <>
      <div className={styles.summaryHeader}><h2>Empresas cadastradas <span className={styles.count}>{result.companies.length}</span></h2></div>
      <CompaniesAdmin initialCompanies={result.companies} />
      <div className={styles.callout}><span className={styles.iconTile} aria-hidden="true">⌘</span><div><p><strong>Administração de empresas.</strong></p><p>Selecione uma empresa para editar seus dados, estabelecimentos e acessos.</p></div></div>
    </>}
  </main>;
}
