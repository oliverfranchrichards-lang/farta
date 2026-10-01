"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCompany(companyId: string) {
  const { data, error } = await (await createClient()).rpc('admin_get_company', { p_company_id: companyId });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) return { ok: false as const, message: 'Empresa não encontrada ou acesso não autorizado.' };
  return { ok: true as const, company: data as Record<string, unknown> };
}

export async function listCompanies() {
  const { data, error } = await (await createClient()).rpc("admin_list_companies");
  if (error) return { ok: false as const, message: "Não foi possível carregar as empresas." };
  return { ok: true as const, companies: data ?? [] };
}

export async function listEstablishments(companyId: string) {
  const { data, error } = await (await createClient()).rpc("admin_list_establishments", { p_company_id: companyId });
  if (error) return { ok: false as const, message: "Não foi possível carregar os estabelecimentos." };
  return { ok: true as const, establishments: data ?? [] };
}

export async function listCompanyInvitations(companyId: string) {
  const { data, error } = await (await createClient()).rpc("admin_list_company_invitations", { p_company_id: companyId });
  if (error) return { ok: false as const, message: "Não foi possível carregar os convites." };
  return { ok: true as const, invitations: data ?? [] };
}

export async function revokeCompanyInvitation(invitationId: string) {
  const { error } = await (await createClient()).rpc("revoke_company_invitation", { p_invitation_id: invitationId });
  if (error) return { ok: false as const, message: "Não foi possível revogar o convite." };
  return { ok: true as const };
}

export async function updateCompany(companyId: string, data: Record<string, string | number>) {
  const { data: result, error } = await (await createClient()).rpc("admin_update_company", { p_company_id: companyId, p_data: data });
  if (error || !result?.[0]) return { ok: false as const, message: "Não foi possível atualizar a empresa." };
  return { ok: true as const, company: result[0] };
}

export async function setEstablishmentStatus(establishmentId: string, status: "ACTIVE" | "INACTIVE") {
  const { error } = await (await createClient()).rpc("admin_set_establishment_status", { p_establishment_id: establishmentId, p_status: status });
  if (error) return { ok: false as const, message: "Não foi possível atualizar o estabelecimento." };
  return { ok: true as const };
}

export async function setCompanyStatus(companyId: string, status: 'ACTIVE' | 'INACTIVE') {
  const { error } = await (await createClient()).rpc('admin_set_company_status', { p_company_id: companyId, p_status: status });
  if (error) return { ok: false as const, message: 'Não foi possível atualizar o status da empresa.' };
  return { ok: true as const };
}

export type AdminOrder = { id: string; order_number: number; company_id: string; company_name: string; establishment_name: string; created_at: string; status: string; total_minor: number; units: number; delivery_window: string };

export type CompanyOrderDetails = {
  id: string; orderNumber: number; companyId: string; companyName: string; establishmentName: string;
  status: string; createdAt: string; confirmedWindow: Record<string, unknown> | null; requestedWindow: Record<string, unknown> | null;
  address: Record<string, unknown>; subtotalMinor: number; deliveryFeeMinor: number; totalMinor: number;
  items: Array<{ id: string; skuId: string; skuCode: string | null; productName: string; brand: string | null; variantName: string; unit: string; quantity: number; unitPriceMinor: number; subtotalMinor: number }>;
  history: Array<{ fromStatus: string | null; toStatus: string; changedAt: string; reason: string | null }>;
};

export async function getCompanyOrderDetails(orderId: string) {
  const { data, error } = await (await createClient()).rpc('company_get_order_details', { p_order_id: orderId });
  if (error) {
    console.error('COMPANY_ORDER_DETAILS_FAILED', JSON.stringify({ code: error.code, message: error.message, orderId }));
    const message = error.message.includes('ORDER_NOT_FOUND') ? 'Pedido não encontrado.' : error.message.includes('FORBIDDEN') ? 'Você não tem acesso a este pedido.' : 'Não foi possível carregar os detalhes do pedido.';
    return { ok: false as const, message };
  }
  return { ok: true as const, order: data as unknown as CompanyOrderDetails };
}

export async function listAdminOrders(status?: string) {
  const { data, error } = await (await createClient()).rpc('admin_list_orders', { p_status: status || undefined });
  if (error) return { ok: false as const, message: 'Não foi possível carregar a fila de pedidos.', orders: [] as AdminOrder[] };
  return { ok: true as const, orders: (data ?? []) as AdminOrder[] };
}

export async function startOrderPicking(orderId: string) {
  const { error } = await (await createClient()).rpc('admin_start_order_picking', { p_order_id: orderId });
  if (error) return { ok: false as const, message: error.message.includes('INVALID_ORDER_TRANSITION') ? 'Este pedido não está mais aguardando separação.' : 'Não foi possível iniciar a separação.' };
  return { ok: true as const };
}

export async function listCompanyOrders(status?: string) {
  const { data, error } = await (await createClient()).rpc('company_list_orders', { p_status: status || undefined });
  if (error) return { ok: false as const, message: 'Não foi possível carregar a fila de pedidos.', orders: [] as AdminOrder[] };
  return { ok: true as const, orders: (data ?? []) as AdminOrder[] };
}

