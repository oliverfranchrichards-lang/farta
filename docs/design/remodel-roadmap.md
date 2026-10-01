# ProStock — Remodel Roadmap

**Objetivo:** convergir o protótipo atual para uma central operacional coerente, sem alterar regras de negócio nesta fase.

## Priorização

| Fase | Escopo | Impacto | Dependências | Critério de saída |
|---|---|---:|---|---|
| 0 | Decisão de direção | P0/P1 | MAESTRI | azul/ciano/Inter ou alternativa explicitamente aprovada |
| 1 | Foundations | P1/P4 | Fase 0 | tokens, type scale, spacing, radius, focus e breakpoints documentados |
| 2 | AppShell/navigation | P0/P1 | Fase 1 | um header/nav/breadcrumb responsivo por perfil |
| 3 | Primitives | P1/P4 | Fases 1–2 | Button, Input, Alert, Badge, PageHeader reutilizados |
| 4 | Discovery | P0/P2/P3 | Fases 1–3 | catálogo → carrinho contínuo, filtros verdadeiros, mobile validado |
| 5 | Transaction | P0/P2/P3/P4 | Fases 1–4 + domínio | checkout responsivo, estados e confirmação claros |
| 6 | Management/data | P1/P2/P3/P4 | Fases 1–3 | pedidos/estoque com DataTable e alternativa mobile |
| 7 | Detail/status | P1/P2 | Fases 3–6 | pedido, produto e entrega com timeline/status comum |
| 8 | Operational workflows | P0/P2/P4 | domínio + shell por papel | picking/expedição/driver orientados à tarefa |
| 9 | Hardening/QA | P3/P4/P5 | todas | Design QA, teclado, contraste, zoom, estados e regressão |

## Fase 0 — Decisão de direção

**Problema atual:** green/Arial nas telas antigas, blue/cyan/Inter em Auth e green/Manrope+Inter no note DESIGN.

**Recomendação:** aprovar azul/ciano/Inter como tokens de ação e usar verde apenas semanticamente. Preservar no note DESIGN a intenção corporate modern/soft edge.

**Gate:** nenhum remodel global antes da decisão.

## Fase 1 — Foundations

Entregar `globals.css` com tokens semânticos, Inter global efetiva, type scale, spacing 4px, radius/elevation, focus-visible, status colors, contrast checks, breakpoints, container e grid. Eliminar hex espalhado, radius arbitrário, sombras duplicadas e estilos inline.

## Fase 2 — AppShell e navegação

Entregar `AppShell`, marca única, header/nav por perfil, active state consistente, breadcrumb, mobile drawer e destinos não implementados sem falsa affordance. Impacto alto: reduz divergência em todas as páginas.

## Fase 3 — Primitives

Ordem: Button/IconButton → Input/Textarea/Select → SearchInput → Badge/StatusBadge → PageHeader/ContentSection → InlineAlert/Toast → Empty/Skeleton/Error → Tabs/FilterBar/Pagination → Modal/Drawer/Tooltip quando houver necessidade real.

## Fase 4 — Discovery

Prioridade: localizar → avaliar → selecionar.

- Catalogar dados e card/row compartilhados;
- conectar busca, categoria, marca, disponibilidade, preço e ordenação a comportamento real quando contratos existirem;
- carrinho compartilhado entre catálogo e pedido;
- resumo responsivo;
- estados de filtro, empty/error/loading;
- remover imagens-placeholder baseadas em inicial quando imagem real existir.

## Fase 5 — Transaction

Substituir inline styles por CSS Modules/primitives; definir lista de itens responsiva; tornar endereço/janela/observação estados explícitos; separar estimativa de compromisso; confirmar com feedback persistente; impedir falsa substituição automática; validar foco, teclado, zoom e leitura.

## Fase 6 — Management e dados

Corrigir pureza de CSS Modules; criar DataTable; definir coluna prioritária, alinhamento numérico e ações; mobile list/detail pattern; filtros ativos, limpar, paginação e estados; status comum.

## Fase 7 — Detail/status

Criar detalhe de pedido, produto/SKU e entrega com timeline, StatusBadge, breadcrumbs, ações contextuais e deep-link autorizado.

## Fase 8 — Operação

Aplicar shell e arquétipos por perfil:

- CUSTOMER: Discovery, Transaction, Detail, Support;
- INTERNAL_OPERATOR: Management, Monitoring, Workflow, Detail;
- DRIVER: Workflow/Delivery com contexto mínimo;
- PLATFORM_ADMIN: Management/Monitoring/Admin.

Não compartilhar uma navegação genérica para todos os papéis.

## Fase 9 — Design QA

Por rota: objetivo, contexto e CTA claros; tokens/componentes compartilhados; loading/empty/error/success/disabled; desktop/tablet/mobile; teclado/foco/semântica/contraste; zoom 200% e reflow; status sem depender de cor; sem scroll horizontal acidental; sem ação simulada apresentada como real; comparação intent vs implementação.

Classificação: `PASS`, `PASS_WITH_FIXES` ou `REJECTED` conforme impacto.

## Migração por impacto

1. AppShell/tokens antes de remodelar páginas.
2. Button/Input/Status/Feedback antes de catálogo/checkout.
3. Catálogo + carrinho + checkout como um fluxo, não três telas isoladas.
4. Pedidos/DataTable antes de dashboard operacional.
5. Status/timeline antes de entrega.
6. QA visual e acessibilidade em cada lote.

## Riscos e gates

- Paleta sem decisão: gate MAESTRI.
- Componentes sobre mocks divergentes: gate contratos de domínio/DTO.
- Sistema virar coleção de cards: revisar arquitetura por arquétipo.
- Visual corrigido mantendo ações falsas: cada CTA precisa de estado/destino real ou indicação explícita de indisponibilidade.

## Definition of Done global

- [ ] foundations aprovadas;
- [ ] shell e navegação consolidados;
- [ ] componentes reutilizados;
- [ ] fluxos principais contínuos;
- [ ] estados definidos;
- [ ] responsividade validada;
- [ ] WCAG 2.2 AA revisado;
- [ ] nenhuma nova inconsistência sem justificativa;
- [ ] Design QA aprovado por lote.
