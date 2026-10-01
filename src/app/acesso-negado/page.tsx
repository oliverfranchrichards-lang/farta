import Link from "next/link";
import { AuthCard, AuthShell, styles } from "../auth/auth-shell";

export default function AccessDeniedPage() {
  return <AuthShell><AuthCard><header className={styles.formHeader}><h2>Acesso restrito</h2><p>Esta área está disponível apenas para administradores da plataforma. Entre com uma conta autorizada ou solicite a liberação do perfil.</p></header><Link className={styles.submit} href="/">Voltar para o início</Link></AuthCard></AuthShell>;
}
