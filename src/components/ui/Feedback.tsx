import type { ReactNode } from "react";
import styles from "./Feedback.module.css";

type FeedbackTone = "info" | "success" | "warning" | "error";

export function Alert({ tone = "info", title, children, action, className }: {
  tone?: FeedbackTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return <div className={[styles.alert, styles[tone], className].filter(Boolean).join(" ")} role={tone === "error" ? "alert" : "status"}>
    <div>{title && <strong>{title}</strong>}<div>{children}</div></div>
    {action && <div className={styles.action}>{action}</div>}
  </div>;
}

export function EmptyState({ title, children, action, className }: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return <div className={[styles.empty, className].filter(Boolean).join(" ")} role="status">
    <strong>{title}</strong>
    {children && <p>{children}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>;
}
