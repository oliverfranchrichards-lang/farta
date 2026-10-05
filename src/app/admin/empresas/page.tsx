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
    <header className={styles.header}><div><h1>Empresas</h1><p>Gerencie as empresas cadastradas na operação.</p></div><Link href="/admin/empresas/nova"><Button><span aria-hidden="true">＋</span> Nova empresa</Button></Link></header>
    {!result.ok ? <div className={styles.feedback} role="alert">{result.message}</div> : result.companies.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhuma empresa cadastrada.</p><Link href="/admin/empresas/nova">Cadastrar a primeira empresa</Link></Card> : <CompaniesAdmin initialCompanies={result.companies} />}
  </main>;
}
