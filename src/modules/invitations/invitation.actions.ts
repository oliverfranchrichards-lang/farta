"use server";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN = /^[0-9a-f]{64}$/;

export type InvitationResult =
  | { ok: true; companyId: string; companyName: string }
  | { ok: false; message: string };

/**
 * Accepts an invitation using only the token and the authenticated identity.
 * Tenant, role, e-mail and membership are derived and verified by the RPC.
 */
export async function acceptCompanyInvitation(input: { token: string; fullName?: string }): Promise<InvitationResult> {
  if (!input || typeof input !== "object" || typeof input.token !== "string" || !TOKEN.test(input.token)) {
    return { ok: false, message: "Este convite não está disponível." };
  }
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  if (fullName && (fullName.length < 2 || fullName.length > 160)) {
    return { ok: false, message: "Informe um nome entre 2 e 160 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_company_invitation", {
    p_invitation_token: input.token,
    p_full_name: fullName || undefined,
  });
  if (error || !data?.[0]) {
    const code = error?.message.match(/(AUTHENTICATION_REQUIRED|PROFILE_ALREADY_LINKED|COMPANY_NOT_AVAILABLE|INVITATION_NOT_AVAILABLE|INVALID_FULL_NAME)/)?.[1];
    const messages: Record<string, string> = {
      AUTHENTICATION_REQUIRED: "Entre ou crie sua conta antes de aceitar o convite.",
      PROFILE_ALREADY_LINKED: "Esta conta já está vinculada a outra empresa.",
      COMPANY_NOT_AVAILABLE: "A empresa deste convite não está disponível.",
      INVITATION_NOT_AVAILABLE: "Este convite não está disponível.",
      INVALID_FULL_NAME: "Informe um nome válido para continuar.",
    };
    return { ok: false, message: (code && messages[code]) ?? "Não foi possível aceitar o convite." };
  }
  return { ok: true, companyId: data[0].company_id, companyName: data[0].company_name };
}

export type CreateInvitationResult =
  | { ok: true; invitationId: string; token: string; expiresAt: string }
  | { ok: false; message: string };

/**
 * Restricted by the database to PLATFORM_ADMIN. The raw token is returned
 * once so the future delivery service or administrative UI can form its link.
 */
export async function createCompanyInvitation(input: {
  companyId: string;
  email: string;
  role?: "CUSTOMER" | "INTERNAL_OPERATOR" | "DRIVER";
  expiresInDays?: number;
}): Promise<CreateInvitationResult> {
  if (!input || typeof input !== "object" || typeof input.companyId !== "string" || !UUID.test(input.companyId)) {
    return { ok: false, message: "Empresa inválida." };
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, message: "Informe um e-mail válido." };
  const expiresInDays = input.expiresInDays ?? 7;
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
    return { ok: false, message: "A validade deve estar entre 1 e 30 dias." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_company_invitation", {
    p_company_id: input.companyId,
    p_invited_email: email,
    p_invited_role: input.role ?? "CUSTOMER",
    p_expires_in: `${expiresInDays} days`,
  });
  if (error || !data?.[0]) {
    const code = error?.message.match(/(INVITATION_NOT_AUTHORIZED|COMPANY_NOT_AVAILABLE|INVALID_EMAIL|INVALID_EXPIRY|INVALID_INVITED_ROLE|INVITATION_ALREADY_PENDING)/)?.[1];
    const messages: Record<string, string> = {
      INVITATION_NOT_AUTHORIZED: "Você não tem permissão para convidar usuários.",
      COMPANY_NOT_AVAILABLE: "A empresa não está disponível para convites.",
      INVALID_EMAIL: "Informe um e-mail válido.",
      INVALID_EXPIRY: "A validade do convite é inválida.",
      INVALID_INVITED_ROLE: "O papel escolhido para o convite é inválido.",
      INVITATION_ALREADY_PENDING: "Já existe um convite pendente para este e-mail nesta empresa.",
    };
    return { ok: false, message: (code && messages[code]) ?? "Não foi possível criar o convite." };
  }
  return {
    ok: true,
    invitationId: data[0].invitation_id,
    token: data[0].invitation_token,
    expiresAt: data[0].expires_at,
  };
}
