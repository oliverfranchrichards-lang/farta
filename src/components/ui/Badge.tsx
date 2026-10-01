import type { HTMLAttributes } from "react";
import styles from "./Badge.module.css";
export function Badge({ tone = "default", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "warning" | "info" | "error" }) { return <span className={[styles.badge, styles[tone], className].filter(Boolean).join(" ")} {...props} />; }
