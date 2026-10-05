import Link from 'next/link';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { getCompany, listEstablishments } from '@/modules/admin/admin.actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EstablishmentsAdmin } from './establishments-admin';
import styles from '../../../admin.module.css';

export default async function EstablishmentsPage({ params }: { params: Promise<{ companyId: string }> }) {
  await requirePlatformAdmin();
  const { companyId } = await params;
  const result = await listEstablishments(companyId);
  const company = await getCompany(companyId);
  const companyName = company.ok ? String(company.company.display_name ?? '') : '';
  const legalName = company.ok ? String(company.company.legal_name ?? '') : '';
  const taxId = company.ok ? String(company.company.tax_id ?? '') : '';
  return <main className={styles.page}>
    <div className={styles.breadcrumb}><Link href="/admin/empresas">Administração</Link> <span aria-hidden="true">›</span> <Link href={`/admin/empresas/${companyId}`}>Empresa</Link> <span aria-hidden="true">›</span> Estabelecimentos</div>
    <header className={styles.header}><div><h1>Estabelecimentos</h1><p>Gerencie os estabelecimentos cadastrados nas empresas.</p></div><div className={styles.actions}><Link href={`/admin/empresas/${companyId}/convites`}><Button variant="secondary">Gerenciar convites</Button></Link><Link href={`/admin/empresas/${companyId}/estabelecimentos/novo`}><Button><span aria-hidden="true">＋</span> Novo estabelecimento</Button></Link></div></header>
    {company.ok && <div className={styles.companyContext}><span className={styles.iconTile} aria-hidden="true">⌂</span><div><strong>{companyName}</strong><span>{legalName}{taxId ? ` · CNPJ ${taxId}` : ''}</span></div></div>}
    {!result.ok ? <div className={styles.feedback} role="alert">{result.message}</div> : result.establishments.length === 0 ? <Card className={`${styles.card} ${styles.empty}`}><p>Nenhum estabelecimento cadastrado.</p><Link href={`/admin/empresas/${companyId}/estabelecimentos/novo`}>Cadastrar o primeiro estabelecimento</Link></Card> : <><EstablishmentsAdmin initialEstablishments={result.establishments} /><Card className={`${styles.card} ${styles.accessCard}`}><div className={styles.companyCardHeader}><span className={styles.iconTile} aria-hidden="true">♙</span><span className={styles.overline}>Acessos à empresa</span></div><h2>Convide sua equipe</h2><p>Gerencie os acessos vinculados a esta empresa pelo fluxo de convites.</p><Link href={`/admin/empresas/${companyId}/convites`}>Gerenciar convites&nbsp; →</Link></Card></>}
  </main>;
}
