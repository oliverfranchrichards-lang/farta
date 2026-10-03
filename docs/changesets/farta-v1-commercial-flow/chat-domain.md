# CHAT-001 — contrato de domínio

**Status:** implementado para a V1 mínima.

## Escopo aprovado

- Conversas diretas entre participantes ativos com membership na mesma empresa.
- Exatamente dois participantes por conversa.
- Mensagens de texto append-only, de 1 a 4.000 caracteres.
- Estados de conversa `ACTIVE` e `CLOSED`; a V1 cria e consulta apenas conversas ativas.
- Sem grupos, anexos, edição, exclusão, realtime, notificações ou provider externo.

## Autorização

- O servidor valida o usuário ativo, a membership ativa e a empresa compartilhada.
- A conversa só é lida por um dos participantes ativos.
- O envio exige participação, conversa ativa e membership ativa.
- Criação repetida do mesmo par reutiliza a conversa ativa existente.
- `PLATFORM_ADMIN` não foi incluído como participante, pois o modelo atual não vincula esse perfil a uma empresa.

## Persistência

- `conversations` guarda empresa, criador, estado e timestamps.
- `conversation_participants` guarda os dois participantes e a empresa.
- `messages` guarda remetente, corpo e timestamp sem operação de update/delete.

## Handoff

Migrations `20261001001700_chat_direct_participants.sql` e `20261001001800_chat_membership_guards.sql` aplicadas e validadas com RLS e `supabase db lint --linked`.
