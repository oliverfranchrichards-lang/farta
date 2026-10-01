import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import styles from "./auth.module.css";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-label="Sobre a Farta">
        <div className={styles.brandContent}>
          <Link className={styles.brand} href="/" aria-label="Farta, voltar ao início">
            <Image src="/farta-logo-light.png" alt="" width={144} height={144} priority />
          </Link>
          <p className={styles.eyebrow}>Operação em movimento</p>
          <h1>Controle para vender. Agilidade para entregar.</h1>
          <p className={styles.brandCopy}>Estoque, pedidos e entregas no mesmo fluxo operacional, com clareza para sua equipe decidir.</p>
          <p className={styles.signal}>Ambiente seguro para sua operação</p>
        </div>
      </section>
      <section className={styles.formPanel} aria-label="Autenticação">{children}</section>
    </main>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return <div className={styles.formCard}>{children}</div>;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  return children ? <span className={styles.fieldError}>{children}</span> : null;
}

export function PasswordField({ id, label, value, onChange, describedBy, autoComplete = "new-password", invalid = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; describedBy?: string;
  autoComplete?: "current-password" | "new-password"; invalid?: boolean;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className={styles.field}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className={styles.passwordControl}>
        <input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} value={value}
          onChange={event => onChange(event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} required />
        <button className={styles.passwordToggle} type="button" onClick={() => setVisible(current => !current)}
          aria-label={visible ? `Ocultar ${label.toLowerCase() || "senha"}` : `Mostrar ${label.toLowerCase() || "senha"}`} aria-pressed={visible}>
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}

export { styles };
