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

export function GoogleMark() {
  return (
    <svg className={styles.googleMark} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.23c0-.76-.07-1.5-.22-2.2H12v4.16h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.84-1.7 2.9-4.2 2.9-7.35Z" />
      <path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.15-2.45c-.87.58-1.98.93-3.3.93-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.6Z" />
      <path fill="#FBBC05" d="M6.53 13.69a5.86 5.86 0 0 1 0-3.38V7.78H3.28a9.75 9.75 0 0 0 0 8.44l3.25-2.53Z" />
      <path fill="#EA4335" d="M12 6.28c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 3.36 14.62 2.4 12 2.4a9.74 9.74 0 0 0-8.72 5.38l3.25 2.53C7.3 8 9.46 6.28 12 6.28Z" />
    </svg>
  );
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
