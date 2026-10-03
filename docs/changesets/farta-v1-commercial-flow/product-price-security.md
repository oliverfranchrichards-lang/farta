# PROD-PRICE-001 — revisão de segurança

**TASK_ID:** PROD-PRICE-001-SECURITY  
**STATUS:** READY — decisões comerciais resolvidas; revisão runtime pendente.

## Regras

- `minimum_quantity` é por SKU; Unidade e Caixa são SKUs/variantes independentes, sem conversão física.
- Preço aproximado vem do servidor a partir de `company_id` da sessão e SKU vigente. Nunca confiar em preço enviado pelo browser.
- Cart item/order item congela SKU, modo, quantidade, mínimo e preço aproximado; customer não pode alterar snapshot.
- Products/variants ativos são globais para leitura; prices continuam protegidos por membership da empresa.
- SKU inativo, preço expirado, quantity abaixo do mínimo e company manipulada devem falhar server-side.

## Testes negativos

1. Cliente A tenta ler preço de B.
2. Cliente envia `company_id` ou preço de outra empresa.
3. Quantidade zero/negativa ou abaixo de `minimum_quantity`.
4. Troca manual de SKU UNIT por CASE e replay de add/set quantity.
5. SKU inativo, preço sem vigência ou duas faixas conflitantes.
6. Customer tenta inserir/alterar product_variant, minimum ou order snapshot.
7. Alteração futura de preço/mínimo não altera pedido histórico.
8. Duplo envio não cria item/efeito duplicado.
9. Perfil sem membership tenta adicionar ao carrinho.

## Handoff

**SCHEMA_CHANGED/MIGRATIONS:** nenhum. **TESTS_EXECUTED:** revisão estática do schema/RLS; execução runtime fica para o gate B0. **NEXT_DEPENDENCY:** aprovar migration aditiva e executar Domain → Data/RLS → Backend → Design QA → QA.