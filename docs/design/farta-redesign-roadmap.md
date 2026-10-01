# FARTA-DESIGN-001 — Roadmap de redesign

## Guardrails

Este roadmap é exclusivamente visual/UX-UI. Nenhuma etapa pode alterar backend, banco, RLS, APIs, autenticação, roles, payloads, estados de domínio, regras de estoque/pedido/entrega ou rotas funcionais. Achados fora desse escopo devem ser registrados, não corrigidos neste projeto.

## Fase 0 — baseline e inventário

Status: concluída antes desta especificação.

- proteger worktree e registrar validações;
- inventariar rotas, perfis, funções, desktop/mobile;
- capturar problemas visuais atuais;
- preservar referências de QA funcional anterior.

Saída: `redesign-baseline.md` e `screen-inventory.md`.

## Fase 1 — linguagem visual e tokens

Status: especificada.

- congelar Farta verde/laranja, neutros e estados;
- definir tipografia com fallback licenciado;
- definir spacing, radius, borda, breakpoints, foco e motion;
- documentar conflitos com tokens legados azul/ciano/Inter.

Saída: `farta-visual-language.md` e `farta-design-system.md`.

## Fase 2 — foundations e App Shell

Implementação a cargo do frontend após aprovação do MAESTRI.

- tokens globais Farta sem remover aliases necessários;
- logo/nome Farta em shell e auth;
- header/sidebar/mobile nav preservando links por perfil;
- normalizar Button, Input, Badge, Card, Alert, PageHeader e feedback;
- Design QA desktop/mobile e regressão de navegação.

Critério de saída: navegação, permissões e destinos permanecem idênticos; nenhuma tela funcional desaparece.

## Fase 3 — piloto

Implementar somente após aprovação do shell:

1. `/catalogo` — Discovery;
2. `/operacao/pedidos` — Workflow/DataTable;
3. `/pedidos/[orderId]` — Detail;
4. `/pedidos` em mobile — lista crítica.

Executar Design QA real e Functional Regression. Se o padrão for aprovado, congelar componentes antes do rollout.

## Fase 4 — cliente

Ordem: `/auth/*` visual, `/pedido`, `/pedidos`, `/pedidos/[orderId]`, `/notificacoes`, `/acesso-negado`.

- migrar por arquétipo, não por componente isolado;
- validar carrinho, checkout, confirmação, histórico, polling, notificações e recebimento;
- validar desktop, tablet e mobile.

## Fase 5 — operação e entrega

Ordem: `/operacao/pedidos`, `/operacao/entregas`.

- tabela/lista operacional Farta;
- filtros, status e ações na linha;
- tarefa do entregador mobile-first;
- manter atribuição, separação, despacho e confirmação;
- não introduzir mapa/rastreamento ausente.

## Fase 6 — administração

Ordem: empresas, detalhe, estabelecimentos, novo estabelecimento, convites, nova empresa e pedidos administrativos.

- management list/detail/form com o mesmo shell;
- estados de erro, vazio e loading;
- preservar convites, empresa, estabelecimento e permissões.

## Fase 7 — cobertura, Design QA e regressão

- atualizar `screen-inventory.md` por lote: `DESIGNED → IMPLEMENTED → DESIGN_REVIEW → QA → DONE`;
- revisar todas as rotas e subrotas em desktop/mobile/tablet;
- testar teclado, foco, contraste, zoom, 320px e reduced motion;
- executar lint, typecheck e build;
- Functional Regression: mesmas ações, dados, destinos, estados e permissões;
- produzir screenshots finais quando o ambiente permitir;
- registrar blockers e out-of-scope findings separadamente.

## Definition of Done

- nenhuma rota inventariada fica `NOT_STARTED`;
- branding Farta consistente e branding antigo removido da camada visível;
- todas as rotas possuem Design QA e Functional QA;
- não há mistura relevante entre token, shell, tipografia ou componente legado e Farta;
- desktop/mobile/tablet não têm quebra relevante;
- build/lint/typecheck passam ou problemas preexistentes estão documentados;
- nenhuma funcionalidade foi adicionada ou removida.

## OUT_OF_SCOPE_FINDINGS

- mapa, rastreamento em tempo real, ofertas e categorias adicionais da referência;
- módulos Estoque, Atendimento, Gestão e Suporte sem rota/contrato funcional no inventário;
- criação de dashboard/KPIs novos para coincidir com a imagem;
- conversão do logo raster em vetor/novo asset de marca;
- instalação de fontes proprietárias sem licença/asset aprovado;
- correção de bugs de backend, banco, autenticação, segurança ou regras de negócio encontrados durante QA.

## Gate de aprovação

Nenhum rollout completo deve começar antes de o MAESTRI aprovar esta linguagem, tokens, arquétipos e piloto. Após aprovação, cada lote deve reportar: rotas, componentes, arquivos, Design QA, Functional QA, Responsive QA, problemas visuais conhecidos e out-of-scope findings.

