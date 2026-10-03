# Farta v1 — impacto de segurança e RLS

**TASK_ID:** SECURITY-AUDIT-001  
**STATUS:** PASS WITH REQUIRED HARDENING  
**Escopo:** somente leitura; nenhum código/schema alterado.

## Achados

A fronteira multi-tenant atual usa `company_id`, memberships ativas, RLS e RPCs server-side. Products/variants/imagens ativos são globais; prices, carts, orders, items, histórico e entregas são company-scoped. `profiles.phone` existe. Não há chat, banners ou provider WhatsApp funcional.

## Controles obrigatórios

- Mutations de preço/status usam RPC/action com `auth.uid()`, role, membership, status esperado, `search_path` fixo e grants mínimos.
- UUID/orderId na URL nunca autoriza: sessão + ownership/role/company são obrigatórios.
- Cliente pode acessar todos os pedidos da própria empresa conforme decisão aprovada; operador acessa sua empresa; driver somente entrega atribuída e DTO mínimo.
- Catálogo global não pode globalizar preços, custos, margens, inventário, pedidos ou audit logs.
- Chat futuro autoriza por participante/role e valida `sender_profile_id = auth.uid()`; não confiar só em `conversation_id`.
- Storage de imagens/banners valida MIME, tamanho, path, bucket e papel; não usar service-role no browser.
- WhatsApp passa por serviço interno; tokens, telefones e secrets não devem aparecer em logs.

## DECISION_REQUIRED — bloqueadores

1. Ownership de pedidos: **RESOLVIDO** — customer pode ver todos os pedidos da própria empresa; manter isolamento entre empresas.
2. Chat: iniciador, participantes, 1:1 ou grupo, vínculo com pedido, retenção e visibilidade de staff.
3. Provider WhatsApp: **RESOLVIDO PARA V1** — mensagens manuais, sem API/provider.

## Testes negativos

Cliente A consulta pedido de B; anônimo/ID manipulado; operador inicia picking de B; driver acessa entrega não atribuída; A lê price/inventory/audit de B; customer tenta editar produto; inativos/revogados; Storage MIME/tamanho/path inválidos; chat não participante/spoof; replay de confirmação/picking. Resultado esperado: zero dados/erro de autorização e no máximo uma transição auditada.

## Handoff

**SCHEMA_CHANGED/MIGRATIONS:** nenhum. **TESTS_EXECUTED:** inspeção de RLS, grants, RPCs e DTOs. **RISKS:** IDOR, DTO amplo, policy permissiva, Storage enumeration, logs sensíveis. **NEXT_DEPENDENCY:** resolver decisões e revisar cada migration antes de implementação.