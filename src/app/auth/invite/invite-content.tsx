'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthCard, AuthShell, styles } from '../auth-shell';

const TOKEN = /^[0-9a-f]{64}$/i;

export default function InviteContent() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get('token') ?? '';
  const token = TOKEN.test(rawToken) ? rawToken : '';
  const hasError = searchParams.get('error') === 'invite';
  const isAvailable = Boolean(token) && !hasError;
  const loginHref = token ? `/auth/login?invite=${encodeURIComponent(token)}` : '/auth/login';
  const signupHref = token ? `/auth/signup?invite=${encodeURIComponent(token)}` : '/auth/signup';

  return <AuthShell><AuthCard>
    <header className={styles.formHeader}>
      <h2>{isAvailable ? 'Convite para entrar' : 'Convite indisponível'}</h2>
      <p>{isAvailable ? 'Você recebeu um convite para acessar a Farta. Entre ou crie sua conta para continuar.' : 'Este convite não está disponível. Solicite um novo link ao responsável pelo convite.'}</p>
    </header>
    {isAvailable ? <div className={styles.form}>
      <Link className={styles.submit} href={loginHref}>Entrar e continuar</Link>
      <Link className={styles.link} href={signupHref}>Ainda não tenho conta</Link>
    </div> : <Link className={styles.submit} href="/auth/login">Ir para entrar</Link>}
  </AuthCard></AuthShell>;
}
