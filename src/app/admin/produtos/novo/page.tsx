import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { listAdminCategories } from '@/modules/admin/admin.actions';
import { ProductForm } from '../product-form';
import styles from '../../catalog-admin.module.css';

export default async function NewProductPage() {
  await requirePlatformAdmin();
  const categories = await listAdminCategories('ACTIVE');
  return <main className={styles.page}><div className={styles.breadcrumb}><Link href="/admin/produtos">Administração → Produtos</Link> <span aria-hidden="true">›</span> Novo produto</div><header className={styles.header}><div><h1>Cadastrar produto</h1><p>Adicione um item global ao catálogo.</p></div><Link href="/admin/produtos"><Button variant="secondary">Cancelar</Button></Link></header>{!categories.ok ? <div className={styles.error} role="alert">{categories.message}</div> : <ProductForm categories={categories.categories} />}</main>;
}
