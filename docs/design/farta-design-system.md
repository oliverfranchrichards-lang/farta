# FARTA-DESIGN-001 — Design System Farta

Especificação visual para implementação em CSS global, CSS Modules e componentes React existentes. Não altera dados, APIs, rotas, permissões ou regras de negócio.

## Tokens semânticos

```css
:root {
  --farta-color-brand-primary: #1B3B2E;
  --farta-color-brand-hover: #12291F;
  --farta-color-brand-active: #0D1E17;
  --farta-color-accent: #F2994A;
  --farta-color-accent-hover: #D97D2E;
  --farta-color-surface-page: #FAF8F4;
  --farta-color-surface-primary: #FFFFFF;
  --farta-color-surface-secondary: #F4F1EB;
  --farta-color-text-primary: #14231D;
  --farta-color-text-secondary: #667369;
  --farta-color-text-muted: #87928B;
  --farta-color-border-default: #E7E2D9;
  --farta-color-border-strong: #CFC8BC;
  --farta-color-success: #2F9E62;
  --farta-color-success-soft: #EAF6EE;
  --farta-color-warning: #E3A008;
  --farta-color-warning-soft: #FFF6DB;
  --farta-color-danger: #D64545;
  --farta-color-danger-soft: #FDECEC;
  --farta-color-info: #2F80ED;
  --farta-color-info-soft: #EAF2FE;
}
```

Nunca inserir hex arbitrário em componente quando um token semântico resolver o caso. Não usar a cor da marca para significar erro, sucesso ou disponibilidade.

## Tipografia

| Token | Definição | Uso |
|---|---|---|
| `--farta-type-h1` | Gilroy 700, 40/48 | título principal em desktop |
| `--farta-type-h2` | Gilroy 700, 28/36 | título de seção |
| `--farta-type-h3` | Gilroy 700, 20/28 | card ou subseção |
| `--farta-type-body` | Helvetica/Arial 400, 16/24 | conteúdo e formulários |
| `--farta-type-body-sm` | Helvetica/Arial 400, 14/20 | tabela e metadados |
| `--farta-type-label` | Helvetica/Arial 700, 14/20 | controles e labels |
| `--farta-type-caption` | Helvetica/Arial 400, 13/18 | apoio |
| `--farta-type-number` | Recoleta 700, 36/40 | KPI/preço em destaque |

No mobile, H1 pode reduzir para 30/36 e H2 para 22/30; nunca reduzir texto funcional abaixo de 12px.

## Espaçamento, forma e elevação

- Escala base: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`.
- Padding de página: 32px desktop, 20px tablet, 16px mobile.
- Gap entre blocos: 24px; dentro de card: 16px; campos relacionados: 12–16px.
- `--farta-radius-control: 12px`; `--farta-radius-card: 16px`; `--farta-radius-pill: 999px`.
- `--farta-border-default: 1px solid var(--farta-color-border-default)`.
- Sem sombra em cards comuns; modal/dropdown: `0 16px 48px rgb(20 35 29 / 16%)`.

## Layout e breakpoints

- `mobile-small`: até 374px; `mobile`: 375–639px; `tablet`: 640–1023px; `laptop`: 1024–1279px; `desktop`: 1280px ou mais.
- Container de trabalho: `max-width: 1280px`; conteúdo textual: `max-width: 720px`; formulário: `max-width: 520px`.
- Desktop operacional: sidebar visual de 248–264px, área de conteúdo flexível.
- Mobile: sidebar colapsa; navegação inferior ou menu compacto preserva os mesmos destinos.
- Testar 320px, 390px, 768px, 1024px, 1440px e zoom 200%.

## Componentes

### Button

Variantes `primary` (verde), `accent` (laranja para ação de destaque quando necessário), `secondary`, `tertiary` e `destructive`. Altura 44px, radius 12px, loading com texto e disabled real. Apenas uma ação primária por área.

### Input, Select, Textarea, SearchInput

Label visível, 44–48px de altura, borda de 1px, foco com anel de 2px, helper/error ligado por `aria-describedby`. SearchInput recebe ícone linear e botão de limpar somente quando houver valor.

### Card / Panel / Divider

Fundo branco, borda, radius 16px e padding 16–24px. Panel pode ser uma superfície de trabalho sem elevação. Divider não substituirá heading ou agrupamento semântico.

### Badge / StatusBadge

Pill com texto mínimo de 12px. O domínio define o label; o token define a semântica. Ex.: `Em rota` informativo/verde conforme status atual, `Cancelado` danger, `Pronto` success. Nunca comunicar somente por cor.

### Modal / Drawer / Dropdown

Modal nativo com overlay, `Esc`, foco preso e foco devolvido. Drawer somente quando preservar contexto for equivalente à página atual; não trocar fluxo funcional. Dropdown deve ter teclado e alvo de origem claro.

### Table / MobileList

Desktop preserva alinhamento e comparação; headers semânticos, ações junto à linha. Mobile pode trocar tabela por lista/card, mas mantém dados, filtros e ações equivalentes.

### PageHeader / SectionHeader / EmptyState / Alert / Toast / Skeleton

Primitivas compartilhadas para hierarquia e feedback. Empty/error sempre dizem o que ocorreu e o próximo passo. Skeleton não substitui mensagem de falha. Toast não deve conter erro crítico que o usuário precisa recuperar.

## Iconografia e motion

- Ícones outline, espessura 1.5px, 16–20px, `aria-hidden` quando acompanhados de texto.
- Transições de cor/borda 150ms; modal/drawer 180–240ms.
- Respeitar `prefers-reduced-motion`; nenhum movimento decorativo ou parallax.

## Acessibilidade

Meta WCAG 2.2 AA: contraste, foco visível, teclado, landmarks, headings, labels, status anunciados, touch target mínimo 44px, reflow sem overflow, `aria-invalid` em erro e não dependência exclusiva de cor.

## Mapeamento para componentes atuais

`AppShell`/`PrimaryNav` tornam-se shell Farta visual; `Button`, `Input`, `Badge`, `Card` e `ConfirmDialog` recebem os tokens; `orders-queue` e telas de pedidos usam `Table/MobileList`, `StatusBadge` e `PageHeader`. A implementação deve preservar os mesmos props, callbacks, actions e contratos sempre que possível.

