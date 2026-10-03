import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { listAdminCategories, listAdminProducts } from '@/modules/admin/admin.actions';
import { CategoriesAdmin } from './categories-admin';
import styles from '../catalog-admin.module.css';

export default async function AdminCategoriesPage() {
  await requirePlatformAdmin();
  const [categories, products] = await Promise.all([listAdminCategories(), listAdminProducts()]);
  return <main className={styles.page}>
    <div className={styles.breadcrumb}><Link href="/admin/produtos">Administração → Produtos</Link> <span aria-hidden="true">›</span> Categorias</div>
    <header className={styles.header}><div><h1>Categorias</h1><p>Organize o catálogo sem perder o histórico dos produtos.</p></div><Link href="/admin/produtos"><Button variant="secondary">Voltar para produtos</Button></Link></header>
    {!categories.ok ? <div className={styles.error} role="alert">{categories.message}</div> : <CategoriesAdmin initialCategories={categories.categories} products={products.ok ? products.products : []} />}
  </main>;
}
