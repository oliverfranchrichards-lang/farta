'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createAdminBanner, listAdminBanners, updateAdminBanner, type Banner } from '@/modules/banners/banner.actions';
import styles from './banners-admin.module.css';

type BannerWithImage = Banner & { imageUrl: string | null };

export function BannersAdmin({ initialBanners }: { initialBanners: BannerWithImage[] }) {
  const [banners, setBanners] = useState(initialBanners);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [title, setTitle] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    const result = await listAdminBanners();
    if (result.ok) setBanners(result.banners);
    else setError(result.message);
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError(''); setNotice('');
    const result = await createAdminBanner({ file, altText, title, sortOrder, status: 'INACTIVE' });
    if (!result.ok) setError(result.message);
    else { setNotice('Banner cadastrado como inativo. Revise os dados e ative quando estiver pronto.'); setFile(null); setAltText(''); setTitle(''); setSortOrder(0); await reload(); }
    setBusy(false);
  }

  async function save(banner: BannerWithImage, form: HTMLFormElement) {
    const values = new FormData(form);
    setBusy(true); setError(''); setNotice('');
    const result = await updateAdminBanner({ id: banner.id, altText: String(values.get('altText') ?? ''), title: String(values.get('title') ?? ''), sortOrder: Number(values.get('sortOrder') ?? 0), status: String(values.get('status')) as 'ACTIVE' | 'INACTIVE' });
    if (!result.ok) setError(result.message); else { setNotice('Banner atualizado com sucesso.'); await reload(); }
    setBusy(false);
  }

  return <>
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {error && <div className={styles.error} role="alert">{error}</div>}
    <Card className={styles.formCard}><form className={styles.form} onSubmit={create}><h2>Cadastrar banner</h2><p className={styles.hint}>O banner será criado como inativo. Use JPEG, PNG ou WebP de até 5 MB.</p><label className={styles.field} htmlFor="banner-file">Arquivo<input id="banner-file" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><label className={styles.field} htmlFor="banner-title">Título opcional<input id="banner-title" maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label><label className={styles.field} htmlFor="banner-alt">Texto alternativo<input id="banner-alt" required maxLength={240} value={altText} onChange={event => setAltText(event.target.value)} /></label><label className={styles.field} htmlFor="banner-order">Ordem<input id="banner-order" type="number" min="0" step="1" inputMode="numeric" value={sortOrder} onChange={event => setSortOrder(Number(event.target.value) || 0)} /></label><div className={styles.formActions}><Button type="submit" disabled={busy || !file}>{busy ? 'Enviando…' : 'Cadastrar banner'}</Button></div></form></Card>
    <section className={styles.list}><h2>Banners cadastrados <span className={styles.count}>{banners.length}</span></h2>{banners.length === 0 ? <Card className={styles.empty}><p>Nenhum banner cadastrado.</p></Card> : banners.map(banner => <Card key={banner.id} className={styles.bannerCard}><div className={styles.preview}>{banner.imageUrl ? <Image src={banner.imageUrl} alt="" width={560} height={260} /> : <span>Imagem indisponível</span>}</div><form className={styles.form} onSubmit={event => { event.preventDefault(); void save(banner, event.currentTarget); }}><label className={styles.field} htmlFor={`banner-title-${banner.id}`}>Título<input id={`banner-title-${banner.id}`} name="title" defaultValue={banner.title ?? ''} maxLength={160} /></label><label className={styles.field} htmlFor={`banner-alt-${banner.id}`}>Texto alternativo<input id={`banner-alt-${banner.id}`} name="altText" defaultValue={banner.alt_text} required maxLength={240} /></label><label className={styles.field} htmlFor={`banner-order-${banner.id}`}>Ordem<input id={`banner-order-${banner.id}`} name="sortOrder" type="number" min="0" step="1" defaultValue={banner.sort_order} /></label><label className={styles.field} htmlFor={`banner-status-${banner.id}`}>Status<select id={`banner-status-${banner.id}`} name="status" defaultValue={banner.status}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></label><div className={styles.formActions}><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar banner'}</Button></div></form></Card>)}</section>
  </>;
}
