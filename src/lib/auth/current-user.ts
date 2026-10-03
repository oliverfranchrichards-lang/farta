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

  let company: { display_name: string } | null = null;
  if (profile.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('display_name')
      .eq('id', profile.company_id)
      .maybeSingle();
    company = data;
  }

  return { user, profile, company };
}

export async function requireCustomerPage() {
  const current = await getCurrentUser();
  if (!current) redirect('/auth/login');
  if (current.profile.role !== 'CUSTOMER') redirect('/acesso-negado?area=cliente');
  return current;
}
