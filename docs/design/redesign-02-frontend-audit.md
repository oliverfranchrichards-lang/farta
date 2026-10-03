# REDESIGN-02 — Auditoria técnica FRONTEND-NEXT

**Data da auditoria:** 2026-10-03  
**Escopo:** inventário frontend, rastreabilidade design → funcionamento e preparação dos lotes de redesign.  
**Regra:** nenhum código de implementação foi alterado nesta auditoria.  
**Commit observado:** `ce71565 feat: expand catalog administration and commercial flows`  
**Worktree:** já continha arquivos não rastreados anteriores à auditoria (`supabase-push.log` e o checkpoint de pausa do plano V1); foram preservados.

## 1. Resultado executivo

O projeto é uma aplicação Next.js App Router existente, com Supabase real, server actions, RPCs, RLS, autenticação por cookie e dados multiempresa. O redesign deve ser uma migração visual por arquétipos, não uma reconstrução de páginas.

O arquivo Pencil indicado em `redesign-02.md` está acessível em:

`C:\Users\olive\.pencil\documents\620c7e4a-0c42-4316-bb18-490255c78e3f\pencil-new.pen`

Os frames foram encontrados com as dimensões abaixo. As dimensões de canvas não devem ser copiadas como posicionamento absoluto; elas servem como referência de composição e viewport.

- Administração e autenticação: 1303 × 900, com exceção de telas longas.
- Cliente/compras: 1440 × 1420 ou 1610.
- Fila administrativa: 1303 × 1100.
- Detalhes administrativos: 1303 × 1100–1187.

Não há bloqueio técnico para iniciar o redesign depois da aprovação desta auditoria. Há, porém, bloqueios de validação: o repositório não declara testes unitários, integrados ou E2E; a validação visual autenticada de cliente está documentada como pendente; e o rollout não pode ser considerado concluído sem screenshots comparáveis e teste funcional por perfil.

## 2. Arquitetura encontrada

### Stack e comandos

| Área | Encontrado |
|---|---|
| Framework | Next.js `16.3.6`, App Router, React `19.2.8` |
| Linguagem | TypeScript `^5` |
| UI/estilos | React + CSS Modules; `src/app/globals.css` com tokens Farta e aliases legados |
| Dados/autenticação | Supabase JS `2.117.1`, `@supabase/ssr`, server client, cookies renovados por `src/proxy.ts` |
| Backend de aplicação | Server actions em `src/modules/**`; consultas Supabase e RPCs existentes |
| Upload/exportação | Supabase Storage; PDFKit/ExcelJS na exportação operacional |
| Imagens remotas | `next.config.ts` permite Wikimedia, Unsplash e subdomínios Supabase |
| Lint | `npm.cmd run lint` — PASS durante esta auditoria |
| Typecheck | `npm.cmd run typecheck` — PASS durante esta auditoria |
| Build | `npm.cmd run build` — gate existente; deve ser repetido por lote |
| Testes automatizados | Nenhum diretório/comando de Jest, Vitest, Playwright, Cypress ou testes encontrado |
| Dev | `npm.cmd run dev` (o projeto também documenta `npm run dev`) |

### Organização de rotas

As páginas vivem em `src/app`; a proteção de páginas é feita pelos layouts ou pela própria página. A proteção de dados continua no servidor/RLS e não deve ser substituída por esconder links.

- `src/app/layout.tsx`: layout raiz e `AppShell`.
- `src/app/catalogo/layout.tsx`, `pedido/layout.tsx`, `pedidos/layout.tsx`: `requireCustomerPage()`.
- Rotas administrativas: `requirePlatformAdmin()` em cada página.
- Rotas operacionais: `requireCompanyOperator()` e validação adicional de `DRIVER`/`INTERNAL_OPERATOR`.
- `/`, `/auth/callback`, `/auth/after-login` e `/auth/invite/accept`: redirecionamentos técnicos, sem tela de redesign própria.

