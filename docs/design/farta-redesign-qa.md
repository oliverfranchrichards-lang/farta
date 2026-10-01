# REDESIGN-001 — QA por lote

## BATCH: Foundations + App Shell + Auth piloto

**Data:** 29/09/2026  
**Resultado:** PASS

### ROUTES_UPDATED

- `/auth/login`: redesign visual completo do shell de autenticação;
- App Shell compartilhado aplicado às rotas autenticadas existentes;
- navegação desktop e bottom navigation mobile preservando os destinos atuais.

### DESIGN QA

**PASS** — autenticação validada em 1440×900 e 390×844; sidebar desktop,
navegação inferior mobile, tokens, foco, espaçamento e ausência de overflow aprovados.

### FUNCTIONAL QA

**PASS** — login, redirect por perfil, navegação do operador e logout validados
sem alteração de destinos ou permissões.

---

## BATCH: Catálogo + Pedidos + Fila operacional

**Data:** 29/09/2026  
**Resultado:** PASS (Design QA) / PENDING (QA autenticado CUSTOMER)

### ROUTES_UPDATED

- `/catalogo`: contexto de estabelecimento, busca, filtros, cards de produto e carrinho;
- `/pedidos`: resumo, filtros, tabela desktop e cards mobile;
- `/pedidos/[orderId]`: resumo, itens, histórico e ações existentes;
- `/operacao/pedidos`: fila, resumo, busca, filtro e estados responsivos.

### DESIGN_COMPONENTS_UPDATED

- preços destacados com token tipográfico numérico;
- timeline com cores semânticas por status;
- filtros com alvo mínimo de 44px;
- modal de cancelamento com nome, descrição e gestão de foco acessíveis;
- `Button` compartilhado encaminha `ref`, sem alteração da API visual.

### DESIGN QA

**PASS** — PRODUCT-DESIGN-DIRECTOR confirmou tokens Farta, cards, tabelas/listas,
semântica de status, responsividade estrutural e ausência de recursos da referência
que não pertencem ao produto atual.

### FUNCTIONAL QA

- **PASS:** `/operacao/pedidos` autenticado como `INTERNAL_OPERATOR`, em 390px e 1440px;
  navegação, logout e permissões preservados.
- **PENDING:** validação visual com dados reais em sessão `CUSTOMER` para `/catalogo`,
  `/pedidos` e `/pedidos/[orderId]`. O portal Maestri foi desconectado antes dessa etapa.

### RESPONSIVE QA

**PASS estrutural** — 390px e desktop validados na fila operacional; as rotas CUSTOMER
foram revisadas por código. A inspeção visual com dados de cliente permanece pendente.

### OUT_OF_SCOPE_FINDINGS

Nenhum recurso da referência foi incorporado. Estoque, atendimento, ofertas, mapa,
rastreamento e novas regras de negócio permanecem fora do escopo.

### NEXT_BATCH

Remodelar checkout (`/pedido`), notificações e o conjunto administrativo, preservando
fluxos e permissões. Antes de encerrar REDESIGN-001, executar a QA autenticada pendente.
