# Farta v1 — plano consolidado de implementação

**ROLE:** SOFTWARE-ARCHITECT  
**PHASE:** A audit consolidation  
**STATUS:** planning only; no implementation authorized yet.

## Princípios e gates

Preservar pedidos/snapshots; manter produto global e escopos privados; derivar empresa/role/assignment no servidor; usar slices verticais domain → data/RLS → backend → frontend/design QA → QA; usar transações, lock/version/idempotência; isolar providers externos. Gates: A0 auditoria; A1 decisões comerciais/estados; A2 modelo/migration/rollback; A3 RLS/Storage/provider; A4 Design QA; B0 preços; C0 análise/final/confirmação; D0 WhatsApp; J0 regressão/build.

## Slices por dependência

1. `PROD-PRICE-001` — decidir Unidade/Caixa, mínimo, preço aproximado e snapshots. Depende de A1–A3.
2. `ORDER-REVIEW-001` — estados explícitos, análise interna, preço final, confirmação final, idempotência e concorrência. Reserva somente após confirmação final; só liberar picking após C0.
3. `PROFILE-WHATSAPP-001` — reutilizar `profiles.phone` como contato; mensagens serão manuais e não haverá API/provider nesta V1.
4. `CATALOG-GLOBAL-001` — preservar products globais e prices/inventory/orders privados; detectar duplicatas, não auto-consolidar.
5. `ADMIN-PRODUCTS-001` — CRUD autorizado de produtos/categorias/imagens via Design System e Storage seguro.
6. `ORDER-DETAILS-001` — DTOs completos para operador, mínimos para driver, endereço snapshot e exportação preservada.
7. `BANNERS-001` — modelo somente ACTIVE/INACTIVE, Storage e carrossel acessível (~8 s, manual, teclado/touch, reduced motion).
8. `CHAT-001` — modelo e matriz de participantes aprovados, RLS por participante, estados UI e realtime simples se adequado.
9. `QA-REGRESSION-001` — E2E, RLS negatives, lint, typecheck, build, acessibilidade e regressão de login/catalogo/carrinho/operação.

## Contratos antes de migration

Decisões aprovadas: mínimo por SKU, reserva após confirmação final, customer vê pedidos da própria empresa, WhatsApp manual, banners ACTIVE/INACTIVE. Restam contrato técnico Unidade/Caixa e matriz/lifecycle do chat. Nenhuma migration deve preceder Domain + Database + Security review.

## Rollback

Migrations aditivas, backfill reversível e feature flag; manter status/colunas antigas legíveis; não remover `prices.company_id`; versionar RPCs; side effects de notificação/upload idempotentes.

## Definition of Done operacional

Cada handoff contém `TASK_ID`, `STATUS`, `SUMMARY`, `DECISIONS`, `FILES_CHANGED`, `SCHEMA_CHANGED`, `MIGRATIONS`, `SECURITY_IMPACT`, `TESTS_EXECUTED`, `TEST_RESULTS`, `RISKS`, `OPEN_ISSUES`, `NEXT_DEPENDENCY`. Não declarar PASS sem rodar gates.

## Bloqueadores atuais

Contrato técnico Unidade/Caixa; estados/preço final; matriz/lifecycle do chat. A slice `PROD-PRICE-001` pode iniciar após aprovação do contrato de dados.