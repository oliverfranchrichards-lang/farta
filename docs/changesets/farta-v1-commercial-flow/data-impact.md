# Farta v1 — impacto de dados

**TASK_ID:** DATA-AUDIT-001  
**STATUS:** READY_FOR_DECISIONS  
**Migrations aplicadas:** nenhuma nesta auditoria.

## Modelo atual

Produtos/variantes/categorias são globais; `prices` é `company_id` + SKU com vigência temporal. Carrinhos pertencem a empresa/estabelecimento. Orders e order_items congelam nome, unidade textual, preço, subtotal e endereço. Reservas de estoque nascem na confirmação atual. `profiles.phone` é o único telefone.

## Evolução recomendada

1. Após aprovar Unidade/Caixa, acrescentar ao modelo comercial `purchase_mode`, `units_per_case` e venda mínima sem duplicar `prices`.
2. Persistir no carrinho e order_items snapshots de modo, quantidade, mínimo por SKU, preço aproximado e preço final; manter colunas antigas durante backfill.
3. Adicionar estados de análise somente após revisar RPCs, constraints, policies e pedidos históricos.
4. Controlar concorrência com versão/updated_at e transições condicionais; ações críticas devem ser idempotentes.
5. Globalizar apenas products/variants/categories; manter prices, inventory, orders e dados internos protegidos por company.
6. Banners terão path Storage, alt text, status ACTIVE/INACTIVE e ordenação; sem agenda na V1. Chat só após modelo de participantes aprovado.

## Constraints a revisar

- modo comercial/quantidade mínima;
- subtotal aproximado/final consistente;
- transições oficiais;
- unicidade de preço ativo por escopo e vigência;
- FKs/policies de chat e Storage;
- MIME/tamanho de banners.

## Rollback

Preferir migrations aditivas, backfill reversível e feature flag. Não apagar status/colunas históricas. Versionar RPCs e manter compatibilidade até os clientes migrarem.

## DECISION_REQUIRED

Contrato técnico Unidade/Caixa; estados/preço final; participantes/retenção do chat. Decisões de mínimo por SKU, reserva final, ownership na empresa, WhatsApp manual e banners ACTIVE/INACTIVE estão aprovadas.

## Handoff

**SCHEMA_CHANGED:** nenhum. **SECURITY_IMPACT:** RLS deve acompanhar cada coluna/tabela. **TESTS_EXECUTED:** inspeção read-only de migrations e constraints. **NEXT_DEPENDENCY:** decisões de domínio, segurança e arquitetura antes de criar migration.