### Shells e componentes compartilhados

- `AppShell` + `AppShell.module.css`: sidebar desktop, header, perfil, notificações, logout e marca Farta.
- `PrimaryNav` + `nav-config.ts`: links por `CUSTOMER`, `INTERNAL_OPERATOR`, `DRIVER` e `PLATFORM_ADMIN`; navegação compacta em tablet e inferior no mobile.
- `SignOutButton`: logout real via `supabase.auth.signOut`, seguido de `replace` e `refresh`.
- Primitivas UI: `Button`, `Input`, `Card`, `Badge`, `Feedback/Alert`, `EmptyState`, `ConfirmDialog`, `PageHeader`.
- Componente de domínio visual: `CartItemControls`.
- Componentes de fluxo: `OrdersQueue`, `ProductEditor`, `ProductsAdmin`, `CategoriesAdmin`, `BannersAdmin`, formulários de empresa/estabelecimento/convite e componentes de autenticação.

### Estilos

Há 25 arquivos CSS Modules. A base Farta está em `globals.css` com verde/laranja, neutros, tipografia Gilroy/Helvetica/Arial, escala 4–64px, radius 12/16px e aliases de compatibilidade (`--surface`, `--primary`, etc.). Ainda há divergências que o redesign precisa consolidar:

- `src/app/notificacoes/page.tsx` usa estilos inline, ao contrário do restante do sistema.
- Há hex/rgb diretamente em alguns módulos (`orders-queue`, `admin`, auth e navegação), embora exista token semântico correspondente.
- `page.module.css` mantém aliases/tipografia legados (`Manrope`/tokens de superfície) enquanto o restante usa tokens Farta.
- Alguns módulos usam `PageHeader`; outros montam cabeçalho, breadcrumb e feedback manualmente.
- `AdminCompanyPrices` é uma tela legada funcional adicional; o fluxo principal atual de preço de variante está no drawer de `ProductEditor` e deve continuar existindo.

## 3. Matriz de rastreabilidade design → funcionamento

Legenda de permissões: **Público**, **CUSTOMER**, **PLATFORM_ADMIN**, **INTERNAL_OPERATOR**, **DRIVER**. Os contratos abaixo são os existentes e devem ser preservados.

