import { forwardRef, type ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";
export type ButtonVariant = "primary" | "accent" | "secondary" | "tertiary" | "destructive";
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(function Button({ variant = "primary", className, ...props }, ref) {
  return <button ref={ref} className={[styles.button, styles[variant], className].filter(Boolean).join(" ")} {...props} />;
});
