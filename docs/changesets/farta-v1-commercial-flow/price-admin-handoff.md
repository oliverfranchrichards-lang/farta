# PRICE-ADMIN-001 — handoff

**Status:** IMPLEMENTED — aguardando QA autenticado no painel.

## Resultado

- Preços aproximados continuam tenant-scoped em `prices(company_id, sku_id)`.
- `admin_list_company_prices` lista cada SKU da empresa e informa cobertura, vigência, unidade e mínimo.
- `admin_upsert_company_sku_price` cria ou atualiza o preço vigente exclusivamente para `PLATFORM_ADMIN` ativo.
- Nenhum valor é copiado de outra empresa e nenhum pedido histórico é alterado.
- A consulta do catálogo agora ignora preços futuros e expirados, alinhada às validações do carrinho.
- O catálogo também lista variantes ativas sem preço vigente para a empresa, sinalizando “Preço não definido” e mantendo o botão de compra bloqueado. Assim, produtos globais ficam visíveis em todos os estabelecimentos da empresa, sem permitir compra antes do cadastro do preço.
- Preços podem ser preparados para variantes inativas; a inatividade continua bloqueando a compra até a variante ser ativada.
- Ao reabrir uma variante, “Todas recebem esse preço” é inferido como marcado quando todas as empresas possuem o mesmo preço vigente para o SKU.

## UI

- Nova rota `/admin/empresas/[companyId]/precos`.
- Busca por produto, variante ou SKU.
- Tabela responsiva com estado “Sem preço definido” e diálogo acessível para definir/editar valor em reais.
- Entrada contextual “Gerenciar preços” no detalhe da empresa.

## Gates executados

- `npx.cmd supabase db push --linked` — PASS.
- `npx.cmd supabase db lint --linked` — PASS.
- `npx.cmd supabase gen types typescript --linked` — PASS.
- `npm.cmd run typecheck` — PASS.
- `npm.cmd run lint` — PASS.
- `npm.cmd run build` — PASS (rota `/admin/empresas/[companyId]/precos`).

## QA pendente

1. Entrar como `PLATFORM_ADMIN`, abrir uma empresa e cadastrar um valor explícito para o SKU criado.
2. Confirmar que o SKU passa a aparecer no catálogo dessa empresa.
3. Confirmar que outra empresa continua sem o SKU até cadastrar o próprio preço.
4. Confirmar que editar o preço não modifica pedidos já enviados.