| Frame/estado do `.pen` | Rota existente | Página/componente | Serviço/ação e contrato | Permissão | Teste/validação requerida |
|---|---|---|---|---|---|
| `sKLrk` Login | `/auth/login` | `login/page.tsx`, `login-content.tsx`, `auth-shell.tsx` | `signIn`; redirect para `/auth/after-login` ou aceite de convite | Público; sessão Supabase | login válido/inválido, convite pendente, loading, erro, redirect por perfil |
| `KOx2B` Recuperação | `/auth/forgot-password` | `forgot-password/page.tsx`, `auth-shell.tsx` | `requestPasswordReset` | Público | e-mail válido/inválido, mensagem genérica, loading |
| `RbFrT` Cadastro | `/auth/signup` | `signup/page.tsx`, `signup-content.tsx` | `signUp`; callback real e convite | Público | cadastro, senha, confirmação, rate limit, sessão/callback |
| — Redefinição | `/auth/reset-password` | `reset-password/page.tsx` | `updatePassword` | Sessão de recuperação | senha/confirm, sucesso, erro e link de retorno |
| — Convite | `/auth/invite` | `invite/page.tsx`, `invite-content.tsx` | `acceptCompanyInvitation`; `/auth/invite/accept` | Público/autenticado | token válido/expirado, login, signup, aceite idempotente |
| — Entrada | `/` | `page.tsx` | `getCurrentUser`; redirect por role | Todos autenticados | sessão ausente e cada role |
| `Xkwdd` Empresas | `/admin/empresas` | `empresas/page.tsx` | `listCompanies` | PLATFORM_ADMIN | listagem, vazio, erro, link para detalhe/estabelecimentos |
| `l6fLqB`/`BgB9z` Estabelecimentos | `/admin/empresas/[companyId]/estabelecimentos` | page + `EstablishmentStatus` | `getCompany`, `listEstablishments`, `changeEstablishmentStatus` | PLATFORM_ADMIN | estado normal, confirmação de desativação, ativação, vazio, erro |
| — Nova empresa | `/admin/empresas/nova` | `CompanyForm` | `createCompany` | PLATFORM_ADMIN | validação de campos, submissão, erro, redirect |
| — Editar empresa | `/admin/empresas/[companyId]` | `CompanyEdit` | `getCompany`, `updateCompany`, `setCompanyStatus` | PLATFORM_ADMIN | carregar, editar, inativar, erro e retorno |
| `ILrZa` Convites | `/admin/empresas/[companyId]/convites` | `InviteForm` + lista | `listCompanyInvitations`, `createCompanyInvitation`, `revokeCompanyInvitation` | PLATFORM_ADMIN | role real, e-mail, link, revogar, pendente/expirado |
| — Preços legados | `/admin/empresas/[companyId]/precos` | `PricesAdmin` | `listAdminCompanyPrices`, `upsertAdminCompanyPrice` | PLATFORM_ADMIN | preço por empresa, erro, sem preço, sem vazamento |
| `HMEgx` Produtos | `/admin/produtos` | `ProductsAdmin` | `listAdminProducts`, mutations dentro do componente | PLATFORM_ADMIN | busca/status/ações, vazio, erro, contagem |
| `kZj4J` Categorias | `/admin/categorias` | `CategoriesAdmin` | `listAdminCategories`, create/update/delete com confirmação | PLATFORM_ADMIN | reassignment para Outros, inativar/excluir, erro, status |
| `tDBsF` Editar produto — principal | `/admin/produtos/[productId]` | `ProductEditor` | `updateAdminProduct` | PLATFORM_ADMIN | salvar, status, categoria, erro, loading |
| `Risda` Editar produto — variantes | mesma rota, estado/aba | `ProductEditor` | `listAdminVariants`, `createAdminVariant`, `updateAdminVariant` | PLATFORM_ADMIN | criar/editar/inativar SKU, unidade e mínimo |
| `E07F4` Editar variante — drawer | mesma rota, drawer sobreposto | `ProductEditor` + `catalog-admin.module.css` | `listAdminCompanyPrices`, `upsertAdminCompanyPrice(s)`, `updateAdminVariant` | PLATFORM_ADMIN | ESC/fechar, foco, empresa, “Todas recebem”, preço inativo, erro |
| `ywSb3` Editar produto — imagens | mesma rota, estado de imagens | `ProductEditor` | `listAdminProductImages`, `uploadAdminProductImage`, Storage | PLATFORM_ADMIN | tipos/tamanho, alt text, upload, erro e preview |
| `WU6Sk` Fila de pedidos | `/admin/pedidos` | `OrdersQueue` scope `admin` | `listAdminOrders`, `getCompanyOrderDetails`, `startOrderPicking`, `advanceOrderStatus`, `setOrderFinalPrices`, export | PLATFORM_ADMIN | filtros, métricas, drawers, transições, exportações |
| `S6mgJ` Pedido aguardando cliente | `/admin/pedidos`, drawer | `OrdersQueue` | `getCompanyOrderDetails`, contato manual/WhatsApp, status permitido | PLATFORM_ADMIN | itens/preços finais, transição correta, falha sem falso sucesso |
| `rm9SZ` Pedido aguardando análise | `/admin/pedidos`, drawer | `OrdersQueue` | `getCompanyOrderDetails`, `setOrderFinalPrices` | PLATFORM_ADMIN | salvar preços, observações, idempotência e status |
| — Fila operacional | `/operacao/pedidos` | `OrdersQueue` scope `company` | `listCompanyOrders`, `startCompanyOrderPicking`, `advanceOrderStatus`, `assignCompanyOrderDriver` | INTERNAL_OPERATOR | separação, pronto, entregador, despacho, status permitido |
| — Entregas | `/operacao/entregas` | `OrdersQueue` scope `driver` | `listCompanyOrders('DISPATCHED')`, `advanceOrderStatus` | DRIVER | somente pedidos atribuídos, entrega, acesso negado |
| `Sdnoa` Comprar vazio | `/catalogo` | `catalogo/page.tsx`, `BannerCarousel`, `CartItemControls` | `getCustomerContext`, `listActiveBanners`, `listCatalog`, `getActiveCart` | CUSTOMER | estabelecimento, vazio, erro, carregamento, imagens |
| `G4VM0i` Comprar preenchido | `/catalogo` | mesma página | `addCatalogItem`, `setCartItemQuantity`, `getActiveCart` | CUSTOMER | mínimo, preço, quantidade, remoção/desfazer, carrinho compartilhado |
| `L9mHNx` Muitos itens/resumo | `/catalogo` | mesma página, estado de lista/resumo | mesmas ações de catálogo/carrinho | CUSTOMER | overflow, resumo limitado, contador, muitos itens, mobile |
| `QFXql` Carrinho completo | `/pedido` | `pedido/page.tsx`, `CartItemControls` | `getActiveCart`, `setCartItemQuantity`, `listActiveAddresses`, `createAddress`, `selectCustomerEstablishment`, `confirmActiveCart` | CUSTOMER | endereço, janela, observação, payload, estoque, duplicidade |
| — Meus pedidos | `/pedidos` | `pedidos/page.tsx` | `listOrders`, `cancelOrder` | CUSTOMER | polling, filtros, tabela/lista, cancelamento |
| — Detalhe do pedido | `/pedidos/[orderId]` | page + `ReceiptAction`, `FinalPriceAction`, `CancelOrderAction` | `getOrderDetails`, `confirmFinalOrderPrice`, `confirmOrderReceipt`, `cancelOrder` | CUSTOMER | itens exatos, timeline, ações por status, acesso a outro pedido |
| — Notificações | `/notificacoes` | `notificacoes/page.tsx` | `listOrderNotifications` | CUSTOMER | lista, vazio, erro, links e status |
| `vyXQN` Perfil/configurações | `/perfil` | page + `ProfileForm` | `getCurrentUser`, `updateMyPhone`, `signOut` via shell | qualquer perfil autenticado; design do frame representa cliente | dados reais, telefone, remover contato, logout e limpeza de sessão |
| — Acesso negado | `/acesso-negado` | `AccessDeniedPage`, `AuthShell` | nenhum serviço mutável | todos | acesso por role, retorno, sem vazamento de dados |

