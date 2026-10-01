import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', request.url));
  const { data: profile } = await supabase.from('profiles').select('role,status').eq('id', user.id).maybeSingle();
  if (profile?.status !== 'ACTIVE') return NextResponse.redirect(new URL('/acesso-negado', request.url));
  const destination = profile.role === 'DRIVER' ? '/operacao/entregas' : profile.role === 'INTERNAL_OPERATOR' ? '/operacao/pedidos' : profile.role === 'PLATFORM_ADMIN' ? '/admin/empresas' : '/';
  return NextResponse.redirect(new URL(destination, request.url));
}
