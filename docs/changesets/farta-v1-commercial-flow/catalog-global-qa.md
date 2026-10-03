# CATALOG-GLOBAL-001 — auditoria e QA

**Status:** atendido pelo modelo atual; nenhuma migration necessária.

## Evidências

- `categories`, `products`, `product_variants` e `product_images` não possuem `company_id` e são globais.
- `prices` continua vinculado a `company_id + sku_id`; empresa A não recebe preço da empresa B.
- `carts`, `orders`, `inventory` e dados operacionais permanecem privados por empresa/localização; `inventory_balances` não possui policy de leitura direta após `20260929000100_harden_rls_inventory_delivery.sql`.
- A Server Action `listCatalog` deriva a empresa da sessão e consulta preços somente dessa empresa.
- `add_to_establishment_cart` valida perfil, membership, estabelecimento, SKU, produto, preço e venda mínima no servidor.
- As policies de catálogo permitem leitura apenas a perfis ativos vinculados a uma empresa; não há policy de escrita para cliente.

## Testes executados/revisados

- `supabase db lint --linked`: aprovado.
- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run lint`: aprovado.
- `npm.cmd run build`: aprovado.
- Inspeção de RLS e RPCs confirmou que `company_id` enviado pelo navegador não substitui o tenant derivado da sessão.
- Teste negativo existente de fluxo de pedido confirmou isolamento cross-tenant (`FORBIDDEN`/`ORDER_NOT_FOUND`).

## Decisão

Não adicionar nem remover `company_id` do catálogo. Não consolidar duplicatas automaticamente. A próxima evolução do domínio é `ADMIN-PRODUCTS-001`, com mutations exclusivas de `PLATFORM_ADMIN` e definição de Storage/URLs antes de upload.

## Riscos acompanhados

- A lista atual não pagina e monta o DTO em memória; não é bloqueador para o volume do MVP.
- O caminho de Storage não é usado como URL pública pelo catálogo atual; imagens de apresentação usam fallback semântico. Definir bucket/URL assinada antes do CRUD de imagens.
- `sale_unit` continua texto no schema e deve ser validado no admin antes de ampliar o contrato de unidades.
