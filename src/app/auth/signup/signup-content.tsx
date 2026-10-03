'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithGoogle, signUp } from '@/modules/auth/auth.actions';
import { AuthCard, AuthShell, FieldError, PasswordField, styles } from '../auth-shell';

const TOKEN = /^[0-9a-f]{64}$/i;

export default function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invite = searchParams.get('invite');
  const inviteToken = invite && TOKEN.test(invite) ? invite : '';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED?.trim().toLowerCase() === 'true';

  useEffect(() => { if (error || message) noticeRef.current?.focus(); }, [error, message]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const input = inviteToken ? { fullName, email, password, inviteToken } : { fullName, email, password };
      const result = await signUp(input as Parameters<typeof signUp>[0]);
      if (!result.ok) { setError(result.message); return; }
      if (inviteToken && result.session) { router.push(`/auth/invite/accept?token=${encodeURIComponent(inviteToken)}`); router.refresh(); return; }
      setMessage(result.message ?? 'Cadastro recebido. Verifique seu e-mail para confirmar a conta.');
    } catch { setError('Não foi possível concluir o cadastro. Verifique os dados e tente novamente.'); }
    finally { setLoading(false); }
  }

  async function continueWithGoogle() {
    setError('');
    setMessage('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle(inviteToken || undefined);
      if (!result.ok) { setError(result.message); return; }
      window.location.assign(result.url);
    } catch { setError('Não foi possível iniciar o login com Google. Tente novamente.'); }
    finally { setGoogleLoading(false); }
  }

  const loginHref = inviteToken ? `/auth/login?invite=${encodeURIComponent(inviteToken)}` : '/auth/login';
  return <AuthShell><AuthCard>
    <header className={styles.formHeader}><h2>Criar conta</h2><p>{inviteToken ? 'Crie sua conta para continuar com o convite. O acesso só será concedido após a confirmação.' : 'Comece a organizar sua operação em um só lugar. O cadastro normal não concede acesso a uma empresa.'}</p></header>
    <form className={styles.form} onSubmit={submit} noValidate>
      {(error || message) && <div id="signup-feedback" ref={noticeRef} tabIndex={-1} className={`${styles.notice} ${error ? styles.noticeError : styles.noticeSuccess}`} role={error ? 'alert' : 'status'} aria-live="polite">{error || message}</div>}
      <div className={styles.field}><label htmlFor="full-name">Nome completo</label><input id="full-name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div>
      <div className={styles.field}><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      <PasswordField id="password" label="Senha" value={password} onChange={setPassword} autoComplete="new-password" describedBy="password-help signup-error" invalid={Boolean(error && password.length < 8)} /><span id="password-help" className={styles.fieldHint}>Use pelo menos 8 caracteres.</span>
      <div className={styles.field}><label htmlFor="confirm-password">Confirmar senha</label><input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} aria-invalid={Boolean(error && password !== confirm)} aria-describedby="signup-error" required /><FieldError>{error && password !== confirm ? error : undefined}</FieldError></div>
      <span id="signup-error" className={styles.fieldError}>{error}</span><button className={styles.submit} type="submit" disabled={loading || googleLoading || Boolean(message)}>{loading ? 'Criando conta…' : 'Criar conta'}</button>
    </form>
    <div className={styles.socialDivider} aria-hidden="true"><span>ou</span></div>
    <button className={googleEnabled ? styles.googleButton : styles.googleDisabled} type="button" onClick={continueWithGoogle} disabled={!googleEnabled || googleLoading || loading || Boolean(message)} aria-label={googleEnabled ? 'Continuar com Google' : 'Continuar com Google, indisponível no momento'}>{googleLoading ? 'Conectando…' : googleEnabled ? 'Continuar com Google' : 'Continuar com Google (em breve)'}</button>
    {!googleEnabled && <p className={styles.socialHint}>O login com Google ainda não está disponível.</p>}
    <p className={styles.footer}>Já tem uma conta? <Link className={styles.link} href={loginHref}>Entrar</Link></p>
  </AuthCard></AuthShell>;
}
