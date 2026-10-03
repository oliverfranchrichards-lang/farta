# PROD-PRICE-001 — handoff da implementação

**TASK_ID:** PROD-PRICE-001  
**STATUS:** IMPLEMENTED — aguardando QA autenticado do catálogo  
**SUMMARY:** mínimo por SKU persistido e validado no servidor; catálogo/carrinho exibem unidade, mínimo e preço aproximado; Unidade/Caixa permanecem SKUs independentes.

## DECISIONS

- `minimum_quantity` em `product_variants` por SKU, backfill 1.
- `minimum_quantity_snapshot` em `order_items`.
- `prices.amount_minor` continua preço aproximado por empresa/SKU; sem `price_type` nesta slice.
- WhatsApp manual; banners ACTIVE/INACTIVE; reserva após confirmação final será implementada em ORDER-REVIEW.

## FILES_CHANGED

- `supabase/migrations/20261001000100_product_price_contract.sql`
- `src/lib/supabase/database.types.ts`
- `src/modules/orders/order.actions.ts`
- `src/app/catalogo/page.tsx`
- `src/app/catalogo/catalogo.module.css`

## SCHEMA_CHANGED / MIGRATIONS

Migration aplicada no Supabase remoto: `20261001000100_product_price_contract.sql`. Verificação remota: 52 variantes, mínimo atual 1; 22 order_items com snapshot.

## SECURITY_IMPACT

RPCs `add_to_establishment_cart` e `set_active_cart_item_quantity` validam SKU/produto ativo, membership, preço vigente e mínimo. `company_id` é derivado da sessão. RLS de preços permanece por empresa.

## TESTS_EXECUTED

- `npm.cmd run typecheck` — PASS.
- `npm.cmd run lint` — PASS.
- `npm.cmd run build` — PASS (22 rotas).
- `npx.cmd supabase db push` — PASS.
- `npx.cmd supabase migration list` — migration local/remota alinhada.
- Query remota confirmou enforcement de `MINIMUM_QUANTITY_NOT_MET` nos dois RPCs.

## TEST_RESULTS

Gate técnico PASS. E2E autenticado abaixo/acima do mínimo e validação visual no navegador ainda pendentes.

## RISKS / OPEN_ISSUES

- Dados legados usam `sale_unit = UN`; criação/admin de SKUs `BOX` será validada na slice de administração.
- Fluxo atual de confirmação ainda é o legado; reserva somente após confirmação final será alterada em `ORDER-REVIEW-001`.
- Testar incremento de item existente até atingir o mínimo e redução abaixo do mínimo no navegador.

## NEXT_DEPENDENCY

`ORDER-REVIEW-001`: estados de análise, preço final, confirmação explícita e reserva somente depois; depois QA E2E e Design QA final.