### Rotas técnicas que não podem quebrar

| Rota | Responsabilidade |
|---|---|
| `/auth/callback` | troca código OAuth/confirmation por sessão e aceita convite quando presente |
| `/auth/after-login` | consulta perfil ativo e redireciona para o destino por role |
| `/auth/invite/accept` | aceita token após sessão e redireciona por perfil |
| `/api/operacao/pedidos/[orderId]/export` | autentica operador/admin e devolve PDF ou XLSX conforme formato |

## 4. Ações visíveis localizadas

| Ação | Implementação atual | Observação de redesign |
|---|---|---|
| Entrar, criar conta, recuperar/redefinir senha | `src/modules/auth/auth.actions.ts` + páginas auth | manter payload, cookies, callback e mensagens genéricas |
| Sair | `SignOutButton` → `signOut` | não transformar em simples link para login |
| Alterar estabelecimento | `selectCustomerEstablishment` + cookie `prostock-establishment` | ao trocar, limpar visualmente dados derivados sem alterar regra compartilhada |
| Buscar/filtrar/ordenar catálogo | estado local em `catalogo/page.tsx` | preservar produtos reais, disponibilidade, mínimos e preços |
| Adicionar/alterar/remover carrinho | `addCatalogItem`, `setCartItemQuantity`, `getActiveCart` | não substituir RPC/servidor por estado local |
| Cadastrar endereço | `createAddress` dentro de `/pedido` | preservar validações por campo e foco no erro |
| Enviar para análise | `confirmActiveCart` | não confundir com confirmação de preço final |
| Cancelar pedido | `cancelOrder` + `ConfirmDialog`/ação de cancelamento | respeitar status e permissão reais |
| Confirmar recebimento | `confirmOrderReceipt` | somente status permitido pelo servidor |
| Analisar/preçar pedido | `setOrderFinalPrices` | manter idempotência e sem falso sucesso |
| Separar/pronto/rota/entrega | `startCompanyOrderPicking`, `startOrderPicking`, `advanceOrderStatus` | botões devem refletir transições autorizadas, não apenas estado visual |
| Atribuir entregador | `assignCompanyOrderDriver` | preservar escopo da empresa e disponibilidade |
| Exportar | API `/api/operacao/pedidos/[orderId]/export` | manter PDF/XLSX e autorização |
| Salvar/inativar/excluir categoria | `admin_*category` actions/RPCs | confirmação de realocação para “Outros” é regra existente |
| Produto/variante/SKU | `admin_*product`, `admin_*variant` actions/RPCs | preservar SKU editável, mínimo, unidade e status |
| Preço por empresa | `upsertAdminCompanySkuPrice(s)` e drawer | “Todas recebem” deve continuar atomicamente validado no backend |
| Upload de imagem/banner | Storage + RPCs de admin | preservar tipo, tamanho, alt text e signed URLs |
| Convite | `createCompanyInvitation`, `acceptCompanyInvitation`, `revokeCompanyInvitation` | preservar enums internos de perfil; labels são só apresentação |
| Mensagem | `listDirect*`, `sendDirectMessage` | chat é direto e manual; não adicionar realtime/API de mensagens nesta fase |

