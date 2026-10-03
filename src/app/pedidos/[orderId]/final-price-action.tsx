"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { confirmFinalOrderPrice } from "@/modules/orders/order.actions";

export function FinalPriceAction({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function confirm() {
    setBusy(true);
    setMessage("");
    const result = await confirmFinalOrderPrice(orderId);
    if (!result.ok) {
      setMessage(result.message);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return <div><p>Os preços foram revisados pela equipe. Confirme para reservar o estoque e iniciar o atendimento.</p><Button type="button" onClick={() => void confirm()} disabled={busy}>{busy ? "Confirmando…" : "Confirmar preços e pedido"}</Button>{message && <p role="alert">{message}</p>}</div>;
}
