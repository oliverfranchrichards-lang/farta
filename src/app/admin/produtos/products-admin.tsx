'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { type AdminCategory, type AdminProduct } from '@/modules/admin/admin.actions';
import styles from '../catalog-admin.module.css';

export function ProductsAdmin({ initialProducts, categories }: { initialProducts: AdminProduct[]; categories: AdminCategory[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const products = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return initialProducts.filter((product) => {
      const text = [product.name, product.brand ?? '', product.category_name].join(' ').toLocaleLowerCase('pt-BR');
      return (!normalized || text.includes(normalized)) && (!status || product.status === status);
    });
  }, [initialProducts, query, status]);
  return <>
    <div className={styles.toolbar}><h2>Produtos cadastrados <span className={styles.count}>{products.length}</span></h2><label className={styles.field} htmlFor="product-search">Buscar produto<input id="product-search" type="search" placeholder="Nome, marca ou categoria" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className={styles.field} htmlFor="product-status">Status<select id="product-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select></label><button className={styles.clearFilter} type="button" onClick={() => { setQuery(''); setStatus(''); }} disabled={!query && !status}>Limpar filtros</button></div>
    {products.length === 0 ? <div className={styles.empty} role="status">Nenhum produto corresponde aos filtros.</div> : <div className={`${styles.tableWrap} ${styles.productTable}`}><table className={styles.table}><caption className={styles.empty}>Lista de produtos cadastrados</caption><thead><tr><th scope="col">Produto</th><th scope="col">Marca</th><th scope="col">Categoria</th><th scope="col">Status</th><th scope="col">Ações</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.brand || '—'}</td><td>{product.category_name}</td><td><Badge tone={product.status === 'ACTIVE' ? 'success' : 'default'}>{product.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge></td><td><Link href={`/admin/produtos/${product.id}`} aria-label={`Editar produto ${product.name}`}>Editar produto</Link></td></tr>)}</tbody></table></div>}
    {categories.length === 0 && <p className={styles.confirmHint}>Cadastre uma categoria antes de criar produtos.</p>}
  </>;
}