## 5. Estado, feedback e acessibilidade atuais

Pontos fortes que devem ser preservados:

- `ConfirmDialog` usa `<dialog>`, `showModal`, ESC e devolução do foco ao acionador.
- `OrdersQueue` possui tratamento de drawer, foco e navegação por teclado mais completo que os módulos antigos.
- `ProductEditor` tem overlay, `role="dialog"`, `aria-modal`, ESC e fechamento por backdrop.
- `Input` associa erro/helper por `aria-describedby` e marca `aria-invalid`.
- `Button` encaminha `ref`, o que permite focus management.
- Shell possui skip link, `aria-current` e navegação mobile dedicada.
- Feedback usa `role="alert"` ou `role="status"` em diversos fluxos.
- O servidor continua autoridade para preço, disponibilidade, estoque, transições e autorização.

Lacunas/risco visual-funcional a validar no redesign:

- O drawer de variante não demonstra ainda trap de foco, restauração explícita do foco ao botão acionador ou bloqueio explícito da rolagem do fundo.
- A seleção de empresa no drawer é desabilitada por efeito imperativo (`select.disabled`, `style.opacity`, `style.cursor`); a implementação visual deve manter o estado sem quebrar semântica/teclado.
- Alguns formulários montam labels/erros manualmente, fora da primitiva `Input`; revisar associação e foco sem alterar contratos.
- `notificacoes/page.tsx` usa estilos inline e feedback simplificado; é o principal outlier do sistema compartilhado.
- A navegação e o shell inferem o perfil pelo pathname (`AppShell`), enquanto a autorização real vem do servidor. Isso é aceitável para apresentação atual, mas exige teste de URL direta e não deve ser usado como segurança.
- A página de perfil é visualmente genérica e o frame `vyXQN` é nomeado “Admin”, embora a instrução confirme que representa a conta do cliente; o redesign deve seguir permissões reais, não o nome do frame.
- Não há evidência de teste automatizado para submissão duplicada, falha de rede, console ou isolamento de dados; todos devem ser executados manualmente/por ferramenta de browser antes de marcar lote como concluído.

