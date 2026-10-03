'use server';

import { createClient } from '@/lib/supabase/server';
import { getSiteUrl, isGoogleAuthEnabled } from '@/lib/supabase/env';

type AuthResult =
  | { ok: true; message?: string; session?: boolean }
  | { ok: false; message: string; field?: 'email' | 'password' };

type OAuthResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

const GENERIC_AUTH_ERROR = 'Não foi possível concluir a operação. Verifique os dados e tente novamente.';

function validateCredentials(email: string, password?: string): AuthResult | null {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { ok: false, message: 'Informe um e-mail válido.', field: 'email' };
  if (password !== undefined && password.length < 8) return { ok: false, message: 'A senha deve ter pelo menos 8 caracteres.', field: 'password' };
  return null;
}

export async function signIn(input: { email: string; password: string; inviteToken?: string }): Promise<AuthResult> {
  const validation = validateCredentials(input.email, input.password);
  if (validation) return validation;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: input.email.trim().toLowerCase(), password: input.password });
  if (error) return { ok: false, message: GENERIC_AUTH_ERROR };
  return { ok: true };
}

export async function signInWithGoogle(inviteToken?: string): Promise<OAuthResult> {
  if (!isGoogleAuthEnabled()) return { ok: false, message: 'O login com Google ainda não está disponível.' };
  const normalizedInvite = typeof inviteToken === 'string' ? inviteToken : '';
  if (normalizedInvite && !/^[0-9a-f]{64}$/i.test(normalizedInvite)) {
    return { ok: false, message: 'Não foi possível iniciar este convite.' };
  }
  const supabase = await createClient();
  const callbackUrl = new URL('/auth/callback', getSiteUrl());
  callbackUrl.searchParams.set('provider', 'google');
  if (normalizedInvite) callbackUrl.searchParams.set('invite', normalizedInvite);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl.toString(), queryParams: { access_type: 'offline', prompt: 'select_account' } },
  });
  if (error || !data.url) {
    console.error('AUTH_GOOGLE_START_FAILED', JSON.stringify({ code: error?.code, message: error?.message, status: error?.status }));
    return { ok: false, message: 'Não foi possível iniciar o login com Google. Tente novamente.' };
  }
  return { ok: true, url: data.url };
}

export async function linkGoogleIdentity(): Promise<OAuthResult> {
  if (!isGoogleAuthEnabled()) return { ok: false, message: 'O login com Google ainda não está disponível.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Entre com e-mail e senha antes de vincular o Google.' };
  const callbackUrl = new URL('/auth/callback', getSiteUrl());
  callbackUrl.searchParams.set('provider', 'google');
  callbackUrl.searchParams.set('link', '1');
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: callbackUrl.toString(), queryParams: { access_type: 'offline', prompt: 'select_account' } },
  });
  if (error || !data.url) {
    console.error('AUTH_GOOGLE_LINK_START_FAILED', JSON.stringify({ code: error?.code, message: error?.message, status: error?.status }));
    return { ok: false, message: 'Não foi possível vincular o Google a esta conta. Tente novamente.' };
  }
  return { ok: true, url: data.url };
}

export async function signUp(input: { fullName: string; email: string; password: string; inviteToken?: string }): Promise<AuthResult> {
  if (input.fullName.trim().length < 2) return { ok: false, message: 'Informe seu nome completo.' };
  const validation = validateCredentials(input.email, input.password);
  if (validation) return validation;
  const inviteToken = typeof input.inviteToken === 'string' ? input.inviteToken : '';
  if (inviteToken && !/^[0-9a-f]{64}$/.test(inviteToken)) return { ok: false, message: 'Não foi possível iniciar este convite.' };
  const supabase = await createClient();
  const siteUrl = getSiteUrl();
  const callbackUrl = new URL('/auth/callback', siteUrl);
  if (inviteToken) callbackUrl.searchParams.set('invite', inviteToken);
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(), password: input.password,
    options: { emailRedirectTo: callbackUrl.toString(), data: { full_name: input.fullName.trim() } },
  });
  if (error) {
    console.error('AUTH_SIGNUP_FAILED', JSON.stringify({ code: error.code, message: error.message, status: error.status }));
    if (error.code === 'over_email_send_rate_limit') return { ok: false, message: 'O limite de envio de e-mails foi atingido. Aguarde alguns minutos e tente novamente.' };
    if (error.code === 'user_already_exists') return { ok: false, message: 'Este e-mail já possui uma conta. Tente entrar.' };
    return { ok: false, message: GENERIC_AUTH_ERROR };
  }
  return { ok: true, session: Boolean(data.session), message: data.session ? 'Cadastro concluído.' : 'Cadastro recebido. Verifique seu e-mail para confirmar a conta.' };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const validation = validateCredentials(email);
  if (validation) return validation;
  const supabase = await createClient();
  const siteUrl = getSiteUrl();
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${siteUrl}/auth/reset-password` });
  return { ok: true, message: 'Se o e-mail estiver cadastrado, enviaremos as instruções.' };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  if (password.length < 8) return { ok: false, message: 'A senha deve ter pelo menos 8 caracteres.', field: 'password' };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { ok: false, message: GENERIC_AUTH_ERROR } : { ok: true, message: 'Senha atualizada. Você já pode entrar.' };
}

export async function updateMyPhone(phone: string): Promise<AuthResult> {
  const value = phone.trim();
  const digits = value.replace(/\D/g, '');
  if (digits && !((digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) || digits.length === 10 || digits.length === 11)) {
    return { ok: false, message: 'Informe um telefone brasileiro válido ou deixe o campo vazio.' };
  }
  const { error } = await (await createClient()).rpc('update_my_profile_phone', { p_phone: value });
  if (error) {
    if (error.message.includes('INVALID_PHONE')) return { ok: false, message: 'Informe um telefone brasileiro válido ou deixe o campo vazio.' };
    if (error.message.includes('FORBIDDEN')) return { ok: false, message: 'Seu perfil não pode atualizar este contato.' };
    return { ok: false, message: GENERIC_AUTH_ERROR };
  }
  return { ok: true, message: digits ? 'Telefone atualizado.' : 'Telefone removido do perfil.' };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  return error ? { ok: false, message: GENERIC_AUTH_ERROR } : { ok: true };
}
