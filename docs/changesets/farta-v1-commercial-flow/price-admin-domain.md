# PRICE-ADMIN-001 — Preços aproximados por empresa

## Auditoria

O schema atual possui `prices` com `company_id`, `sku_id`, `amount_minor`, `currency_code`, `valid_from`, `valid_until`, `status` e `source`, com restrição de sobreposição temporal ativa por empresa/SKU. Produtos/variantes são globais, mas `listCatalog` só retorna variantes que possuem preço ativo para a empresa do usuário. O painel já administra categorias, produtos e variantes (incluindo `minimum_quantity`), porém não há action/tela/RPC de preços. O seed demo cria preços somente para a Empresa Demo; por isso novos SKUs não aparecem como compráveis nas demais empresas.

## Plano mínimo

### Backend/data

1. Consultar, para uma empresa, todas as variantes ativas globais com produto/categoria, unidade, mínimo e preço vigente.
2. Criar mutation server-side para inserir/atualizar preço aproximado explícito em `company_id + sku_id`.
3. Restringir mutation a `PLATFORM_ADMIN` ativo; validar empresa ativa, variante/produto ativos e SKU pertencente ao catálogo.
4. Rejeitar IDs/payload inválidos e respeitar vigência temporal.
5. Ao substituir preço vigente, encerrar o intervalo anterior de forma transacional ou rejeitar vigência sobreposta.
6. Não gerar/copi​ar valores automaticamente de outra empresa nem criar preço pela criação de SKU.
7. Auditar empresa, SKU, operação e anterior/novo sem expor dados desnecessários.
8. Não alterar snapshots de carrinhos convertidos, `order_items` ou pedidos existentes.

O preço deste módulo continua sendo aproximado; preço final pertence a `ORDER-REVIEW-001`.

### UI mínima

Adicionar `/admin/empresas/[companyId]/precos` ou tela equivalente com empresa selecionada. Mostrar produto, marca, variante/SKU, unidade, mínimo, preço aproximado vigente, moeda, validade e cobertura `Com preço`/`Sem preço`. Permitir filtros e cadastrar/editar/inativar preço. Não preencher valor sugerido de outra empresa. SKU sem preço fica não disponível/omitido de modo consistente no catálogo; nunca usa fallback cross-tenant.

## Regras e invariantes

- Preço é privado por empresa/SKU/vigência; produto/variante são globais.
- Unidade/Caixa são SKUs independentes, sem conversão física.
- `minimum_quantity` é validado no servidor.
- Só preço ativo e vigente habilita compra.
- Produto/variante inativo não fica comprável, mesmo que tenha linha de preço.
- Valor zero segue a constraint atual; não reinterpretar como inválido sem decisão comercial.
- Nunca existem intervalos ativos sobrepostos.
- Cliente lê somente preço de sua membership; não edita nem infere preço de outra empresa.
- Admin administra via action/RPC autorizado.
- Pedido histórico preserva preço aproximado/final congelado.
- Concorrência não cria dois preços ativos.

## Critérios de aceite

1. Admin cria preço aproximado explícito para SKU/empresa.
2. Novo SKU aparece no catálogo da empresa somente após preço vigente.
3. Empresas A/B podem ter valores diferentes para o mesmo SKU.
4. SKU sem preço não usa valor de outra empresa.
5. Substituição respeita vigência sem quebrar exclusion constraint.
6. SKU/produto inativo não é comprável.
7. Usuário sem `PLATFORM_ADMIN` falha ao tentar mutar preço manualmente.
8. Pedido existente não muda após edição do catálogo.
9. Auditoria cobre criar/editar/inativar e falhas relevantes.
10. Testes cobrem cross-tenant, ausência/expiração, IDs inválidos, concorrência e snapshots.

## Riscos

Copiar preço demo ou de outra empresa inventa valor comercial. Atualizar sem fechar vigência quebra a constraint. Criar preço para variante inativa reativa produto indiretamente. Fallback cross-tenant vaza preço. Empresas novas terão cobertura parcial até cadastro explícito; isso deve aparecer no admin.

## Handoff

**TASK_ID:** PRICE-ADMIN-001  
**STATUS:** PLAN_READY — sem implementação.  
**SUMMARY:** administrar preço aproximado por empresa/SKU para habilitar novos SKUs, sem valores automáticos e preservando snapshots.  
**FILES_CHANGED:** somente `docs/changesets/farta-v1-commercial-flow/price-admin-domain.md`.  
**SCHEMA_CHANGED:** não. **MIGRATIONS:** nenhuma criada/aplicada.  
**SECURITY_IMPACT:** mutations admin-only; leitura por membership; sem cross-tenant/fallback.  
**TESTS_EXECUTED:** inspeção estática de schema, seed, catálogo e admin; runtime não executado.  
**TEST_RESULTS:** plano pronto.  
**RISKS:** vigência concorrente, empresas sem cobertura, valor zero e UX de SKU sem preço.  
**OPEN_ISSUES:** definir UX de cobertura parcial e política para valor zero; não inventar valores.  
**NEXT_DEPENDENCY:** Database/Security revisam RPC/RLS → Backend → Frontend/Design → QA catálogo A/B e snapshots.