import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { listAdminCategories, listAdminProducts } from '@/modules/admin/admin.actions';
import { ProductsAdmin } from './products-admin';
import styles from '../catalog-admin.module.css';

export default async function AdminProductsPage() {
  await requirePlatformAdmin();
  const [products, categories] = await Promise.all([listAdminProducts(), listAdminCategories()]);
  return <main className={styles.page}>
    <div className={styles.breadcrumb}>Administração <span aria-hidden="true">›</span> Produtos</div>
    <header className={styles.header}><div><h1>Produtos</h1><p>Gerencie categorias, produtos e variantes do catálogo.</p></div><div className={styles.actions}><Link href="/admin/categorias"><Button variant="secondary">Gerenciar categorias</Button></Link><Link href="/admin/produtos/novo"><Button>Cadastrar produto</Button></Link></div></header>
    {!products.ok ? <div className={styles.error} role="alert">{products.message}</div> : !products.products.length ? <Card className={styles.empty}><h2>Nenhum produto cadastrado.</h2><p>Cadastre o primeiro produto para começar o catálogo.</p><Link href="/admin/produtos/novo"><Button>Cadastrar primeiro produto</Button></Link></Card> : <ProductsAdmin initialProducts={products.products} categories={categories.ok ? categories.categories : []} />}
  </main>;
}
