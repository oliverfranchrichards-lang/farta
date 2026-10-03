'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { createAdminCategory, deleteAdminCategory, listAdminCategories, updateAdminCategory, type AdminCategory, type AdminProduct } from '@/modules/admin/admin.actions';
import styles from '../catalog-admin.module.css';

export function CategoriesAdmin({ initialCategories, products }: { initialCategories: AdminCategory[]; products: AdminProduct[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ mode: 'delete' | 'inactive'; category: AdminCategory; count: number } | null>(null);
  const counts = useMemo(() => new Map(categories.map(category => [category.id, products.filter(product => product.category_id === category.id).length])), [categories, products]);

  async function reload() { const result = await listAdminCategories(); if (result.ok) setCategories(result.categories); else setError(result.message); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    if (editing && editing.status === 'INACTIVE' && (counts.get(editing.id) ?? 0) > 0) { setConfirm({ mode: 'inactive', category: { ...editing, name }, count: counts.get(editing.id) ?? 0 }); setBusy(false); return; }
    const result = editing ? await updateAdminCategory({ id: editing.id, name, sortOrder: editing.sort_order, status: editing.status as 'ACTIVE' | 'INACTIVE' }) : await createAdminCategory({ name });
    if (!result.ok) setError(result.message); else { setNotice('Categoria salva com sucesso.'); setName(''); setEditing(null); await reload(); }
    setBusy(false);
  }
  async function confirmAction() {
    if (!confirm) return;
    setBusy(true); setError('');
    const result = confirm.mode === 'delete' ? await deleteAdminCategory(confirm.category.id, true) : await updateAdminCategory({ id: confirm.category.id, name: confirm.category.name, sortOrder: confirm.category.sort_order, status: 'INACTIVE', confirmReassign: true });
    if (!result.ok) setError(result.message); else { setNotice(confirm.mode === 'delete' ? 'Categoria excluída e produtos movidos para Outros.' : 'Categoria inativada e produtos movidos para Outros.'); await reload(); }
    setConfirm(null); setBusy(false);
  }
  return <>
    {notice && <div className={styles.notice} role="status">{notice}</div>}{error && <div className={styles.error} role="alert">{error}</div>}
    <div className={styles.toolbar}><h2>Categorias cadastradas <span className={styles.count}>{categories.length}</span></h2></div>
    <div className={`${styles.tableWrap} ${styles.categoryTable}`}><table className={styles.table}><caption className={styles.empty}>Lista de categorias</caption><thead><tr><th scope="col">Categoria</th><th scope="col">Produtos</th><th scope="col">Status</th><th scope="col">Ações</th></tr></thead><tbody>{categories.map(category => { const count = counts.get(category.id) ?? 0; const isOther = category.name.toLowerCase() === 'outros'; return <tr key={category.id}><td><strong>{category.name}</strong></td><td>{count}</td><td><span className={`${styles.status} ${category.status === 'ACTIVE' ? styles.active : styles.inactive}`}>{category.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}</span></td><td><div className={styles.actions}><Button type="button" variant="tertiary" onClick={() => { setEditing(category); setName(category.name); }}>Editar</Button>{!isOther && <><Button type="button" variant="secondary" onClick={() => count > 0 ? setConfirm({ mode: 'inactive', category, count }) : void updateAdminCategory({ id: category.id, name: category.name, sortOrder: category.sort_order, status: 'INACTIVE' }).then(() => reload())}>Inativar</Button><Button type="button" variant="destructive" onClick={() => setConfirm({ mode: 'delete', category, count })}>Excluir</Button></>}</div></td></tr>; })}</tbody></table></div>
    <Card className={styles.formCard}><form className={styles.form} onSubmit={save}><h2>{editing ? 'Editar categoria' : 'Cadastrar categoria'}</h2><label className={styles.field} htmlFor="category-name">Nome da categoria<input id="category-name" required maxLength={160} value={name} onChange={event => setName(event.target.value)} /></label>{editing && <label className={styles.field} htmlFor="category-status">Estado<select id="category-status" value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value })}><option value="ACTIVE">Ativa</option><option value="INACTIVE">Inativa</option></select></label>}<div className={styles.formActions}><Button type="button" variant="secondary" onClick={() => { setEditing(null); setName(''); }}>Limpar</Button><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar categoria'}</Button></div></form></Card>
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.mode === 'delete' ? 'Excluir categoria?' : 'Inativar categoria?'} description={confirm ? `Esta categoria possui ${confirm.count} produto(s). Eles serão movidos para a categoria Outros antes da operação.` : ''} confirmLabel={confirm?.mode === 'delete' ? 'Excluir e mover produtos' : 'Inativar e mover produtos'} destructive busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void confirmAction()} />
  </>;
}
