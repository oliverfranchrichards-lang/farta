# PROFILE-WHATSAPP-001 — QA e segurança

**Status:** implementado e validado.

## Escopo

- `profiles.phone` continua sendo a única fonte do contato.
- O telefone é normalizado no servidor para o formato brasileiro sem símbolos.
- O contato manual abre `wa.me` em nova aba; não existe API, provider, webhook ou envio automático.
- O detalhe operacional retorna o contato somente depois da autorização server-side do pedido.
- O perfil autenticado pode manter ou remover o próprio telefone por RPC protegida.

## Verificações executadas

- `supabase db push --linked`: aprovado, migration `20261001001000_profile_whatsapp_contact.sql`.
- `supabase db lint --linked`: `No schema errors found`.
- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run lint`: aprovado.
- `npm.cmd run build`: aprovado; rota `/perfil` gerada.
- Teste transacional no Supabase: atualização temporária de telefone `(11) 99999-8888` resultou em `5511999998888` e o detalhe operacional retornou somente o contato autorizado; a transação foi revertida.
- Auditoria da função: metadata registra somente `phone_present`, nunca o número completo.

## Critérios de segurança

- O ID do pedido continua sujeito à validação de role, empresa e atribuição antes de retornar detalhes.
- Cliente de outra empresa e usuário sem permissão continuam recebendo `FORBIDDEN`/`ORDER_NOT_FOUND` sem telefone.
- Telefone ausente ou inválido não produz link externo.
- O link externo não contém mensagem, token, endereço, custo ou margem.
- O clique não altera pedido, status, estoque ou notificação.

## Pendências não incluídas

- Não há confirmação de que o WhatsApp recebeu ou enviou a mensagem.
- Não há histórico de conversa nem automação de notificações.
- A regra de contato permanece contextual à tela operacional autorizada.
