'use client';

import { useRef, useState } from 'react';
import { createCompanyInvitation } from '@/modules/invitations/invitation.actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import styles from '../../../admin.module.css';

type InviteRole = 'CUSTOMER' | 'INTERNAL_OPERATOR' | 'DRIVER';

export function InviteForm({ companyId }: { companyId: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const noticeRef = useRef<HTMLDivElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(''); setInviteLink(''); setError(''); setLoading(true);
    try {
      const result = await createCompanyInvitation({ companyId, email, role });
      if (!result.ok) { setError(result.message); queueMicrotask(() => noticeRef.current?.focus()); return; }
      setMessage('Convite criado. Copie o link abaixo e envie ao usuário.');
      setInviteLink(`${window.location.origin}/auth/invite?token=${result.token}`);
    } catch { setError('Não foi possível criar o convite. Tente novamente.'); }
    finally { setLoading(false); }
  }

  return (
    <Card className={styles.card}>
      <form onSubmit={submit} aria-busy={loading}>
        {(error || message) && <div ref={noticeRef} tabIndex={-1} className={error ? styles.feedback : styles.success} role={error ? 'alert' : 'status'} aria-live="polite">{error || message}</div>}
        {inviteLink && <Input id="invite-link" label="Link do convite" value={inviteLink} readOnly />}
        <Input id="invite-email" label="E-mail do convidado" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label className={styles.roleField} htmlFor="invite-role">
          Perfil de acesso
          <select id="invite-role" value={role} onChange={(event) => setRole(event.target.value as InviteRole)}>
            <option value="CUSTOMER">Cliente</option>
            <option value="INTERNAL_OPERATOR">Operador interno</option>
            <option value="DRIVER">Entregador</option>
          </select>
        </label>
        <div className={styles.actions}><Button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Criar convite'}</Button></div>
      </form>
    </Card>
  );
}
