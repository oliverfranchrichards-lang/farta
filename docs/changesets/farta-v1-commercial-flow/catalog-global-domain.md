# CATALOG-GLOBAL-001 — Auditoria e decisão de domínio

## Status

**STATUS:** DOMAIN_AUDIT_READY — sem alteração de código, schema ou migration.  
**OWNER:** PRODUCT-DOMAIN.  
**DEPENDENCIES:** DATABASE-ARCHITECT, SECURITY e BACKEND-NEXT.

## Estado atual verificado

### Identidade global do catálogo

As tabelas abaixo não possuem `company_id` e já estão modeladas como identidade compartilhada:

- `categories`: `name` possui unicidade global;
- `products`: referência global à categoria, com nome, marca, descrição e status;
- `product_variants`: referência global ao produto, `sku_code` único globalmente, nome, atributos, `sale_unit` e status;
- `product_images`: imagem vinculada ao produto ou variante, com caminho único, MIME, tamanho, alt text e primary/sort order.

As policies atuais permitem leitura autenticada de categorias/produtos/variantes e imagens. Portanto, a identidade e apresentação do catálogo já são globalmente compartilhadas para usuários autenticados, sem exigir remoção de `company_id` porque ele não existe nessas entidades.

### Dados privados por empresa

- `prices` possui `company_id` obrigatório e policy baseada em membership ativa; o mesmo SKU pode ter valores diferentes por empresa e vigências independentes.
- `carts`, `cart_items`, `orders`, `order_items` e endereços são tenant-scoped.
- `inventory_balances` é associado ao local de estoque/SKU, não diretamente à empresa. A policy atual `inventory_balances_authenticated_read` permite leitura a qualquer usuário autenticado e precisa ser revisada por SECURITY: saldo/estoque interno não deve ser exposto indiscriminadamente.
- Reservas, movimentos e pedidos são protegidos por relação com empresa/membership, conforme policies e RPCs existentes.

### Comportamento funcional atual

O `listCatalog` monta o catálogo global, mas só retorna variantes que possuem preço ativo para a empresa do perfil. Portanto, identidade global não garante que toda empresa veja o produto: cada empresa precisa possuir preço vigente para o SKU, ou o backend precisa definir um comportamento explícito para produtos sem preço.

O seed demonstrativo cria categorias, 50 produtos, uma variante `UN`, preços para a Empresa Demo e saldo no local demonstrativo. A inspeção estática não encontrou duplicatas intencionais do mesmo produto por empresa, pois produtos não são por empresa; a verificação de duplicatas reais do banco ainda depende de consulta no ambiente Supabase.

## Decisão de domínio

1. `categories`, `products`, `product_variants` e `product_images` permanecem globais.
2. `prices` permanece privado por empresa, SKU e vigência.
3. Pedidos, carrinhos, estabelecimentos, endereços, reservas e movimentos continuam privados por empresa/escopo operacional.
4. Não remover `company_id` de `prices`, carts, orders ou estoque.
5. `sku_code` e identidade de produto continuam únicos globalmente; qualquer tentativa de cadastrar duplicata deve ser tratada como conflito administrativo, não consolidada automaticamente.
6. Para cumprir “todas as empresas visualizam o mesmo catálogo”, cada empresa deve receber uma política de preço aproximado vigente para os SKUs comercialmente habilitados, sem compartilhar o valor de outra empresa.
7. Um SKU sem preço para a empresa não deve aparecer como comprável. A UX pode exibir “indisponível para esta empresa” ou o backend pode fornecer catálogo global separado de itens comercialmente habilitados; escolher uma opção na implementação.
8. Saldo, custo, margem e reserva não fazem parte do catálogo global do cliente.

## Conflitos e duplicatas

### Conflitos identificados

