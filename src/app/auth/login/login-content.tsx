'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { linkGoogleIdentity, signIn, signInWithGoogle } from '@/modules/auth/auth.actions';
import { AuthCard, AuthShell, GoogleMark, PasswordField, styles } from '../auth-shell';

const TOKEN = /^[0-9a-f]{64}$/i;

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get('invite');
  const inviteToken = invite && TOKEN.test(invite) ? invite : '';
  const linkGoogle = searchParams.get('link_google') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [field, setField] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED?.trim().toLowerCase() === 'true';
  const callbackError = searchParams.get('error') === 'auth_callback'
    ? 'Não foi possível confirmar o acesso. Solicite um novo link e tente novamente.'
    : searchParams.get('error') === 'google_cancelled'
      ? 'O login com Google foi cancelado.'
      : searchParams.get('error') === 'google_existing_account'
        ? 'Este e-mail já possui uma conta. Entre com sua senha para vincular o Google com segurança.'
        : '';
  const feedback = error || callbackError;

  useEffect(() => { if (feedback) noticeRef.current?.focus(); }, [feedback]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setField(undefined);
    setLoading(true);
    try {
      const result = await signIn({ email, password, inviteToken: inviteToken || undefined });
      if (!result.ok) { setError(result.message); setField(result.field); return; }
      if (linkGoogle) {
        const linkResult = await linkGoogleIdentity();
        if (!linkResult.ok) { setError(linkResult.message); return; }
        window.location.assign(linkResult.url);
        return;
      }
      router.push(inviteToken ? `/auth/invite/accept?token=${encodeURIComponent(inviteToken)}` : '/auth/after-login');
      router.refresh();
    } catch {
      setError('Não foi possível concluir o acesso. Verifique os dados e tente novamente.');
    } finally { setLoading(false); }
  }

  async function continueWithGoogle() {
    setError('');
    setField(undefined);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle(inviteToken || undefined);
      if (!result.ok) { setError(result.message); return; }
      window.location.assign(result.url);
    } catch {
      setError('Não foi possível iniciar o login com Google. Tente novamente.');
    } finally { setGoogleLoading(false); }
  }

  const signupHref = inviteToken ? `/auth/signup?invite=${encodeURIComponent(inviteToken)}` : '/auth/signup';
  return <AuthShell><AuthCard>
    <header className={styles.formHeader}><h2>Entrar na sua conta</h2><p>{inviteToken ? 'Entre para continuar com o convite recebido.' : 'Acesse a operação da sua empresa com seu e-mail e senha.'}</p></header>
    <button className={googleEnabled ? styles.googleButton : styles.googleDisabled} type="button" onClick={continueWithGoogle} disabled={!googleEnabled || googleLoading || loading} aria-label={googleEnabled ? 'Continuar com Google' : 'Continuar com Google, indisponível no momento'}><GoogleMark />{googleLoading ? 'Conectando…' : googleEnabled ? 'Continuar com Google' : 'Continuar com Google (em breve)'}</button>
    {!googleEnabled && <p className={styles.socialHint}>O login com Google ainda não está disponível.</p>}
    <form className={styles.form} onSubmit={submit} noValidate>
      {feedback && !field && <div id="login-error" ref={noticeRef} tabIndex={-1} className={`${styles.notice} ${styles.noticeError}`} role="alert" aria-live="assertive">{feedback}</div>}
      <div className={styles.field}><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={field === 'email'} aria-describedby={field === 'email' ? 'email-error' : feedback ? 'login-error' : undefined} required />{field === 'email' && <span id="email-error" className={styles.fieldError}>{error}</span>}</div>
      <div className={styles.passwordRow}><label htmlFor="password">Senha</label><Link className={styles.link} href="/auth/forgot-password">Esqueci minha senha</Link></div>
      <PasswordField id="password" label="" value={password} onChange={setPassword} autoComplete="current-password" invalid={field === 'password'} describedBy={field === 'password' ? 'password-error' : feedback ? 'login-error' : undefined} />
      {field === 'password' && <span id="password-error" className={styles.fieldError}>{error}</span>}
      <button className={styles.submit} type="submit" disabled={loading || googleLoading}>{loading ? 'Entrando…' : 'Entrar'}</button>
    </form>
    <p className={styles.footer}>Ainda não tem uma conta? <Link className={styles.link} href={signupHref}>Criar conta</Link></p>
  </AuthCard></AuthShell>;
}
