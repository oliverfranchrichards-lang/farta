import Link from 'next/link';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { getCompany, listAdminCompanyPrices } from '@/modules/admin/admin.actions';
import { Button } from '@/components/ui/Button';
import { PricesAdmin } from './prices-admin';
import styles from '../../../admin.module.css';

export default async function CompanyPricesPage({ params }: { params: Promise<{ companyId: string }> }) {
  await requirePlatformAdmin();
  const { companyId } = await params;
  const [company, prices] = await Promise.all([getCompany(companyId), listAdminCompanyPrices(companyId)]);
  const name = company.ok ? String(company.company.display_name ?? '') : 'Empresa';
  return <main className={styles.page}>
    <div className={styles.breadcrumb}><Link href="/admin/empresas">Administração</Link> <span aria-hidden="true">›</span> <Link href={`/admin/empresas/${companyId}`}>Empresa</Link> <span aria-hidden="true">›</span> Preços</div>
    <header className={styles.header}><div><h1>Preços da empresa</h1><p>Consulte e atualize os preços aproximados dos produtos de {name}.</p></div><div className={styles.actions}><Link href={`/admin/empresas/${companyId}`}><Button variant="secondary">Voltar para empresa</Button></Link><Link href={`/admin/empresas/${companyId}/estabelecimentos`}><Button variant="secondary">Ver estabelecimentos</Button></Link></div></header>
    {company.ok && <div className={styles.companyContext}><span className={styles.iconTile} aria-hidden="true">⌂</span><div><strong>{name}</strong><span>{String(company.company.legal_name ?? '')}{company.company.tax_id ? ` · CNPJ ${String(company.company.tax_id)}` : ''}</span></div></div>}
    {!prices.ok ? <div className={styles.feedback} role="alert">{prices.message}</div> : <PricesAdmin companyId={companyId} companyName={name} initialPrices={prices.prices} />}
  </main>;
}
