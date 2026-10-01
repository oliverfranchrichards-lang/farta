import Link from 'next/link';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { getCompany } from '@/modules/admin/admin.actions';
import { Button } from '@/components/ui/Button';
import { CompanyEdit } from './company-edit';
import styles from '../../admin.module.css';

export default async function CompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  await requirePlatformAdmin();
  const { companyId } = await params;
  const result = await getCompany(companyId);
  const name = result.ok ? String(result.company.display_name ?? '') : '';
  return <main className={styles.page}>
    <div className={styles.breadcrumb}><Link href="/admin/empresas">Administração</Link> <span aria-hidden="true">›</span> Empresas <span aria-hidden="true">›</span> {name || 'Empresa'}</div>
    <header className={styles.header}><div><h1>Editar empresa{ name ? `: ${name}` : ''}</h1><p>Dados cadastrais, contatos e condições comerciais.</p></div><Link href={`/admin/empresas/${companyId}/estabelecimentos`}><Button variant="secondary">Ver estabelecimentos</Button></Link></header>
    {result.ok ? <CompanyEdit companyId={companyId} company={result.company} /> : <div className={styles.feedback} role="alert">{result.message}</div>}
  </main>;
}
