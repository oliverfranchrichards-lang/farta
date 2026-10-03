'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createAdminProduct, type AdminCategory } from '@/modules/admin/admin.actions';
import styles from '../catalog-admin.module.css';

export function ProductForm({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter(); const [categoryId, setCategoryId] = useState(categories[0]?.id ?? ''); const [name, setName] = useState(''); const [brand, setBrand] = useState(''); const [description, setDescription] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const result = await createAdminProduct({ categoryId, name, brand, description }); if (!result.ok) { setError(result.message); setBusy(false); return; } router.push(`/admin/produtos/${result.product.id}`); router.refresh(); }
  return <Card className={styles.formCard}><form className={styles.form} onSubmit={submit}><h2>Informações principais</h2>{error && <div className={styles.error} role="alert">{error}</div>}<label className={styles.field} htmlFor="product-name">Nome do produto<input id="product-name" required maxLength={240} value={name} onChange={event => setName(event.target.value)} /></label><label className={styles.field} htmlFor="product-brand">Marca <small>Opcional</small><input id="product-brand" maxLength={160} value={brand} onChange={event => setBrand(event.target.value)} /></label><label className={styles.field} htmlFor="product-category">Categoria<select id="product-category" required value={categoryId} onChange={event => setCategoryId(event.target.value)}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className={styles.field} htmlFor="product-description">Descrição <small>Opcional</small><textarea id="product-description" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label><div className={styles.formActions}><Button type="button" variant="secondary" onClick={() => router.push('/admin/produtos')}>Cancelar</Button><Button type="submit" disabled={busy || !categoryId}>{busy ? 'Salvando…' : 'Salvar produto'}</Button></div></form></Card>;
}
