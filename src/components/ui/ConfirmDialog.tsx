'use client';

import { useEffect, useId, useRef } from 'react';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({ open, title, description, confirmLabel, destructive = false, busy, onCancel, onConfirm }: {
  open: boolean; title: string; description: string; confirmLabel: string; destructive?: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
      openerRef.current?.focus();
    }
  }, [open]);

  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { if (busy) event.preventDefault(); else onCancel(); }}>
    <button className={styles.close} type="button" aria-label="Fechar confirmação" onClick={onCancel} disabled={busy}>×</button>
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{description}</p>
    {destructive && <div className={styles.warning} role="note"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></svg><strong>Essa ação pode ser revertida depois.</strong></div>}
    <div className={styles.actions}><Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button><Button type="button" variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Atualizando…' : confirmLabel}</Button></div>
  </dialog>;
}
