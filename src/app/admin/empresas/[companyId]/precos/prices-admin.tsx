'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { listAdminCompanyPrices, upsertAdminCompanyPrice, type AdminCompanyPrice } from '@/modules/admin/admin.actions';
import styles from './prices.module.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const unitLabel = (unit: string) => unit === 'BOX' ? 'caixa(s)' : unit === 'UNIT' || unit === 'UN' ? 'unidade(s)' : unit;

export function PricesAdmin({ companyId, companyName, initialPrices }: { companyId: string; companyName: string; initialPrices: AdminCompanyPrice[] }) {
  const [prices, setPrices] = useState(initialPrices);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminCompanyPrice | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => { const q = query.trim().toLocaleLowerCase(); return q ? prices.filter(item => `${item.product_name} ${item.variant_name} ${item.sku_code}`.toLocaleLowerCase().includes(q)) : prices; }, [prices, query]);

  function open(item: AdminCompanyPrice) {
    setEditing(item); setError(''); setNotice(''); setValue(item.amount_minor == null ? '' : (item.amount_minor / 100).toFixed(2).replace('.', ','));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return;
    const normalized = value.trim().replace(/\./g, '').replace(',', '.'); const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) { setError('Informe um preço válido maior ou igual a zero.'); return; }
    const amountMinor = Math.round(parsed * 100); setBusy(true); setError('');
    const result = await upsertAdminCompanyPrice({ companyId, skuId: editing.sku_id, amountMinor });
    if (!result.ok) { setError(result.message); setBusy(false); return; }
    const refreshed = await listAdminCompanyPrices(companyId);
    if (refreshed.ok) setPrices(refreshed.prices);
    setNotice('Preço atualizado com sucesso.'); setEditing(null); setBusy(false);
  }
  return <>
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {error && !editing && <div className={styles.error} role="alert">{error}</div>}
    <Card className={styles.panel}><div className={styles.toolbar}><div><h2>Catálogo da empresa</h2><p>Estes preços são exclusivos de {companyName} e aparecem para seus clientes quando estiverem vigentes.</p></div><label className={styles.search}>Buscar produto, variante ou SKU<input value={query} onChange={event => setQuery(event.target.value)} /></label></div></Card>
    {filtered.length === 0 ? <Card className={styles.empty}><h2>{prices.length ? 'Nenhum preço corresponde aos filtros aplicados.' : 'Nenhum SKU cadastrado.'}</h2><p>Cadastre produtos e variantes antes de definir preços.</p></Card> : <div className={styles.tableWrap}><table className={styles.table}><caption className={styles.srOnly}>Preços aproximados de {companyName}</caption><thead><tr><th scope="col">Produto</th><th scope="col">Variante / SKU</th><th scope="col">Unidade</th><th scope="col">Mínimo</th><th scope="col">Preço aproximado</th><th scope="col">Status</th><th scope="col">Ação</th></tr></thead><tbody>{filtered.map(item => { const available = item.sku_status === 'ACTIVE' && item.product_status === 'ACTIVE'; return <tr key={item.sku_id}><td><strong>{item.product_name}</strong>{item.brand && <small>{item.brand}</small>}</td><td>{item.variant_name}<small>SKU {item.sku_code}</small></td><td>{item.sale_unit}</td><td>{item.minimum_quantity} {unitLabel(item.sale_unit)}</td><td>{item.amount_minor == null ? <span className={styles.missing}>Sem preço definido</span> : money.format(item.amount_minor / 100)}</td><td><span className={available ? styles.active : styles.inactive}>{available ? (item.amount_minor == null ? 'Indisponível' : 'Ativo') : 'SKU inativo'}</span></td><td><Button type="button" variant="secondary" disabled={!available} onClick={() => open(item)} aria-label={`${item.amount_minor == null ? 'Definir' : 'Editar'} preço de ${item.product_name} — ${item.variant_name}`}>{item.amount_minor == null ? 'Definir preço' : 'Editar preço'}</Button></td></tr>; })}</tbody></table></div>}
    {editing && <div className={styles.overlay} role="presentation"><dialog open className={styles.dialog} aria-labelledby="price-dialog-title"><form onSubmit={save}><h2 id="price-dialog-title">{editing.amount_minor == null ? 'Definir preço' : 'Editar preço'}</h2><p>{editing.product_name} · {editing.variant_name}</p><dl><div><dt>Empresa</dt><dd>{companyName}</dd></div><div><dt>SKU</dt><dd>{editing.sku_code} · {editing.sale_unit}</dd></div></dl><label className={styles.field} htmlFor="price-value">Preço aproximado (R$)<input id="price-value" value={value} onChange={event => setValue(event.target.value)} inputMode="decimal" autoFocus aria-describedby={error ? 'price-error' : undefined} /></label>{error && <div id="price-error" className={styles.error} role="alert">{error}</div>}<div className={styles.dialogActions}><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar preço'}</Button></div></form></dialog></div>}
  </>;
}
