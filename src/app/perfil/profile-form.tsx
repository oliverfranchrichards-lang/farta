'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { updateMyPhone } from '@/modules/auth/auth.actions';
import { formatBrazilPhone } from '@/lib/contact/phone';
import styles from './profile.module.css';

export function ProfileForm({ initialPhone }: { initialPhone: string | null }) {
  const [phone, setPhone] = useState(formatBrazilPhone(initialPhone) ?? '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice(''); setError('');
    const result = await updateMyPhone(phone);
    if (result.ok) setNotice(result.message ?? 'Telefone atualizado.');
    else setError(result.message);
    setBusy(false);
  }

  return <form className={styles.form} onSubmit={submit}>
    <div>
      <p className={styles.eyebrow}>CONTATO</p>
      <h2>WhatsApp</h2>
      <p className={styles.help}>Usaremos este número somente como contato manual. O Farta não envia mensagens automaticamente.</p>
    </div>
    {(notice || error) && <div className={error ? styles.error : styles.notice} role={error ? 'alert' : 'status'} aria-live="polite">{error || notice}</div>}
    <label className={styles.field} htmlFor="profile-phone">
      <span>Número de telefone</span>
      <input id="profile-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={phone} onChange={(event) => setPhone(event.target.value)} aria-describedby="profile-phone-help" />
      <small id="profile-phone-help">Informe DDD e número. Deixe vazio para remover o contato.</small>
    </label>
    <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar telefone'}</Button>
  </form>;
}
