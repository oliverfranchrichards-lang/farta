import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { requirePlatformAdmin } from '@/modules/admin/admin.context';
import { listAdminCategories, listAdminProductImages, listAdminProducts, listAdminVariants, listCompanies } from '@/modules/admin/admin.actions';
import { ProductEditor } from './product-editor';
import styles from '../../catalog-admin.module.css';

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  await requirePlatformAdmin();
  const { productId } = await params;
  const [products, categories, variants, images, companies] = await Promise.all([listAdminProducts(), listAdminCategories(), listAdminVariants(productId), listAdminProductImages({ productId }), listCompanies()]);
  const product = products.ok ? products.products.find(item => item.id === productId) : null;
  if (!product) notFound();
  const companyOptions = companies.ok ? companies.companies as Array<{ id: string; display_name: string; legal_name?: string; tax_id?: string }> : [];
  return <main className={styles.page}><div className={styles.breadcrumb}><Link href="/admin/produtos">Administração → Produtos</Link> <span aria-hidden="true">›</span> {product.name}</div><header className={styles.header}><div><h1>Editar produto</h1><p>Atualize os dados e gerencie as variantes deste produto.</p></div><Link href="/admin/produtos"><Button variant="secondary">Voltar para produtos</Button></Link></header><ProductEditor product={product} categories={categories.ok ? categories.categories : []} initialVariants={variants.ok ? variants.variants : []} initialImages={images.ok ? images.images : []} companies={companyOptions} /></main>;
}
