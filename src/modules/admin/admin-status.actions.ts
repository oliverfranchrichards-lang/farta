'use server';

import { createClient } from '@/lib/supabase/server';

export async function changeEstablishmentStatus(establishmentId: string, status: 'ACTIVE' | 'INACTIVE') {
  const { error } = await (await createClient()).rpc('admin_set_establishment_status', { p_establishment_id: establishmentId, p_status: status });
  if (error) {
    const message = error.message.includes('LAST_ACTIVE_ESTABLISHMENT')
      ? 'Mantenha pelo menos um estabelecimento ativo na empresa.'
      : error.message.includes('ACTIVE_CART_EXISTS')
        ? 'Há itens em carrinhos ativos neste estabelecimento. Resolva-os antes de desativar.'
        : 'Não foi possível atualizar o estabelecimento.';
    return { ok: false as const, message };
  }
  return { ok: true as const };
}
