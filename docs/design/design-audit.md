# DESIGN-AUDIT-001 — Auditoria visual e UX

**Status:** análise concluída; nenhum arquivo em `src/` foi alterado.
**Escopo:** checkout `prostock-web`, rotas, layouts, componentes locais, CSS Modules, CSS global, Auth, navegação, responsividade, tipografia, cores, espaçamento, grids, controles, estados e feedback.
**Fontes:** `context/PROMPT_maestri.txt`, `docs/current-state.md`, note DESIGN `ProStock B2B Logistics`, documentação de segurança/domínio e implementação presente em `src/`.

## 1. Resumo executivo

O produto é um protótipo navegável com quatro telas de cliente e um fluxo de autenticação recém-estabelecido. A principal oportunidade não é adicionar decoração: é consolidar um sistema visual único antes de expandir módulos operacionais.

Achados prioritários:

- **P0 — Continuidade da tarefa:** catálogo, carrinho e pedido não compartilham estado; `/pedido` usa dados estáticos e não representa necessariamente a seleção feita em `/catalogo`.
- **P0 — Confiança da interface:** vários controles parecem operacionais, mas apenas exibem aviso ou não executam a ação prometida.
- **P1 — Inconsistência sistêmica:** cada rota possui header, marca, navegação, botão, status, superfície e espaçamento próprios; não há componentes compartilhados.
- **P1 — Direção visual conflitante:** a implementação antiga usa verde/Arial; Auth usa azul/ciano/Inter; o note DESIGN propõe verde/Manrope+Inter. É necessária uma decisão única de tokens.
- **P1 — Arquitetura de página:** `/pedido` usa estilos inline e uma estrutura comprimida, sem responsividade dedicada; é o maior outlier visual e de manutenção.
- **P2 — Descoberta e filtros:** chips e filtros do catálogo não filtram de fato; filtros avançados, marca, disponibilidade, preço e ordenação são affordances sem comportamento.
- **P2 — Dados e leitura:** cards e métricas usam muito container e pouca hierarquia compartilhada; tabelas, status e números não seguem um padrão comum.
- **P3/P4 — Estados:** loading, retry, disabled, foco, teclado, erros acionáveis, tabelas mobile e anúncios assíncronos não estão sistematizados.

## 2. Inventário de rotas e shell

| Rota | Arquétipo | Implementação | Padrão observado | Problemas |
|---|---|---|---|---|
| `/` | Monitoring + Discovery | `page.tsx` + `page.module.css` | Header próprio, dashboard de cliente, cards, métricas, alertas, produtos | Navegação parcial; ações simuladas; verde/Arial; excesso de cards; dados locais |
| `/catalogo` | Discovery + Transaction | `page.tsx` + `catalogo.module.css` | Header próprio, busca, chips, filtros, grid, resumo lateral | Filtros visuais sem lógica; carrinho isolado; imagem é inicial; mobile transforma layout de forma limitada |
| `/pedido` | Transaction | `page.tsx` com inline styles | Header mínimo, tabela, entrega, observações, resumo sticky | Não usa CSS Module; sem responsividade dedicada; seleção de endereço/janela sem estado; confirmação simulada |
| `/pedidos` | Management + Monitoring | `page.tsx` + `pedidos.module.css` | Header próprio, resumo, toolbar, tabela, status | CSS Module contém seletores globais; tabela apenas com overflow horizontal; detalhe simulado |
| `/auth/*` | Auth | `auth-shell.tsx` + `auth.module.css` | Shell dividido, formulário, feedback e foco | É o padrão mais coerente, mas diverge visualmente do restante e ainda não é um shell de produto compartilhado |

Não há rotas de produto, pedido individual, entrega, estoque, atendimento, administração ou perfis por papel.

## 3. Inventário visual

### App shell e navegação

- Quatro headers independentes; alturas aproximadas de 62, 70 e 76px.
- Marca aparece como texto, glyph ou marca CSS diferente.
- Navegação usa `button`, `Link`, `span` e `b` para funções equivalentes.
- Estados ativos variam entre underline verde, cor verde e texto sem ação.
- Ícones são glyphs/emoji e não formam um sistema de ícones acessível.
- Não existe sidebar persistente, layout por papel ou breadcrumb compartilhado.

**Decisão recomendada:** consolidar `AppShell`, `Brand`, `PrimaryNav`, `HeaderActions`, `Breadcrumbs` e navegação por perfil. A navegação principal deve mostrar somente destinos reais; itens futuros devem ser ocultados ou marcados como indisponíveis de forma consistente, não parecerem botões funcionais.

### Page headers

- `/` usa hero/greeting e busca dentro de card.
- `/catalogo` usa título e subtítulo sem breadcrumb.
- `/pedido` usa link de retorno e título sem header compartilhado.
- `/pedidos` usa eyebrow em caixa alta, título, descrição e CTA.

