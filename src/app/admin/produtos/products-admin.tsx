'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { listAdminProducts, type AdminCategory, type AdminProduct } from '@/modules/admin/admin.actions';
import styles from '../catalog-admin.module.css';

export function ProductsAdmin({ initialProducts, categories }: { initialProducts: AdminProduct[]; categories: AdminCategory[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState('');
  async function refresh(nextStatus = status) {
    const result = await listAdminProducts(nextStatus ? nextStatus as 'ACTIVE' | 'INACTIVE' : undefined);
    if (result.ok) setProducts(result.products); else setNotice(result.message);
  }
  return <>
    {notice && <div className={styles.error} role="alert">{notice}</div>}
    <div className={styles.toolbar}><h2>Produtos cadastrados <span className={styles.count}>{products.length}</span></h2><label className={styles.field}>Status<select value={status} onChange={event => { setStatus(event.target.value); void refresh(event.target.value); }}><option value="">Todos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select></label></div>
    <div className={`${styles.tableWrap} ${styles.productTable}`}><table className={styles.table}><caption className={styles.empty}>Lista de produtos cadastrados</caption><thead><tr><th scope="col">Produto</th><th scope="col">Marca</th><th scope="col">Categoria</th><th scope="col">Status</th><th scope="col">Ações</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.brand || '—'}</td><td>{product.category_name}</td><td><Badge tone={product.status === 'ACTIVE' ? 'success' : 'default'}>{product.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge></td><td><Link href={`/admin/produtos/${product.id}`} aria-label={`Editar produto ${product.name}`}>Editar produto</Link></td></tr>)}</tbody></table></div>
    {categories.length === 0 && <p className={styles.confirmHint}>Cadastre uma categoria antes de criar produtos.</p>}
  </>;
}
