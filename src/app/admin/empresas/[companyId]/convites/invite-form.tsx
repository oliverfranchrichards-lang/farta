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
      <form className={styles.inviteForm} onSubmit={submit} aria-busy={loading}>
        {(error || message) && <div ref={noticeRef} tabIndex={-1} className={error ? styles.feedback : styles.success} role={error ? 'alert' : 'status'} aria-live="polite">{error || message}</div>}
        {inviteLink && <Input id="invite-link" label="Link do convite" value={inviteLink} readOnly />}
        <Input id="invite-email" label="E-mail do convidado" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <fieldset className={styles.roleOptions}><legend>Perfil de acesso</legend><label className={role === 'CUSTOMER' ? styles.roleOptionSelected : styles.roleOption}><input type="radio" name="invite-role" value="CUSTOMER" checked={role === 'CUSTOMER'} onChange={() => setRole('CUSTOMER')} /><span><strong>Cliente</strong><small>Acesso à empresa</small></span></label><label className={role === 'DRIVER' ? styles.roleOptionSelected : styles.roleOption}><input type="radio" name="invite-role" value="DRIVER" checked={role === 'DRIVER'} onChange={() => setRole('DRIVER')} /><span><strong>Entregador</strong><small>Rotas e entregas</small></span></label><label className={role === 'INTERNAL_OPERATOR' ? styles.roleOptionSelected : styles.roleOption}><input type="radio" name="invite-role" value="INTERNAL_OPERATOR" checked={role === 'INTERNAL_OPERATOR'} onChange={() => setRole('INTERNAL_OPERATOR')} /><span><strong>Operador interno</strong><small>Gestão da operação</small></span></label></fieldset>
        <div className={styles.actions}><Button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Criar convite'}</Button></div>
      </form>
    </Card>
  );
}
