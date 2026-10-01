import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "PLATFORM_ADMIN" || profile.status !== "ACTIVE") redirect("/acesso-negado?area=admin");
  return { user };
}

export async function requireCompanyOperator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('profiles').select('role,status,company_id').eq('id', user.id).maybeSingle();
  if (!profile || profile.status !== 'ACTIVE' || !['INTERNAL_OPERATOR', 'DRIVER'].includes(profile.role) || !profile.company_id) {
    redirect('/acesso-negado?area=operacao');
  }
  return { user, companyId: profile.company_id as string, role: profile.role as 'INTERNAL_OPERATOR' | 'DRIVER' };
}
