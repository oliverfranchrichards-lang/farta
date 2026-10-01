import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./Input.module.css";

type CommonProps = { label?: string; hint?: string; error?: string; className?: string };
type InputProps = CommonProps & (({ as?: "input" } & InputHTMLAttributes<HTMLInputElement>) | ({ as: "textarea" } & TextareaHTMLAttributes<HTMLTextAreaElement>));

export function Input(props: InputProps) {
  const { label, hint, error, id, className, as = "input", ...rest } = props;
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const controlClass = [styles.input, as === "textarea" ? styles.textarea : "", className].filter(Boolean).join(" ");
  const describedBy = { "aria-invalid": Boolean(error), "aria-describedby": messageId };
  return <label className={styles.field}>
    {label && <span className={styles.label}>{label}</span>}
    {as === "textarea" ? <textarea id={id} className={controlClass} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...describedBy} /> : <input id={id} className={controlClass} {...(rest as InputHTMLAttributes<HTMLInputElement>)} {...describedBy} />}
    {error ? <span id={`${id}-error`} className={styles.error}>{error}</span> : hint ? <span id={`${id}-hint`} className={styles.hint}>{hint}</span> : null}
  </label>;
}
