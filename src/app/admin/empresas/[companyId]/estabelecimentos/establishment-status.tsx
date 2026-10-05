'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeEstablishmentStatus } from '@/modules/admin/admin-status.actions';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import styles from '../../../admin.module.css';

export function EstablishmentStatus({ id, initialStatus, compact = false }: { id: string; initialStatus: string; compact?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function change() {
    const next = status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await changeEstablishmentStatus(id, next);
      if (!result.ok) setError(result.message);
      else {
        setStatus(next);
        setConfirmOpen(false);
        setSuccess(next === 'ACTIVE' ? 'Estabelecimento ativado.' : 'Estabelecimento desativado.');
        router.refresh();
      }
    } catch {
      setError('Não foi possível atualizar o estabelecimento.');
    } finally {
      setLoading(false);
    }
  }

  const actionLabel = status === 'ACTIVE' ? 'Desativar' : 'Ativar';
  const actionDescription = status === 'ACTIVE'
    ? 'Ele ficará indisponível para novos carrinhos. Pedidos existentes serão preservados.'
    : 'Ele ficará disponível conforme as regras da empresa.';

  return (
    <div className={compact ? styles.compactStatus : undefined}>
      {!compact && (
        <p>
          Status: <Badge tone={status === 'ACTIVE' ? 'success' : 'default'}>{status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge>
        </p>
      )}
      <Button
        type="button"
        variant={status === 'ACTIVE' ? 'destructive' : 'secondary'}
        className={compact ? styles.iconAction : undefined}
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        aria-label={`${actionLabel} estabelecimento`}
        title={`${actionLabel} estabelecimento`}
      >
        {compact ? (
          <>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {status === 'ACTIVE' ? <path d="M12 3v9m5.66-6.66a8 8 0 1 1-11.32 0M5 21h14" /> : <path d="M12 3v9m-4.24 6.24a8 8 0 1 0 8.48 0M5 21h14" />}
            </svg>
            <span className={styles.visuallyHidden}>{loading ? 'Atualizando…' : actionLabel}</span>
          </>
        ) : loading ? 'Atualizando…' : actionLabel}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        title={`${actionLabel} estabelecimento?`}
        description={actionDescription}
        confirmLabel={`${actionLabel} estabelecimento`}
        destructive={status === 'ACTIVE'}
        busy={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void change()}
      />
      {error && <p className={styles.feedback} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
    </div>
  );
}
