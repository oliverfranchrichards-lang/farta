# ADMIN-PRODUCTS-001 — implementação e QA

**Status:** backend, Storage e telas MVP implementados.

## Entregas

- RPCs `PLATFORM_ADMIN` para categorias, produtos e variantes.
- Categoria `Outros` criada sob demanda.
- Inativação/exclusão de categoria com produtos exige confirmação e realoca produtos para `Outros`.
- `sku_code` pode ser alterado; `order_items.sku_code_snapshot` preserva o código histórico.
- Bucket privado `catalog-product-images`, limitado a JPEG/PNG/WebP de até 5 MB.
- Upload de imagem com texto alternativo obrigatório e URL assinada para exibição.
- Rotas `/admin/produtos`, `/admin/produtos/novo`, `/admin/produtos/[productId]` e `/admin/categorias`.
- Navegação de administrador inclui Produtos.

## Validações executadas

- `supabase db push --linked`: migrations 012, 013, 014 e 015 aplicadas.
- `supabase db lint --linked`: `No schema errors found`.
- `npm.cmd run typecheck`: aprovado.
- `npm.cmd run lint`: aprovado sem warnings.
- `npm.cmd run build`: aprovado; novas rotas geradas.
- Cliente chamando `admin_list_products`: `FORBIDDEN`.
- Inativação sem confirmação em categoria com produtos: `CATEGORY_REASSIGN_CONFIRMATION_REQUIRED`.
- Inativação confirmada testada em transação revertida; produtos foram direcionados a `Outros`.
- Alteração de SKU testada em transação revertida; snapshot histórico permaneceu inalterado.
- Nenhum `order_items.sku_code_snapshot` ficou nulo após o backfill.
- Smoke HTTP não autenticado nas rotas admin redirecionou para login.

## Compatibilidade

- Preços, estoque, pedidos e carrinhos não são alterados pelo CRUD.
- Pedidos históricos preservam o código SKU armazenado no item.
- Imagens externas demo continuam funcionando; imagens internas usam URL assinada.
