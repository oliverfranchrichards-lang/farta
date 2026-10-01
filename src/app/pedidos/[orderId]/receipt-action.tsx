"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { confirmOrderReceipt } from "@/modules/orders/order.actions";

export function ReceiptAction({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function confirm() {
    setBusy(true);
    setMessage("");
    const result = await confirmOrderReceipt(orderId);
    if (!result.ok) {
      setMessage(result.message);
      setBusy(false);
      return;
    }
    window.location.reload();
  }
  return <div><Button type="button" onClick={() => void confirm()} disabled={busy}>{busy ? "Confirmando…" : "Confirmar recebimento"}</Button>{message && <p role="alert">{message}</p>}</div>;
}
