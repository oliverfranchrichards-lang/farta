"use client";

import { useRef } from "react";
import styles from "./CartItemControls.module.css";

type Props = {
  name: string;
  quantity: number;
  pending: boolean;
  disabled?: boolean;
  onChange: (quantity: number) => void;
  onRemove: () => void;
};

export function CartItemControls({ name, quantity, pending, disabled = false, onChange, onRemove }: Props) {
  const quantityInputRef = useRef<HTMLInputElement>(null);

  function commitQuantity(input: HTMLInputElement) {
    const nextQuantity = Number(input.value);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > 9999) {
      input.value = String(quantity);
      return;
    }
    input.value = String(nextQuantity);
    if (nextQuantity !== quantity) onChange(nextQuantity);
  }

  function stepQuantity(nextQuantity: number) {
    if (quantityInputRef.current) quantityInputRef.current.value = String(nextQuantity);
    onChange(nextQuantity);
  }

  return <div className={styles.controls}>
    <div className={styles.stepper} role="group" aria-label={`Quantidade de ${name}`}>
      <button type="button" disabled={pending || disabled || quantity <= 1} onClick={() => stepQuantity(quantity - 1)} aria-label={`Diminuir quantidade de ${name}`}>−</button>
      <input ref={quantityInputRef} className={styles.quantityInput} type="number" inputMode="numeric" min={1} max={9999} step={1} defaultValue={quantity}
        disabled={pending || disabled} aria-label={`Quantidade de ${name}`} onBlur={event => commitQuantity(event.currentTarget)}
        onKeyDown={event => {
          if (event.key === "Enter") { event.preventDefault(); commitQuantity(event.currentTarget); event.currentTarget.blur(); }
          if (event.key === "Escape") { event.currentTarget.value = String(quantity); event.currentTarget.blur(); }
        }} />
      <button type="button" disabled={pending || disabled} onClick={() => stepQuantity(quantity + 1)} aria-label={`Aumentar quantidade de ${name}`}>+</button>
    </div>
    <button className={styles.remove} type="button" disabled={pending || disabled} onClick={onRemove} aria-label={`Remover ${name} do pedido`}>Remover</button>
    {pending && <span className={styles.pending} role="status">Atualizando…</span>}
  </div>;
}