**Problema:** mesma função recebe quatro hierarquias. Criar `PageHeader` com `eyebrow` opcional, título, descrição, ação primária e breadcrumbs.

### Botões e links

Inventário atual:

| Padrão | Onde | Problema | Destino |
|---|---|---|---|
| Primary verde | dashboard, catálogo, pedidos, checkout | mesma ação visual com valores diferentes | `Button variant="primary"` |
| Secondary verde contornado | dashboard, catálogo | espessura/radius/padding diferentes | `secondary` |
| Link textual verde | cards e tabelas | ação secundária sem alvo confortável consistente | `tertiary` |
| Botão de ícone/glyph | headers/cart | sem sistema, tooltip ou foco unificado | `IconButton` |
| Ação destrutiva textual | limpar carrinho | sem hierarquia de risco explícita | `destructive` |

Estados hover, focus, active, disabled e loading não são comuns entre rotas.

### Inputs, busca e filtros

- Inputs variam entre 38, 42, 46 e 48px.
- Labels visíveis existem em Auth e checkout; busca frequentemente depende de contexto visual.
- Bordas, radius e focus rings são locais.
- Catálogo exibe cinco filtros que não aplicam filtros.
- Pedidos possui busca funcional por ID e filtros funcionais por status.
- Não existe `FilterBar`, `SearchInput` ou estado de filtros ativos compartilhado.

### Cards, tabelas e dados

- Dashboard usa cards para pedido, métricas, categorias, alertas, sugestão e produtos.
- Catálogo usa card por produto e card de resumo.
- Pedidos usa uma tabela desktop sem alternativa mobile semântica.
- Checkout usa tabela com `overflow-x` e células inline.
- Cards têm múltiplos radii, bordas e sombras.
- Status aparecem como texto + cor em pedidos e produtos, mas não há `StatusBadge` comum.

### Modais, drawers, toasts e feedback

- Não há modal, drawer ou tooltip implementado.
- Avisos inline aparecem como `notice`, mas cada rota tem sua própria versão.
- Feedback de sucesso frequentemente é simulado por texto local.
- Não há padrão para erro de rede, retry, confirmação persistente ou anúncio global.

### Loading, empty e error

- Não há route-level loading/error/not-found.
- Empty state existe em `/pedidos`, mas não no catálogo nem no checkout.
- Spinner/skeleton não estão definidos.
- Erros de Auth estão mais maduros: alerta, foco e mensagens genéricas.

## 4. Foundations observadas

### Cores

Implementação histórica predominante: verdes em torno de `#007b52`, `#00875a`, `#9bf1c6`, fundo `#f1f4f3`.

Auth e tokens globais recentes: azul `#1457D9`, azul escuro `#102A56`, azul suave `#EAF2FF`, ciano `#00A8A8`, superfícies `#FFFFFF/#F5F7FA`.

Note DESIGN: green spectrum `#006A45/#008558`, Manrope para headlines.

**Inconsistência P1:** três direções competem. A proposta deste audit adota a fonte de autoridade do prompt mestre: azul/ciano + Inter, mantendo verde somente como status semântico. O note DESIGN deve ser tratado como referência de intenção (“Corporate Modern”, alta densidade, soft edge), não como token final até aprovação do MAESTRI.

### Tipografia

- Global atual carrega Inter via `next/font/google`.
- Auth aplica `--font-inter` corretamente.
- Páginas antigas usam implicitamente Arial/Helvetica ou não recebem escala deliberada.
- Não há distinção sistemática entre display, heading, body, label e caption.
- Textos de tabela e badges chegam a 9–12px, com risco de legibilidade e contraste.

### Espaçamento, radius e elevação

- Valores locais misturam 7, 9, 10, 11, 13, 17, 18, 21, 22, 23, 26, 27, 29, 31, 33, 34, 38 e 42px.
- Preferência atual pode ser normalizada em escala 4px.
- Radius varia de 4 a 22px em telas de mesma família.
- Sombras são leves, mas duplicadas em cada módulo.
- O note DESIGN recomenda 8px em controles e 24px em containers; o prompt mestre recomenda quiet UI e não transformar tudo em card. Proposta: 8px em controles, 12–16px em panels, 20–24px apenas em superfícies maiores.

### Layout e densidade

- Larguras máximas variam entre 1180, 1280 e 1420px.
- Dashboard usa grids 2fr/1fr e subgrids locais.
- Catálogo usa grid de três colunas + resumo lateral.
- Pedidos usa tabela de largura mínima 970px.
- Não há container, grid ou breakpoint compartilhado.
- Cliente pode usar densidade confortável; operação interna deve ter compact/default.

## 5. Consistency matrix

