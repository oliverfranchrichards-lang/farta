# FARTA-DESIGN-001 — Arquétipos de página

Arquétipos derivados do inventário real de rotas. A referência Farta orienta composição e prioridade, mas não cria rotas ou funcionalidades ausentes.

## AUTH

Rotas: `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/invite`.

Estrutura: shell independente, logo Farta, formulário central/dupla coluna em desktop e uma coluna no mobile, feedback próximo ao campo, ação primária única. Preservar cadastro, login, recuperação, aceite de convite e estados atuais.

## REDIRECT / ACCESS STATE

Rotas: `/`, `/acesso-negado`.

Estrutura: estado curto, título explícito, destino recomendado e ação de retorno. Não transformar redirect em dashboard fictício nem adicionar atalhos da referência.

## DISCOVERY / CATALOG

Rota: `/catalogo`.

Estrutura: PageHeader + SearchBar + filtros/categorias existentes + grid/lista de produtos + carrinho. Desktop favorece comparação; mobile usa uma coluna e filtros compactos. Preservar busca, filtros existentes, preços por empresa, disponibilidade e adição ao carrinho.

## TRANSACTION / CHECKOUT

Rota: `/pedido`.

Estrutura: breadcrumb/retorno, itens editáveis, seção de entrega/endereço/janela, observações, resumo sticky no desktop e bloco final no mobile. A confirmação permanece a única ação primária. Preservar payload, validações, estoque e carrinho compartilhado.

## CUSTOMER MANAGEMENT LIST

Rota: `/pedidos`.

Estrutura: PageHeader + resumo discreto + busca/filtros + tabela desktop ou MobileList + status + link de detalhe. A referência de cards serve para agrupamento, não para eliminar comparação tabular. Preservar filtros, polling, notificações de mudança e destinos.

## ORDER DETAIL

Rota: `/pedidos/[orderId]`.

Estrutura: contexto do pedido, status/badge, timeline, itens, resumo/endereço, ações permitidas e feedback. Desktop pode usar duas colunas; mobile empilha status, resumo e histórico. Preservar confirmação de recebimento e histórico.

## NOTIFICATION LIST

Rota: `/notificacoes`.

Estrutura: PageHeader, lista cronológica com status, timestamp e link para pedido. Empty/error states compartilhados. Não introduzir central de notificações com categorias inexistentes.

## WORKFLOW / OPERATIONS QUEUE

Rota: `/operacao/pedidos`.

Estrutura: fila de trabalho, filtros, tabela densa, status e ações contextuais. Desktop mantém tabela; mobile prioriza pedido/status/próxima ação em lista. Preservar separação, pronto, atribuição de entregador e envio para rota; não adicionar gestão de estoque ou mapa.

## DELIVERY QUEUE

Rota: `/operacao/entregas`.

Estrutura: experiência mobile-first de próximas entregas, pedido/endereço/janela, status e ação disponível. A referência de mapa é apenas linguagem futura: não criar rastreamento ou mapa se não existir funcionalmente. Preservar confirmação de entrega e escopo do entregador.

## ADMINISTRATION LIST / DETAIL

Rotas: `/admin/empresas`, `/admin/empresas/[companyId]`, `/admin/empresas/[companyId]/estabelecimentos`, `/admin/empresas/[companyId]/convites`, `/admin/pedidos`.

Estrutura: shell administrativo, PageHeader, filtros, tabela/lista, ações de gestão, detalhe em página ou painel conforme o fluxo atual. Preservar isolamento, empresa, estabelecimentos, convites e fila de pedidos; não criar módulos da referência.

## ADMINISTRATION FORM

Rotas: `/admin/empresas/nova`, `/admin/empresas/[companyId]/estabelecimentos/novo`.

Estrutura: formulário dividido por intenção, labels visíveis, seções, erro no topo com foco, ações no rodapé. A visualização pode usar etapas somente se não mudar o fluxo/payload atual; por padrão manter submissão equivalente.

## Matriz responsiva

| Arquétipo | Desktop | Tablet | Mobile |
|---|---|---|---|
| Auth | split/shell e formulário estreito | uma coluna com marca reduzida | uma coluna, CTA full-width |
| Discovery | grid + resumo/carrinho | grid reduzido + filtros agrupados | uma coluna + filtros compactos |
| Transaction | duas colunas e resumo sticky | coluna com resumo abaixo | seções empilhadas |
| List/Table | tabela e ações na linha | colunas essenciais | MobileList equivalente |
| Detail | status/timeline + duas colunas | duas áreas empilháveis | ordem: status, ação, dados, histórico |
| Workflow | densidade operacional | tabela reduzida | tarefa atual primeiro |
| Admin form | grid de campos | duas/uma colunas | uma coluna e ações empilhadas |

## Critério de consistência

O usuário deve reconhecer Farta pela mesma marca, shell, tipografia, tokens, botão, input, badge, card, tabela, feedback e comportamento responsivo em todas as famílias, sem que o conteúdo de uma rota seja inventado para parecer com a referência.