## 6. Mapa de inconsistências que impactam o frontend

1. **Shells:** autenticação tem shell próprio; rotas autenticadas usam `AppShell`; não existe ainda uma abstração visual explícita de `AdminShell`, `CustomerShell` e `OperationsShell`, embora o pathname altere navegação.
2. **Cabeçalhos:** mistura `PageHeader`, breadcrumbs manuais, cabeçalhos inline e telas sem cabeçalho compartilhado.
3. **Feedback:** existem `Alert/EmptyState`, mas várias páginas renderizam `div`, `p` ou estilos inline próprios para erro/vazio/loading.
4. **Formulários:** `Input` é compartilhado em cliente/auth parcial; admin usa muitos `<label><input>` locais e selects sem primitiva equivalente.
5. **Tabelas/listas:** cliente alterna tabela/mobile card; `OrdersQueue` possui implementação própria; admin empresas/produtos usa cards; o redesign deve compartilhar apresentação, não regras.
6. **Modal/drawer:** `ConfirmDialog`, drawer de pedidos, drawer de variante e diálogo de preços legados têm contratos visuais distintos.
7. **Tokens:** `globals.css` possui aliases de migração; `page.module.css` e alguns módulos ainda usam nomes/cores legados.
8. **Conteúdo:** diversos arquivos exibem caracteres corrompidos no checkout/admin quando lidos no encoding padrão do shell; isso deve ser confirmado no browser e corrigido somente se for problema real de arquivo, não no escopo visual sem evidência.
9. **Navegação:** a navegação do admin não aponta diretamente para categorias, preços, convites e estabelecimentos; esses fluxos são acessados por links contextuais. O redesign não deve inventar novos módulos, mas deve tornar os caminhos existentes encontráveis.
10. **Dados do design:** o `.pen` contém estados/abas ocultos e frames reutilizáveis; não renderizar todas as variantes simultaneamente nem criar uma rota por frame.

## 7. Arquitetura visual recomendada para implementação

1. **Foundations:** consolidar tokens Farta sem remover aliases necessários; confirmar carregamento/fallback de fontes e assets.
2. **Shells por contexto:** extrair apenas apresentação compartilhada para auth, admin, cliente e operações; manter `navByProfile`, guards e destinos atuais.
3. **Primitivas:** normalizar Button, Input/Select/Textarea, Badge/StatusBadge, Card/Panel, PageHeader, Alert/EmptyState, Table/MobileList, Modal/Drawer.
4. **Arquétipos:** Discovery, Transaction, Customer List, Order Detail, Workflow Queue, Delivery Queue, Administration List/Detail/Form.
5. **Estados:** definir visual único para loading, vazio, erro, sucesso, validação, disabled, busy, sem permissão e sessão expirada.
6. **Responsividade:** validar os frames em 1303px/1440px e depois 1024px, 768px, 390px e 320px; usar reflow natural em telas longas.

## 8. Ordem de lotes proposta

| Lote | Rotas/estados | Dependência | Critério de saída |
|---|---|---|---|
| 0 | Audit e confirmação de inventário | este documento + Product Design | escopo aprovado; sem implementação nesta fase |
| 1 | foundations, tokens, assets e shells | decisão visual do Product Design | navegação por perfil, logout e guards intactos; lint/typecheck/build |
| 2 | autenticação e acesso negado | lote 1 | login/signup/recuperação/reset/convite e estados de erro funcionais |
| 3 | piloto `/catalogo`, `/operacao/pedidos`, `/pedidos/[orderId]` | lote 1 | comparação visual + QA funcional autenticado |
| 4 | cliente: `/pedido`, `/pedidos`, `/notificacoes`, `/perfil` | piloto aprovado | carrinho, endereço, análise, polling, contato e logout preservados |
| 5 | operação: `/operacao/pedidos`, `/operacao/entregas` | primitivas de tabela/drawer | transições e atribuição preservadas por role/empresa |
| 6 | admin: empresas, estabelecimentos, convites, produtos, categorias, banners e `/admin/pedidos` | componentes de formulário/lista/drawer | ações existentes, RLS, status e exportação preservados |
| 7 | QA visual/regressão e documentação | todos os lotes | screenshots, console/rede, responsividade, acessibilidade e checklist final |