| Área | Dashboard | Catálogo | Checkout | Pedidos | Direção |
|---|---|---|---|---|---|
| Header | A | B | C | D | convergir para AppShell |
| PageHeader | A | B | C | D | convergir para PageHeader |
| Busca | A | B | — | C | SearchInput + comportamento por arquétipo |
| Filtros | categorias locais | chips + filtros falsos | — | status funcionais | FilterBar |
| Cards | muitos | produto/resumo | sections inline | métricas/panel | reduzir containers; Card semântico |
| Tabela | — | — | inline | CSS global em Module | DataTable + mobile alternative |
| Status | pills locais | badges locais | badges inline | classes locais | StatusBadge |
| Primary | verde | verde | verde | verde | token único azul |
| Feedback | notice local | notice local | texto local | notice local | InlineAlert/Toast/Status |
| Responsivo | regras próprias | regras próprias | insuficiente | regras próprias | breakpoints/layout primitives |

## 6. Heurísticas de Nielsen

1. **Visibilidade do estado:** progresso do pedido é compreensível, porém ações simuladas não informam claramente indisponibilidade; loading e falhas ausentes.
2. **Correspondência com o mundo real:** linguagem de catálogo/pedidos é adequada, mas “entrega hoje” e “confirmar pedido” parecem compromissos quando são mocks/estimativas.
3. **Controle e liberdade:** filtros podem ser limpos no catálogo; checkout não oferece mudança real de endereço/janela.
4. **Consistência:** principal problema sistêmico; headers, marca, cores e componentes divergem.
5. **Prevenção de erros:** confirmação não revalida estoque/preço; campos e ações críticas não têm estados completos.
6. **Reconhecimento:** cards e status ajudam reconhecimento, mas filtros visuais sem efeito geram falsa affordance.
7. **Flexibilidade:** cliente tem atalhos de repetição, mas não há busca, filtros e carrinho contínuos.
8. **Minimalismo:** dashboard tem excesso de cards e métricas sem decisão explícita.
9. **Recuperação:** mensagens de aviso são geralmente claras, mas não há retry e detalhe real.
10. **Ajuda:** “Preciso de ajuda” é uma ação simulada; suporte real ainda não existe.

## 7. Acessibilidade

Pontos bons:

- `lang="pt-BR"` no layout.
- Labels explícitos em Auth e parte do checkout.
- Auth possui foco, `aria-invalid`, `aria-describedby`, autocomplete e feedback com roles.
- Alvos principais têm alturas próximas de 44–48px.

Riscos:

- glyphs/emoji usados como ícones sem semântica consistente.
- Controles de navegação são `span` em várias telas.
- Tabelas não definem estratégia mobile além de scroll horizontal.
- Focus rings não são globais.
- Status e disponibilidade não devem depender somente de cor; tratamento varia por tela.
- Texto pequeno em badges, filtros e tabelas.
- `/pedido` possui controles sem labels/estados claros e textarea apenas com placeholder.
- `role="status"`/`role="alert"` não são sistematizados fora de Auth.
- Sticky/fixed cart e resumo precisam validar foco e reflow.

## 8. Bons padrões a preservar

- AuthShell com tokens semânticos, Inter, foco e mensagens genéricas.
- Busca do dashboard como ação dominante para o cliente.
- Pedido em andamento com progresso visual e próximo passo explícito.
- Tabela de pedidos para comparação de múltiplas linhas.
- Empty state de `/pedidos` com orientação para ajustar filtros.
- Uso de `pt-BR` para moeda.
- Uso de superfícies neutras, bordas discretas e sombras moderadas.
- Responsividade em dashboard/catalog/pedidos como ponto de partida.

## 9. Padrões a eliminar

- Duplicação de headers, marca e navegação.
- Verde como ação global enquanto Auth usa azul.
- Emoji/glyph como iconografia de produto.
- Cards para cada agrupamento de informação.
- Filtros que parecem funcionais mas não filtram.
- Inline styles no checkout.
- Seletores globais dentro de CSS Modules de pedidos.
- Tabelas comprimidas ou apenas com scroll horizontal no mobile.
- Botões de ação que apenas exibem “próxima etapa do MVP”.
- Números e espaçamentos arbitrários.

## 10. Ordem recomendada de remodelagem

1. Resolver decisão de direção cromática/tipográfica.
2. Criar foundations/tokens globais e primitives de layout.
3. Consolidar AppShell, navegação e PageHeader.
4. Consolidar Button, IconButton, Input, SearchInput, StatusBadge e feedback.
5. Consolidar FilterBar e DataTable/mobile list.
6. Reconstruir catálogo e carrinho como fluxo contínuo.
7. Reconstruir checkout responsivo e semanticamente validado.
8. Reconstruir pedidos/detalhe/entrega.
9. Criar shells por perfil e módulos operacionais.
10. Design QA visual, teclado, zoom, estados e contraste em todas as rotas.
