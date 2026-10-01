import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TOKEN = /^[0-9a-f]{64}$/i;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  if (!TOKEN.test(token)) return NextResponse.redirect(new URL('/auth/invite?error=invite', request.url));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/auth/login?invite=${encodeURIComponent(token)}`, request.url));
  const { data, error } = await supabase.rpc('accept_company_invitation', { p_invitation_token: token, p_full_name: undefined });
  if (error || !data?.[0]) {
    console.error('INVITATION_ACCEPT_FAILED', JSON.stringify({
      code: error?.code ?? null,
      message: error?.message ?? null,
      details: error?.details ?? null,
      hint: error?.hint ?? null,
      data: data ?? null,
    }));
    return NextResponse.redirect(new URL(`/auth/invite?token=${token}&error=invite`, request.url));
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const destination = profile?.role === 'DRIVER' ? '/operacao/entregas' : profile?.role === 'INTERNAL_OPERATOR' ? '/operacao/pedidos' : '/catalogo';
  return NextResponse.redirect(new URL(destination, request.url));
}
