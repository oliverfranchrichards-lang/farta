'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeEstablishmentStatus } from '@/modules/admin/admin-status.actions';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from '../../../admin.module.css';

export function EstablishmentStatus({ id, initialStatus }: { id: string; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  async function change() {
    const next = status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setLoading(true); setError(''); setSuccess('');
    try {
      const result = await changeEstablishmentStatus(id, next);
      if (!result.ok) setError(result.message);
      else { setStatus(next); setConfirmOpen(false); setSuccess(next === 'ACTIVE' ? 'Estabelecimento ativado.' : 'Estabelecimento desativado.'); router.refresh(); }
    } catch { setError('Não foi possível atualizar o estabelecimento.'); }
    finally { setLoading(false); }
  }
  return <div><p>Status: <Badge tone={status === 'ACTIVE' ? 'success' : 'default'}>{status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge></p><Button type='button' variant={status === 'ACTIVE' ? 'destructive' : 'secondary'} onClick={() => setConfirmOpen(true)} disabled={loading}>{loading ? 'Atualizando…' : status === 'ACTIVE' ? 'Desativar' : 'Ativar'}</Button><ConfirmDialog open={confirmOpen} title={status === 'ACTIVE' ? 'Desativar estabelecimento?' : 'Ativar estabelecimento?'} description={status === 'ACTIVE' ? 'Ele ficará indisponível para novos carrinhos. Pedidos existentes serão preservados.' : 'Ele ficará disponível conforme as regras da empresa.'} confirmLabel={status === 'ACTIVE' ? 'Desativar estabelecimento' : 'Ativar estabelecimento'} destructive={status === 'ACTIVE'} busy={loading} onCancel={() => setConfirmOpen(false)} onConfirm={() => void change()} />{error && <p className={styles.feedback} role='alert'>{error}</p>}{success && <p className={styles.success} role='status'>{success}</p>}</div>;
}
