"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ESTABLISHMENT_COOKIE, resolveCustomerContext, type EstablishmentOption } from "./context.server";

export type CustomerContextResult =
  | { ok: true; establishments: EstablishmentOption[]; selected: EstablishmentOption | null }
  | { ok: false; message: string };

export async function getCustomerContext(): Promise<CustomerContextResult> {
  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, message: context.message };
  return { ok: true, establishments: context.establishments, selected: context.selected };
}

export async function selectCustomerEstablishment(establishmentId: string): Promise<{ ok: true; selected: EstablishmentOption } | { ok: false; message: string }> {
  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, message: context.message };
  const selected = context.establishments.find(item => item.id === establishmentId);
  if (!selected) return { ok: false, message: "Estabelecimento indisponível para esta conta." };
  (await cookies()).set(ESTABLISHMENT_COOKIE, selected.id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return { ok: true, selected };
}

export type AddressOption = {
  id: string; label: string; addressLine: string; addressNumber: string; addressComplement: string | null;
  district: string; city: string; state: string; postalCode: string; isDefault: boolean;
};

export async function listActiveAddresses(): Promise<{ ok: true; addresses: AddressOption[] } | { ok: false; addresses: []; message: string }> {
  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, addresses: [], message: context.message };
  if (!context.selected) return { ok: true, addresses: [] };
  const { data, error } = await supabase.from("addresses")
    .select("id, label, address_line, address_number, address_complement, district, city, state, postal_code, is_default")
    .eq("establishment_id", context.selected.id).eq("status", "ACTIVE")
    .order("is_default", { ascending: false }).order("created_at", { ascending: true });
  if (error) return { ok: false, addresses: [], message: "Não foi possível carregar os endereços." };
  return { ok: true, addresses: (data ?? []).map(item => ({
    id: item.id, label: item.label, addressLine: item.address_line, addressNumber: item.address_number,
    addressComplement: item.address_complement, district: item.district, city: item.city, state: item.state,
    postalCode: item.postal_code, isDefault: item.is_default,
  })) };
}

export type NewAddress = {
  label: string; addressLine: string; addressNumber: string; addressComplement: string;
  district: string; city: string; state: string; postalCode: string;
};

export async function createAddress(input: NewAddress): Promise<{ ok: true; addressId: string } | { ok: false; message: string; field?: keyof NewAddress }> {
  if (!input || typeof input !== "object") return { ok: false, message: "Informe os dados do endereço." };
  const required: { field: keyof NewAddress; label: string; max: number }[] = [
    { field: "label", label: "identificação do endereço", max: 80 },
    { field: "addressLine", label: "logradouro", max: 160 },
    { field: "addressNumber", label: "número", max: 20 },
    { field: "district", label: "bairro", max: 100 },
    { field: "city", label: "cidade", max: 100 },
  ];
  for (const { field, label, max } of required) {
    const value = typeof input[field] === "string" ? input[field].trim() : "";
    if (!value || value.length > max) return { ok: false, field, message: `Informe ${label} com até ${max} caracteres.` };
  }
  if (typeof input.addressComplement !== "string" || input.addressComplement.trim().length > 100) return { ok: false, field: "addressComplement", message: "O complemento deve ter até 100 caracteres." };
  const states = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
  const state = typeof input.state === "string" ? input.state.trim().toUpperCase() : "";
  if (!states.has(state)) return { ok: false, field: "state", message: "Selecione uma UF válida." };
  const postalDigits = typeof input.postalCode === "string" ? input.postalCode.replace(/\D/g, "") : "";
  if (postalDigits.length !== 8) return { ok: false, field: "postalCode", message: "Informe um CEP com 8 dígitos." };

  const supabase = await createClient();
  const context = await resolveCustomerContext(supabase);
  if (!context.ok) return { ok: false, message: context.message };
  if (!context.selected) return { ok: false, message: "Selecione um estabelecimento antes de cadastrar o endereço." };
  const { data, error } = await supabase.from("addresses").insert({
    establishment_id: context.selected.id,
    label: input.label.trim(), address_line: input.addressLine.trim(), address_number: input.addressNumber.trim(),
    address_complement: input.addressComplement.trim() || null, district: input.district.trim(),
    city: input.city.trim(), state, postal_code: `${postalDigits.slice(0, 5)}-${postalDigits.slice(5)}`,
  }).select("id").single();
  if (error || !data) return { ok: false, message: "Não foi possível salvar o endereço. Tente novamente." };
  return { ok: true, addressId: data.id };
}
