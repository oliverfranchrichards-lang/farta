import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export function PageHeader({ eyebrow, title, description, actions, className }: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return <header className={[styles.header, className].filter(Boolean).join(" ")}>
    <div className={styles.copy}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>;
}