export type CompanyDriver = { id: string; full_name: string };

export async function listCompanyDrivers() {
  const { data, error } = await (await createClient()).rpc('company_list_drivers');
  if (error) return { ok: false as const, message: 'Não foi possível carregar os entregadores.', drivers: [] as CompanyDriver[] };
  return { ok: true as const, drivers: (data ?? []) as CompanyDriver[] };
}

export async function assignCompanyOrderDriver(orderId: string, driverProfileId: string) {
  const { error } = await (await createClient()).rpc('company_assign_order_driver', {
    p_order_id: orderId,
    p_driver_profile_id: driverProfileId,
  });
  if (error) {
    const message = error.message.includes('DRIVER_NOT_AVAILABLE')
      ? 'O entregador selecionado não está disponível.'
      : error.message.includes('DELIVERY_ALREADY_ASSIGNED')
        ? 'Este pedido já possui um entregador atribuído.'
        : 'Não foi possível atribuir o entregador.';
    return { ok: false as const, message };
  }
  return { ok: true as const };
}

export async function startCompanyOrderPicking(orderId: string) {
  const { error } = await (await createClient()).rpc('company_start_order_picking', { p_order_id: orderId });
  if (error) console.error('ORDER_PICKING_START_FAILED', JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint, orderId }));
  if (error) return { ok: false as const, message: error.message.includes('INVALID_ORDER_TRANSITION') ? 'Este pedido não está mais aguardando separação.' : 'Não foi possível iniciar a separação.' };
  return { ok: true as const };
}

export type OrderNextStatus = 'PICKING' | 'READY_FOR_DISPATCH' | 'DISPATCHED' | 'DELIVERED' | 'RECEIPT_CONFIRMED';

export async function advanceOrderStatus(orderId: string, toStatus: OrderNextStatus) {
  const { error } = await (await createClient()).rpc('advance_order_status', { p_order_id: orderId, p_to_status: toStatus });
  if (error) {
    console.error('ORDER_STATUS_ADVANCE_FAILED', JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint, orderId, toStatus }));
    return { ok: false as const, message: error.message.includes('INVALID_ORDER_TRANSITION') ? 'Essa transição não está disponível para o seu perfil.' : 'Não foi possível atualizar o pedido.' };
  }
  return { ok: true as const };
}

type CompanyInput = {
  legalName: string; displayName: string; taxId: string; stateRegistration?: string;
  corporateEmail: string; corporatePhone?: string; fiscalAddressLine: string; fiscalAddressNumber: string;
  fiscalAddressComplement?: string; fiscalDistrict: string; fiscalCity: string; fiscalState: string;
  fiscalPostalCode: string; legalRepresentativeName: string; legalRepresentativeEmail: string;
  legalRepresentativePhone?: string; operationalContactName: string; operationalContactEmail: string;
  operationalContactPhone?: string; paymentTermsDays?: number; creditLimitMinor?: number;
};

export async function createCompany(input: CompanyInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_company", {
    p_company: {
      legal_name: input.legalName, display_name: input.displayName, tax_id: input.taxId,
      state_registration: input.stateRegistration, corporate_email: input.corporateEmail,
      corporate_phone: input.corporatePhone, fiscal_address_line: input.fiscalAddressLine,
      fiscal_address_number: input.fiscalAddressNumber, fiscal_address_complement: input.fiscalAddressComplement,
      fiscal_district: input.fiscalDistrict, fiscal_city: input.fiscalCity, fiscal_state: input.fiscalState,
      fiscal_postal_code: input.fiscalPostalCode, legal_representative_name: input.legalRepresentativeName,
      legal_representative_email: input.legalRepresentativeEmail, legal_representative_phone: input.legalRepresentativePhone,
      operational_contact_name: input.operationalContactName, operational_contact_email: input.operationalContactEmail,
      operational_contact_phone: input.operationalContactPhone, payment_terms_days: input.paymentTermsDays ?? 0,
      credit_limit_minor: input.creditLimitMinor ?? 0,
    },
  });
  if (error || !data?.[0]) return { ok: false as const, message: "Não foi possível cadastrar a empresa." };
  return { ok: true as const, company: data[0] };
}

export async function createEstablishment(input: {
  companyId: string; name: string; address: {
    label: string; addressLine: string; addressNumber: string; addressComplement?: string;
    district: string; city: string; state: string; postalCode: string;
  };
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_establishment", {
    p_company_id: input.companyId, p_name: input.name,
    p_address: { label: input.address.label, address_line: input.address.addressLine, address_number: input.address.addressNumber,
      address_complement: input.address.addressComplement, district: input.address.district, city: input.address.city,
      state: input.address.state, postal_code: input.address.postalCode },
  });
  if (error || !data?.[0]) return { ok: false as const, message: "Não foi possível cadastrar o estabelecimento." };
  return { ok: true as const, establishment: data[0] };
}
