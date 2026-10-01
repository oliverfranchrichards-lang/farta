"use client";
import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/modules/auth/auth.actions";
import { AuthCard, AuthShell, styles } from "../auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setMessage(""); setLoading(true); const result = await requestPasswordReset(email); setLoading(false); if (result.ok) setMessage(result.message ?? "Se o e-mail estiver cadastrado, enviaremos as instruções."); else setError(result.message); }
  return <AuthShell><AuthCard><header className={styles.formHeader}><h2>Recuperar senha</h2><p>Informe seu e-mail e enviaremos um link para criar uma nova senha.</p></header><form className={styles.form} onSubmit={submit} noValidate>{(error || message) && <div className={`${styles.notice} ${error ? styles.noticeError : styles.noticeSuccess}`} role={error ? "alert" : "status"}>{error || message}</div>}<div className={styles.field}><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div><button className={styles.submit} type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar link de recuperação"}</button></form><p className={styles.footer}><Link className={styles.link} href="/auth/login">Voltar para entrar</Link></p></AuthCard></AuthShell>;
}
