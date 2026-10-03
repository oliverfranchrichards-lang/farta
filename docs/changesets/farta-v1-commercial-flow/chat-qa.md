# CHAT-001 — implementação e QA

**Status:** implementação mínima concluída.

## Escopo

- Conversas diretas 1:1 entre participantes ativos da mesma empresa.
- Mensagens de texto append-only, limitadas a 4.000 caracteres.
- Participantes explícitos e autorização validada por RPC server-side.
- Sem grupos, anexos, edição, exclusão, realtime ou provider externo.

## Entregas

- Tabelas `conversations`, `conversation_participants` e `messages`.
- RLS de leitura restrita aos participantes ativos.
- RPCs para criar/reutilizar conversa, listar conversas, listar mensagens e enviar mensagem.
- Rotas `/mensagens` e `/mensagens/[conversationId]`.
- Navegação para clientes e operadores internos.
- Composer acessível com preservação do texto em caso de erro.

## Gates

- Migrations `20261001001700_chat_direct_participants.sql` e `20261001001800_chat_membership_guards.sql` aplicadas no Supabase remoto.
- `supabase db lint --linked`: `No schema errors found`.
- Migrations locais e remotas sincronizadas até `20261001001800`.
- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run lint`: aprovado sem warnings.
- `npm.cmd run build`: aprovado; rotas de mensagens geradas.

## Limitação

O smoke autenticado entre dois usuários ainda depende de contas de teste com membership ativa na mesma empresa; a autorização negativa está garantida por RLS e pelas validações dos RPCs.
