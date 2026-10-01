# ProStock — Design System Proposal

**Base:** DESIGN-AUDIT-001. Esta proposta é de sistema; não altera implementação nem requisitos de negócio.

## 1. Direção e decisão de consolidação

**Direção:** central operacional contemporânea, quiet UI, alta legibilidade, densidade controlada e feedback explícito.

O prompt mestre define azul/ciano/Inter como tokens de referência. O note DESIGN define a mesma intenção de produto profissional, mas apresenta uma paleta verde e Manrope. Para evitar dois sistemas, esta proposta recomenda:

- azul como ação, navegação ativa e seleção;
- ciano como movimento/logística e acento;
- verde apenas para sucesso/disponibilidade/conclusão;
- Inter como fonte única no MVP;
- Manrope não deve ser introduzida até haver decisão explícita do MAESTRI.

## 2. Foundations

### Tokens de cor

```css
:root {
  --color-action-primary: #1457d9;
  --color-action-primary-hover: #0e46b5;
  --color-action-primary-active: #0b3995;
  --color-brand-dark: #102a56;
  --color-brand-soft: #eaf2ff;
  --color-motion-accent: #00a8a8;
  --color-motion-accent-soft: #d8f4f4;

  --color-surface-page: #f5f7fa;
  --color-surface-raised: #ffffff;
  --color-surface-subtle: #f8fafc;
  --color-text-primary: #27364b;
  --color-text-secondary: #64748b;
  --color-text-on-dark: #dce8f7;
  --color-border-default: #dce3ec;
  --color-border-input: #cbd5e1;
  --color-focus-ring: rgb(20 87 217 / 24%);

  --color-status-success: #168a52;
  --color-status-success-soft: #eaf8f0;
  --color-status-warning: #a86f00;
  --color-status-warning-soft: #fff7df;
  --color-status-danger: #c9363e;
  --color-status-danger-soft: #fff0f1;
  --color-status-info: #1463a5;
  --color-status-info-soft: #eaf3fc;
}
```

Status sempre combina label + cor; ícone é opcional quando ajuda a diferenciar estados.

### Tipografia

Fonte: Inter, carregada no layout global.

| Token | Tamanho / peso / linha | Uso |
|---|---|---|
| `display` | 36/700/44 | somente hero operacional excepcional |
| `heading-1` | 32/700/40 | título de página principal |
| `heading-2` | 24/700/32 | seção ou título de detalhe |
| `heading-3` | 18/700/24 | card, grupo ou painel |
| `body-lg` | 16/400/24 | descrição importante |
| `body` | 14/400/20 | conteúdo padrão |
| `body-sm` | 13/400/18 | metadados |
| `label` | 13/600/18 | labels, tabs e headers curtos |
| `caption` | 12/500/16 | apoio; nunca para informação crítica |

Não usar texto funcional abaixo de 12px.

### Espaçamento

Unidade base 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- padding de página: 24px desktop, 16px mobile;
- gap entre campos relacionados: 16px;
- gap entre seções: 24–32px;
- padding de panel: 24px confortável, 16px compacto;
- tabelas: 12–16px vertical conforme densidade.

### Radius, bordas e elevação

- controle: 8px;
- panel: 12px;
- card maior: 16px; 24px somente em superfície de destaque justificada;
- pill/status: 999px;
- borda padrão: 1px `--color-border-default`;
- sombra L1: `0 4px 12px rgb(16 42 86 / 6%)`;
- sombra L2: `0 12px 32px rgb(16 42 86 / 12%)` para menu, drawer e modal.

Quiet UI: borda e agrupamento devem resolver hierarquia antes de sombra.

### Breakpoints e container

- mobile: `< 640px`;
- tablet: `640–1023px`;
- desktop: `>= 1024px`;
- container amplo: `max-width: 1280px`;
- conteúdo de formulário: `max-width: 480px`;
- conteúdo textual: `max-width: 720px`;
- grid desktop: 12 colunas, gutter 24px;
- mobile: uma coluna, gutter 16px.

### Motion

