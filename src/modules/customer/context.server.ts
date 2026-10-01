import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const ESTABLISHMENT_COOKIE = "prostock-establishment";
export type EstablishmentOption = { id: string; name: string };

export async function resolveCustomerContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: profile, error: profileError } = await supabase.from("profiles").select("company_id, role, status").maybeSingle();
  if (profileError || !profile || profile.role !== "CUSTOMER" || profile.status !== "ACTIVE" || !profile.company_id) {
    return { ok: false as const, message: "Entre com uma conta de cliente para continuar." };
  }

  const { data: membership, error: membershipError } = await supabase.from("company_memberships")
    .select("id").eq("company_id", profile.company_id).eq("status", "ACTIVE").maybeSingle();
  if (membershipError || !membership) return { ok: false as const, message: "Seu acesso à empresa não está ativo." };

  const { data, error } = await supabase.from("establishments")
    .select("id, name").eq("company_id", profile.company_id).eq("status", "ACTIVE").order("created_at", { ascending: true });
  if (error) return { ok: false as const, message: "Não foi possível carregar os estabelecimentos." };

  const establishments: EstablishmentOption[] = data ?? [];
  const preferredId = (await cookies()).get(ESTABLISHMENT_COOKIE)?.value;
  const selected = establishments.find(item => item.id === preferredId) ?? establishments[0] ?? null;
  return { ok: true as const, companyId: profile.company_id, establishments, selected };
}
