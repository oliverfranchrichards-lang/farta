import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, company_id, role, full_name, phone, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== 'ACTIVE') {
    return null;
  }

  return { user, profile };
}

export async function requireCustomerPage() {
  const current = await getCurrentUser();
  if (!current) redirect('/auth/login');
  if (current.profile.role !== 'CUSTOMER') redirect('/acesso-negado?area=cliente');
  return current;
}