- transições de cor/borda: 120–180ms;
- entrada de drawer/modal: 180–240ms;
- sem animação decorativa;
- respeitar `prefers-reduced-motion`.

## 3. Componentes fundacionais

### `Button`

Variantes: `primary`, `secondary`, `tertiary`, `destructive`. Estados: default, hover, focus-visible, active, disabled, loading. Altura padrão 40px desktop e mínimo 44px para ações móveis/críticas.

### `IconButton`

Alvo mínimo 40–44px, accessible name obrigatório, tooltip somente como complemento.

### `Input`, `Textarea`, `Select`

Label visível, helper/error, `aria-invalid`, `aria-describedby`, foco global e altura 44–48px.

### `SearchInput`

Campo dominante em Discovery; suporte a limpar, loading, resultado vazio e atalho de teclado quando aplicável.

### `StatusBadge`

Mapeia estado de domínio para label, cor semântica e ícone opcional. Nunca usar cor isolada.

### `InlineAlert`, `Toast`

- `InlineAlert`: erro/atenção contextual e persistente;
- `Toast`: confirmação breve não crítica;
- erros de formulário permanecem próximos da origem.

### `PageHeader`, `Breadcrumbs`

Primitivas para responder “onde estou?”, “o que vejo?” e “qual ação principal?”.

### `FilterBar`

Estado ativo visível, limpar tudo, contagem, drawer mobile e persistência de contexto.

### `DataTable`

Cabeçalho semântico, alinhamento numérico, ordenação/filtragem explícitas, ações secundárias e estratégia mobile definida.

### `EmptyState`, `Skeleton`, `ErrorState`

Cada estado deve explicar contexto e próximo passo; skeleton preserva estrutura, não substitui feedback de falha.

### `Modal`, `Drawer`, `Dropdown`, `Tabs`, `Pagination`

Criar somente quando o fluxo exigir; usar padrões acessíveis de foco, escape, origem e retorno.

## 4. Componentes de domínio

- `ProductCard` para decisão rápida, não para todas as informações;
- `ProductRow` para listas densas;
- `StockIndicator` com disponibilidade categórica;
- `OrderStatus`/`OrderTimeline`;
- `OrderSummary`;
- `DeliveryStatus`/`DeliveryTimeline`;
- `CustomerSummary`;
- `SupportTicketCard`.

## 5. Layout primitives

### `AppShell`

Header + navegação por perfil + conteúdo + feedback global. Sidebar desktop somente para áreas operacionais com muitas rotas; drawer no mobile.

### `Page`

Container, padding, largura e fundo comuns.

### `ContentSection`

Seção com título opcional, descrição e ação contextual.

### Arquétipos

- `DiscoveryLayout`: busca, filtros, resultados, resumo opcional;
- `ManagementLayout`: PageHeader, filtros, DataTable/lista;
- `TransactionLayout`: revisão, decisões, resumo sticky e confirmação;
- `DetailLayout`: contexto, status, timeline e ações;
- `MonitoringLayout`: poucos indicadores acionáveis + exceções;
- `WorkflowLayout`: tarefa atual, contexto mínimo e próxima ação;
- `AuthLayout`: shell independente, mas usando tokens e primitives comuns.

## 6. Acessibilidade sistêmica

- WCAG 2.2 AA como mínimo;
- focus-visible global e nunca remover outline sem substituição;
- landmarks e heading hierarchy;
- labels visíveis;
- erros acionáveis e associados;
- status assíncronos com anúncio apropriado;
- targets de conforto de 44px para ações frequentes;
- reflow em 320px/200% zoom;
- teclado completo, escape em overlays e foco devolvido à origem;
- números, datas e moeda com alinhamento e leitura compreensíveis.

## 7. Decision log

1. Consolidar azul/ciano/Inter como base implementável, mantendo verde como semântica de sucesso/disponibilidade.
2. Absorver do note DESIGN: corporate modern, soft edge, 4px baseline, alta densidade, sombras ambientais e ícones lineares.
3. Não adotar automaticamente verde como ação nem Manrope sem aprovação, pois conflitam com a autoridade do prompt mestre.
4. Não criar segundo Primary Button em nenhuma rota.