- O requisito de catálogo global entra em tensão com a exigência de preços por empresa: global é a identidade, não o valor comercial.
- A leitura global de `inventory_balances` é mais ampla que o necessário e deve ser endurecida antes de expor administração/estoque.
- `product_images` são globais por caminho; imagens específicas de variante devem continuar associadas à variante para não misturar apresentação comercial.
- O fluxo atual exige preço para incluir produto no catálogo; empresas novas sem price rows ficarão sem itens compráveis.

### Duplicatas

- Não há `company_id` para criar cópias de produto por empresa no schema atual.
- `categories.name` e `product_variants.sku_code` possuem unicidade global.
- Seeds demonstrativos usam IDs/SKUs determinísticos e `ON CONFLICT`, não indicando duplicação intencional.
- Antes de qualquer migração futura, executar consulta de similaridade por nome/marca/SKU e produzir relatório de conflitos. Não mesclar automaticamente produtos parecidos.

## Critérios de aceite

1. Empresa A e empresa B veem os mesmos produtos, categorias, variantes e imagens ativas.
2. A e B podem possuir preços aproximados distintos para o mesmo SKU.
3. A não consegue consultar, alterar ou inferir preços privados de B por RLS/API.
4. Cliente não lê saldo, custo, margem, reservas ou movimentos internos sem permissão operacional explícita.
5. Pedido histórico continua apontando para snapshots mesmo se nome, imagem, variante ou preço atual mudarem.
6. Produto duplicado não é consolidado automaticamente; conflito é reportado para decisão administrativa.
7. SKU ou categoria inativos não aparecem como selecionáveis.
8. Empresa sem preço vigente recebe comportamento claro e consistente, sem preço de outra empresa.
9. Imagem de produto/variante respeita escopo global e associação correta.
10. RLS cross-tenant, leitura de estoque e criação/edição administrativa são testadas.

## Riscos

- Copiar preços da Empresa Demo para todas as empresas pode criar preço comercial incorreto; preços devem ser criados por política aprovada.
- Tornar preços globais para simplificar catálogo quebraria preços por empresa e isolamento comercial.
- Manter estoque globalmente legível expõe informação operacional sensível.
- Consolidar duplicatas por heurística pode quebrar referências históricas e snapshots.
- Esconder produtos sem preço pode parecer catálogo incompleto; mostrar como indisponível é uma decisão de UX, não autorização para comprar.

## Handoff

**TASK_ID:** CATALOG-GLOBAL-001  
**STATUS:** DOMAIN_DECISION_READY — auditoria concluída, sem implementação.  
**SUMMARY:** identidade do catálogo já é global; preço permanece por empresa; carrinho/pedido/estoque privado; conflitos e lacuna de preços por empresa registrados.  
**DECISIONS:** não remover `company_id` de dados privados; não consolidar duplicatas automaticamente; manter SKU/categoria global; exigir preço vigente próprio para compra.  
**FILES_CHANGED:** somente `docs/changesets/farta-v1-commercial-flow/catalog-global-domain.md`.  
**SCHEMA_CHANGED:** não.  
**MIGRATIONS:** nenhuma criada/aplicada.  
**SECURITY_IMPACT:** revisar policy de `inventory_balances`; manter prices por membership e dados de pedido por tenant; testar catálogo global sem vazamento comercial.  
**TESTS_EXECUTED:** inspeção estática das migrations, policies, seed demo e `listCatalog`; não houve consulta live nem alteração.  
**TEST_RESULTS:** auditoria pronta; RLS e verificação de duplicatas live pendentes.  
**RISKS:** empresas sem preço vigente; exposição atual de saldo; conflitos de produto/variante; política de preço global versus tenant.  
**OPEN_ISSUES:** decidir UX para SKU sem preço e política de provisionamento de preços para novas empresas; Security deve aprovar estoque.  
**NEXT_DEPENDENCY:** DATABASE-ARCHITECT define data-impact; SECURITY revisa RLS; BACKEND implementa catálogo global preservando preço privado; QA testa empresas A/B e histórico.
