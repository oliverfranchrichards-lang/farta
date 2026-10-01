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
    if (open && !dialog.open) { openerRef.current = document.activeElement as HTMLElement | null; dialog.showModal(); }
    if (!open && dialog.open) { dialog.close(); openerRef.current?.focus(); }
  }, [open]);
  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { if (busy) event.preventDefault(); else onCancel(); }}>
    <h2 id={titleId}>{title}</h2>
    <p id={descriptionId}>{description}</p>
    <div className={styles.actions}><Button type='button' variant='secondary' onClick={onCancel} disabled={busy}>Cancelar</Button><Button type='button' variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Atualizando…' : confirmLabel}</Button></div>
  </dialog>;
}
