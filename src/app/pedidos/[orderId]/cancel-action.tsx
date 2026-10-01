"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cancelOrder } from "@/modules/orders/order.actions";
import styles from "./cancel-action.module.css";

export function CancelOrderAction({ orderId }: { orderId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function open() {
    setReason("");
    setError("");
    dialogRef.current?.showModal();
    requestAnimationFrame(() => reasonRef.current?.focus());
  }

  function close() {
    if (!busy) dialogRef.current?.close();
  }

  function restoreFocus() {
    triggerRef.current?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await cancelOrder(orderId, reason);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return <>
    <Button ref={triggerRef} type="button" variant="destructive" onClick={open}>Cancelar pedido</Button>
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="cancel-order-title" aria-describedby="cancel-order-description" onClose={restoreFocus} onCancel={event => { if (busy) event.preventDefault(); }}>
      <form method="dialog" onSubmit={event => void submit(event)}>
        <h2 id="cancel-order-title">Cancelar pedido?</h2>
        <p id="cancel-order-description">Informe o motivo. Essa ação ficará registrada no histórico.</p>
        <label htmlFor="cancel-reason">Motivo</label>
        <textarea ref={reasonRef} id="cancel-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={500} required rows={4} disabled={busy} />
        {error && <p role="alert">{error}</p>}
        <div>
          <Button type="button" variant="secondary" onClick={close} disabled={busy}>Voltar</Button>
          <Button type="submit" variant="destructive" disabled={busy}>{busy ? "Cancelando…" : "Confirmar cancelamento"}</Button>
        </div>
      </form>
    </dialog>
  </>;
}
