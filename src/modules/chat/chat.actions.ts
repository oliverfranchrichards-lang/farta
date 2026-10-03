"use server";

import { createClient } from '@/lib/supabase/server';

export type ConversationSummary = {
  id: string;
  company_id: string;
  status: string;
  peer_profile_id: string;
  peer_name: string;
  peer_role: string;
  last_message: string | null;
  last_message_at: string | null;
};

export type ChatMessage = {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
};

function chatError(error: { message?: string } | null | undefined, fallback: string) {
  const code = error?.message?.match(/(FORBIDDEN|INVALID_MESSAGE)/)?.[1];
  return code === 'FORBIDDEN' ? 'Esta conversa não está disponível para o seu perfil.' : code === 'INVALID_MESSAGE' ? 'Escreva uma mensagem de até 4.000 caracteres.' : fallback;
}

export async function listDirectConversations() {
  const { data, error } = await (await createClient()).rpc('list_direct_conversations');
  if (error) return { ok: false as const, conversations: [] as ConversationSummary[], message: chatError(error, 'Não foi possível carregar as mensagens.') };
  return { ok: true as const, conversations: (data ?? []) as ConversationSummary[] };
}

export async function listDirectMessages(conversationId: string) {
  const { data, error } = await (await createClient()).rpc('list_direct_messages', { p_conversation_id: conversationId });
  if (error) return { ok: false as const, messages: [] as ChatMessage[], message: chatError(error, 'Não foi possível carregar esta conversa.') };
  return { ok: true as const, messages: (data ?? []) as ChatMessage[] };
}

export async function sendDirectMessage(conversationId: string, body: string) {
  const { data, error } = await (await createClient()).rpc('send_direct_message', { p_conversation_id: conversationId, p_body: body });
  if (error) return { ok: false as const, message: chatError(error, 'Não foi possível enviar a mensagem. Tente novamente.') };
  return { ok: true as const, message: data as ChatMessage };
}

export async function createDirectConversation(peerProfileId: string) {
  const { data, error } = await (await createClient()).rpc('create_direct_conversation', { p_peer_profile_id: peerProfileId });
  if (error) return { ok: false as const, message: chatError(error, 'Não foi possível iniciar esta conversa.') };
  return { ok: true as const, conversation: data };
}
