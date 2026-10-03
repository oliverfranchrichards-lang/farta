# PROD-PRICE-001 — Contrato Comercial de Produto e Preço

## Status

**STATUS:** CONTRACT_APPROVED_FOR_SLICE — migration aditiva ainda requer revisão final dos diffs.  
**OWNER:** PRODUCT-DOMAIN.  
**DEPENDENCIES:** DATABASE-ARCHITECT validar a modelagem; SECURITY revisar RLS; BACKEND-NEXT implementar regras server-side; PRODUCT-DESIGN-DIRECTOR especificar catálogo.

Este contrato transforma as decisões aprovadas em regras comerciais implementáveis. Não cria migration nem altera código.

## 1. Conceitos canônicos

### Produto

`products` é a identidade comum do item: nome, marca, categoria e status. O produto não carrega quantidade comercial nem preço diretamente.

### SKU/variante comercial

`product_variants` é a unidade comercial escolhida pelo cliente. Unidade e caixa não são conversões físicas nesta V1: são SKUs/variantes independentes, com identidade, preço e mínimo próprios.

Exemplo:

| Produto | SKU/variante | `sale_unit` | Preço aproximado | Mínimo |
|---|---|---|---:|---:|
| Arroz Tipo 1 | Arroz Tipo 1 — Unidade | `UNIT` | R$ 8,90 | 1 |
| Arroz Tipo 1 | Arroz Tipo 1 — Caixa | `BOX` | R$ 170,00 | 1 |

A caixa não deve ser convertida automaticamente em unidades físicas, e a quantidade de caixas não deve ser multiplicada pelo conteúdo da caixa para formar a quantidade do pedido. Se conversão, fator de embalagem ou estoque físico forem necessários, será uma evolução de domínio separada.

### Unidades aceitas

O vocabulário deve ser normalizado e controlado pelo backend. Para esta slice, usar pelo menos `UNIT` e `BOX`, com apresentação localizada “Unidade” e “Caixa”. Variantes com outros `sale_unit` só entram mediante cadastro válido.

## 2. Preço aproximado por empresa

O preço exibido ao cliente é aproximado e pertence à relação empresa + SKU + vigência. A estrutura atual `prices(company_id, sku_id, amount_minor, valid_from, valid_until, status)` é a fonte temporal existente.

Contrato recomendado para a evolução:

- reutilizar `prices`, sem criar uma segunda tabela de preços;
- adicionar um discriminador explícito de natureza comercial, sem adicionar `price_type` nesta slice: todo preço de catálogo anterior à confirmação final será tratado e rotulado como aproximado; preço final será separado na slice ORDER-REVIEW;
- manter `amount_minor` inteiro em centavos e `currency_code = BRL` conforme padrão atual;
- manter vigência e impedir sobreposição de preços ativos para a mesma empresa/SKU/tipo;
- não apresentar esse valor como preço final garantido;
- se a arquitetura optar por não adicionar `price_type`, o contrato deve tratar todo preço de catálogo desta fase como aproximado e registrar a decisão antes da migration.

O preço aproximado não é global: duas empresas podem ter valores diferentes para o mesmo SKU. Produtos/variantes são globais, preços são tenant-scoped.

## 3. Venda mínima por SKU

Cada SKU deve possuir `minimum_quantity` inteiro positivo. O significado é quantidade mínima daquela unidade comercial escolhida:

- SKU `UNIT`: quantidade mínima de unidades;
- SKU `BOX`: quantidade mínima de caixas.

Não há conversão entre as duas quantidades. `minimum_quantity` será atributo de `product_variants`, por SKU, nesta V1. A regra não varia por empresa nesta slice; qualquer variação futura exigirá decisão e nova modelagem.

Regras:

1. quantidade deve ser inteira e `>= minimum_quantity`;
2. SKU deve estar ativo no momento da seleção/adição;
3. variante e `sale_unit` devem pertencer ao produto exibido;
4. alteração manual de request não pode contornar o mínimo;
5. reduzir quantidade abaixo do mínimo remove o item ou retorna erro de domínio, conforme UX aprovada;
6. pedido já submetido não é recalculado quando o catálogo muda.

## 4. Catálogo e seleção

Não criar página separada de detalhe de produto para esta slice. O card/lista existente deve:

- mostrar produto, marca e variante;
- mostrar seletor Unidade/Caixa apenas quando houver mais de um SKU elegível;
- mostrar “Preço aproximado” junto ao preço da opção selecionada;
- mostrar “Venda mínima: N unidade(s)/caixa(s)”;
- iniciar quantidade no mínimo válido, nunca em zero;
- recalcular subtotal aproximado quando SKU ou quantidade mudar;
- bloquear adição enquanto não houver preço aproximado válido para a empresa;
- enviar ao backend o `sku_id` e a quantidade, não apenas nome/unidade digitados.

Se somente uma variante estiver ativa, não exibir um seletor redundante, mas informar a unidade comercial claramente.

## 5. Carrinho e pedido

`cart_items` deve identificar o SKU escolhido. A seleção Unidade/Caixa não pode ser inferida posteriormente do catálogo atual. No envio para análise, o item deve congelar pelo menos:

- `sku_id`;
- produto e marca, quando o modelo permitir;
- código SKU;
- nome da variante;
- `sale_unit` e label comercial;
- quantidade;
- preço aproximado unitário e subtotal aproximado;
- moeda;
- mínimo aplicado, quando necessário para auditoria.

O pedido inicial é uma solicitação para análise, não uma compra final. A reserva de estoque ocorre somente na confirmação final do cliente, após preço final definido. O fluxo de preço aproximado não pode criar reserva, movimento de reserva ou reduzir disponibilidade.

Preço final deve ser persistido separadamente por item quando a slice de análise for implementada; nunca sobrescrever silenciosamente o preço aproximado. Alterações posteriores em `prices` não alteram snapshots históricos.

## 6. Invariantes de servidor

- `sku_id` pertence a variante ativa e produto ativo;
- SKU e empresa possuem preço aproximado vigente, quando preço for obrigatório para seleção;
- unidade comercial é determinada pelo SKU, não por payload livre;
- quantidade respeita `minimum_quantity`;
- preço aproximado e subtotal são calculados/validados no servidor;
- empresa do usuário, carrinho, preço e pedido são o mesmo tenant;
- envio duplicado é idempotente;
- nenhum estoque é reservado antes da confirmação final;
- preço aproximado não é rotulado como preço final.

## 7. Critérios de aceite

1. Produto com Unidade e Caixa permite selecionar as duas opções separadamente.
2. Cada opção mostra preço aproximado e mínimo próprios.
3. Produto com apenas uma opção não mostra seletor desnecessário.
4. Quantidade abaixo do mínimo falha no backend mesmo com request manual.
5. O carrinho preserva SKU, unidade, quantidade e preço aproximado escolhidos.
6. Pedido submetido não reserva estoque.
7. Alterar catálogo/preço depois do envio não muda o snapshot do pedido.
8. Duas empresas podem ver o mesmo produto com preços aproximados diferentes.
9. Cliente não vê custo/margem nem consegue alterar produto/preço.
10. Unidade/caixa permanece identificável no histórico e nas futuras exportações.

## 8. Testes obrigatórios da slice

- SKU somente `UNIT`;
- SKU somente `BOX`;
- ambos os SKUs do mesmo produto;
- mínimo 1 e mínimo maior que 1;
- quantidade abaixo, igual e acima do mínimo;
- SKU inativo e produto inativo;
- preço ausente, expirado e vigente;
- empresa A/B com preços distintos;
- payload tentando trocar `sale_unit` sem trocar `sku_id`;
- submissão duplicada;
- inspeção de estoque sem reserva antes da confirmação final;
- RLS cross-tenant;
- snapshot após atualização posterior do catálogo;
- lint, typecheck, testes de integração e build.

## 9. Impacto e riscos

**Schema:** evolução aditiva provável em variante/preço/item de pedido; nenhuma mudança autorizada neste documento.  
**Backend:** RPCs de carrinho, envio e confirmação devem validar SKU, preço vigente e mínimo no servidor.  
**Frontend/UX:** controlar seleção compacta no card, comunicar “aproximado” e não poluir a grade.  
**Segurança:** preços por empresa, RLS e ownership não podem ser relaxados para tornar catálogo global.  
**Riscos:** colocar mínimo na tabela errada pode impedir regras por empresa; converter caixa em unidade agora criaria ambiguidade de estoque; reservar antes da confirmação final causaria estoque comprometido por pedido não aprovado.

## Handoff

**TASK_ID:** PROD-PRICE-001  
**STATUS:** CONTRACT_APPROVED_FOR_SLICE — migration aditiva ainda requer revisão final dos diffs.  
**SUMMARY:** Unidade/Caixa são SKUs independentes sem conversão física; preço aproximado é por empresa/SKU/vigência; mínimo é por SKU; escolha e valores são congelados no pedido; reserva somente após confirmação final.  
**DECISIONS:** mínimo em `product_variants` por SKU; sem `price_type` nesta slice, pois todo preço pré-confirmação é aproximado; preço final será separado em ORDER-REVIEW.  
**FILES_CHANGED:** somente `docs/changesets/farta-v1-commercial-flow/product-price-contract.md`.  
**SCHEMA_CHANGED:** não.  
**MIGRATIONS:** nenhuma criada/aplicada.  
**SECURITY_IMPACT:** validação server-side, tenant isolation, RLS, sem exposição de custo/margem e sem bypass de mínimo.  
**TESTS_EXECUTED:** inspeção estática do modelo atual; nenhum teste runtime, pois não houve implementação.  
**TEST_RESULTS:** contrato revisado; quality gates pendentes da slice.  
**RISKS:** valores legados de `sale_unit`, backfill de mínimo e compatibilidade das RPCs devem ser revisados antes da migration.  
**OPEN_ISSUES:** somente decisões técnicas de modelagem e matriz de permissões do chat fora desta slice.  
**NEXT_DEPENDENCY:** DATABASE-ARCHITECT aprova data-impact; SECURITY revisa RLS; PRODUCT-DESIGN-DIRECTOR especifica card; depois BACKEND-NEXT implementa verticalmente.