O lote 3 é o melhor piloto porque cobre três arquétipos diferentes e já possui referência funcional anterior. O lote 6 deve ser dividido internamente em empresas/estabelecimentos/convites e produtos/categorias/variantes/imagens para manter commits e revisões pequenos.

## 9. Testes e evidências obrigatórias por lote

### Gates técnicos

- `npm.cmd run lint`.
- `npm.cmd run typecheck`.
- `npm.cmd run build` ou `npm.cmd run check`.
- `git diff --check`.
- Nenhuma migration, RPC, contrato ou segredo alterado pelo redesign.

### QA funcional por perfil

- Cliente: login, trocar estabelecimento, buscar, adicionar respeitando mínimo, alterar/remover, atualizar página, revisar itens, endereço, janela e envio para análise.
- Admin: empresas, estabelecimentos, convites, categorias, produto/variante, preço por empresa, “Todas recebem”, upload, fila, análise, exportação.
- Operador: fila da empresa, separação, pronto, atribuição, rota e ausência de transições indevidas.
- Entregador: somente pedidos atribuídos e confirmação de entrega.
- Todos: acesso negado, logout real, sessão expirada e ausência de dados residuais após troca de conta.

### QA visual/acessibilidade

- screenshots na largura do frame e recortes completos para telas longas;
- 320px, 390px, 768px, 1024px, 1303px e 1440px;
- zoom 200%, teclado, ESC, foco visível, retorno de foco, contraste e `prefers-reduced-motion`;
- console sem erros e rede sem falhas novas;
- comparação lado a lado com o frame correspondente, registrando divergências justificadas.

## 10. Bloqueios e fora de escopo

### Bloqueios atuais

- Não há suíte automatizada declarada; QA deve ser criado/registrado com as ferramentas disponíveis no ambiente.
- QA autenticado de cliente está pendente na documentação anterior e precisa de conta/portal ativo para ser considerado validado.
- O foco do drawer de variante e o bloqueio de scroll precisam de validação/possível melhoria visual antes do lote ser aprovado.
- `implementation-plan.md` e `current-state.md` do changeset comercial ainda descrevem uma fase antiga; não são fonte de status do redesign e devem ser atualizados somente em lote documental autorizado.

### Fora de escopo

- novas rotas/módulos do design que não existem no produto;
- mapa, rastreamento em tempo real, estoque, ofertas, suporte ou dashboard/KPIs não contratados;
- API de WhatsApp/e-mail e chat em tempo real;
- mudanças em banco, RLS, RPCs, autenticação, roles, payloads, estoque, pagamentos ou regras de negócio;
- trocar dados reais por mock ou usar nomes/preços/imagens fixos do canvas;
- deploy, operações destrutivas e alteração de dependências sem aprovação.

## 11. Decisão necessária antes de codificar

O Product Design Director deve confirmar tokens, foundations, shell e o primeiro piloto. Depois dessa aprovação, o Frontend-NEXT pode executar os lotes na ordem acima, reportando por lote: arquivos/componentes alterados, integrações preservadas, testes executados, evidência visual, divergências justificadas, pendências e bloqueios.

**Status desta auditoria:** concluída para início da revisão/aprovação. **Implementação visual:** não iniciada por este agente.
