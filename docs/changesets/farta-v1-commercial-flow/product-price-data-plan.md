# PROD-PRICE-001 — plano de dados

**OWNER:** DATABASE-ARCHITECT  
**STATUS:** READY_FOR_IMPLEMENTATION REVIEW  
**SCHEMA/MIGRATIONS:** ainda nenhum.

## Contrato aprovado pelo domínio

- Unidade e Caixa serão variantes/SKUs independentes.
- Não haverá conversão física entre unidade e caixa na V1.
- `minimum_quantity` será inteiro positivo por SKU.
- `prices.amount_minor` permanece preço aproximado por empresa/SKU/vigência; não duplicar a tabela de preços.
- Carrinho e pedido devem congelar SKU, quantidade, `sale_unit`, mínimo e preço aproximado. Preço final será introduzido na slice ORDER-REVIEW.

## Migration aditiva proposta

1. Auditar SKUs existentes e valores de `sale_unit`.
2. Adicionar `product_variants.minimum_quantity` nullable.
3. Backfill seguro com `1`, revisar exceções, então aplicar `NOT NULL` + `CHECK (minimum_quantity > 0)`.
4. Adicionar `order_items.minimum_quantity_snapshot`; manter `sale_unit_snapshot`/preço antigos para compatibilidade.
5. Revalidar no servidor todos os comandos de carrinho/checkout; `company_id` vem da sessão.
6. Regenerar tipos e versionar RPCs antes de conectar a UI.

## RLS e segurança

Preços continuam protegidos por `has_active_membership(company_id)`; produtos/variantes ativos continuam publicados. Customer não edita SKU, mínimo, preço ou snapshots. Nenhuma policy nova pode abrir dados de outra empresa.

## Rollback

Usar colunas aditivas, backfill transacional e leitura compatível. Não remover colunas/status nem alterar pedidos históricos. Se houver falha, desativar escrita nova e manter leitura das colunas antigas.

## Testes obrigatórios

A/B com preços diferentes; UNIT e CASE independentes; quantidade abaixo do mínimo rejeitada server-side; cliente sem preço de outra empresa; alteração futura de preço/mínimo não altera pedido histórico; SKU inativo/preço indisponível em carrinho antigo; customer não edita catálogo; preço aproximado rotulado na UI.

## Handoff

**SCHEMA_CHANGED:** nenhum. **MIGRATIONS:** pendentes de aprovação. **SECURITY_IMPACT:** RLS e validações server-side obrigatórias. **NEXT_DEPENDENCY:** revisão Security + Design Director e aprovação do usuário para criar migration.