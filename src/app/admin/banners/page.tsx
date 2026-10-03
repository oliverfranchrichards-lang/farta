import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { listAdminBanners } from '@/modules/banners/banner.actions';
import { BannersAdmin } from './banners-admin';
import styles from './banners-admin.module.css';

export default async function BannersPage() {
  await requirePlatformAdmin();
  const result = await listAdminBanners();
  return <main className={styles.page}><div className={styles.breadcrumb}><Link href="/admin/empresas">Administração</Link> <span aria-hidden="true">›</span> Banners</div><header className={styles.header}><div><h1>Banners</h1><p>Gerencie os destaques exibidos no catálogo de compras.</p></div><Link href="/admin/produtos"><Button variant="secondary">Voltar para produtos</Button></Link></header>{result.ok ? <BannersAdmin initialBanners={result.banners} /> : <div className={styles.error} role="alert">{result.message}</div>}</main>;
}
