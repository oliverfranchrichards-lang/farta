# ProStock — Page Archetypes

Este documento classifica as páginas atuais e define padrões para as áreas futuras, sem alterar requisitos de negócio.

## 1. Matriz de arquétipos

| Arquétipo | Job to be done | Rotas atuais | Estrutura padrão | Densidade |
|---|---|---|---|---|
| AUTH | entrar, criar acesso ou recuperar acesso | `/auth/*` | AuthShell + formulário + feedback | confortável |
| DISCOVERY | localizar, comparar e selecionar produtos | `/`, `/catalogo` | PageHeader + Search + FilterBar + resultados + resumo | confortável/default |
| MANAGEMENT | consultar e operar grande volume | `/pedidos` e futuro estoque/admin | PageHeader + filtros + tabela/lista + ações | default/compact |
| TRANSACTION | revisar decisões e confirmar pedido | `/pedido` | contexto + linhas + entrega + notas + resumo + confirmação | confortável |
| DETAIL | compreender um recurso e agir nele | futuro produto/pedido/entrega | contexto + status + dados + timeline + ações | default |
| MONITORING | detectar exceções e decidir próximo passo | `/` e futuro dashboard/logística | poucos indicadores + exceções + tarefas | default |
| WORKFLOW | executar etapa operacional sequencial | futuro picking/driver | tarefa atual + contexto mínimo + próxima ação | compact |
| SUPPORT | abrir e acompanhar resolução | futuro atendimento | lista/ticket + contexto + mensagens + estado | default |

## 2. Discovery

### `/catalogo`

**Job:** encontrar SKU, comparar disponibilidade/preço/embalagem e adicionar ao carrinho.

**Hierarquia:** PageHeader e contexto → busca dominante → chips/filtros ativos → ordenação → resultados comparáveis → resumo do carrinho → revisar pedido.

**Desktop:** grid de resultados + resumo lateral sticky.

**Mobile:** busca no topo, botão `Filtros`, drawer de filtros, lista/card compacto e resumo em barra inferior/drawer.

**Estados:** loading skeleton, sem resultado com limpar filtros, erro com tentar novamente, disponibilidade categórica, item adicionado e carrinho vazio.

### `/` dashboard cliente

**Job:** entender o que requer atenção e retomar compra/acompanhamento.

Reduzir métricas sem decisão. Priorizar pedido em andamento, alertas de estoque acionáveis e atalhos de reposição. Categorias podem ser filtro/atalho, não necessariamente card independente.

## 3. Transaction

### `/pedido`

**Job:** revisar itens, endereço/estabelecimento, janela solicitada, observações e confirmar.

**Desktop:** coluna principal para itens e decisões; coluna lateral com resumo sticky.

**Mobile:** alerta → itens → entrega → observações → resumo → confirmar. Tabela vira lista de linhas com produto, disponibilidade, quantidade e subtotal.

**Regras visuais:**

- alertar item indisponível/baixo sem sugerir substituição automática;
- separar estimativa de janela de compromisso confirmado;
- confirmação é CTA único e irreversível somente se o domínio assim definir;
- sucesso persistente com número do pedido e próximo passo.

## 4. Management

### `/pedidos`

**Job:** localizar pedido, entender status e abrir detalhe.

**Desktop:** resumo pequeno e acionável, busca, filtros, DataTable.

**Mobile:** filtros em drawer, tabela convertida em lista de pedidos com campos prioritários; ação `Ver detalhes` sempre acessível.

**Colunas prioritárias:** número/status, data, total, previsão; itens e estabelecimento podem ser secundários conforme largura.

## 5. Detail

Futuras páginas de pedido, produto e entrega devem ter breadcrumb/contexto, PageHeader com identificador legível, StatusBadge e resumo, dados principais antes de histórico, timeline para eventos, ações contextualizadas e estados específicos de loading/empty/error.

Não transformar cada detalhe em modal; usar página para fluxo complexo.

## 6. Monitoring

Dashboard/logística deve responder “o que precisa de ação agora?”. KPI sem ação associada deve ser removido ou rebaixado. Exceções devem ter status textual, severidade e CTA.

## 7. Workflow

Para separação, expedição e entrega: uma tarefa principal por vez; contexto mínimo necessário; ação primária evidente; confirmação para ação irreversível; feedback local e histórico; suporte a touch e baixa conectividade quando aplicável.

## 8. Support

Lista de tickets com filtros simples e detalhe com contexto de pedido/entrega, status, mensagens e próxima ação. Não usar toast como único registro de atendimento.

## 9. Auth

O AuthShell atual é o melhor ponto de partida visual: superfície neutra, azul/ciano, Inter, formulário central e feedback acessível. Deve continuar separado do AppShell autenticado, mas compartilhar tokens, Button, Input, Alert e foco.
