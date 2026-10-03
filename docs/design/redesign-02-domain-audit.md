# REDESIGN-02 â€” Auditoria Product Domain

**Status:** auditoria concluÃ­da; nenhum cÃ³digo, migration, RPC ou contrato foi alterado.

**Objetivo:** mapear os frames aprovados no Pencil para o funcionamento real do Farta, preservando autenticaÃ§Ã£o, autorizaÃ§Ã£o, dados reais, contratos Supabase e isolamento multiempresa durante o redesign.

**Fontes consultadas:** `inspirations/instructions/redesign-02.md`, `pencil-new.pen` (arquivo local indicado pelas instruÃ§Ãµes), `AGENTS.md`, rotas em `src/app`, aÃ§Ãµes em `src/modules`, componentes compartilhados, `src/proxy.ts`, `src/lib/auth/current-user.ts` e migrations Supabase vigentes.

## 1. ConclusÃ£o executiva

O produto jÃ¡ possui backend e fluxos reais para os mÃ³dulos desenhados. O redesign pode ser executado como migraÃ§Ã£o de apresentaÃ§Ã£o, sem mudanÃ§a de banco ou domÃ­nio, desde que os controles do canvas sejam tratados como estados visuais dos fluxos existentes.

Os principais conflitos sÃ£o:

1. O canvas contÃ©m aÃ§Ãµes que nÃ£o existem no produto atual, especialmente `Login with Google`, busca/filtro/paginaÃ§Ã£o em algumas telas administrativas e labels de navegaÃ§Ã£o que nÃ£o correspondem exatamente aos destinos reais.
2. O canvas usa dados demonstrativos fixos; a aplicaÃ§Ã£o deve continuar usando dados vindos do Supabase.
3. A referÃªncia do perfil Ã© rotulada como â€œAdminâ€, mas a especificaÃ§Ã£o diz que representa a conta do cliente. A rota `/perfil` atualmente Ã© acessÃ­vel a qualquer usuÃ¡rio ativo e mostra o papel real; nÃ£o deve ser restringida nem receber informaÃ§Ãµes fictÃ­cias.
4. Os frames de cliente mostram produtos com preÃ§o estimado; no sistema atual um SKU ativo sem preÃ§o da empresa pode ser exibido, mas nÃ£o pode ser adicionado ao carrinho.
5. A navegaÃ§Ã£o atual Ã© decidida principalmente pelo pathname no `AppShell`; isso Ã© apresentaÃ§Ã£o, mas nÃ£o pode substituir as proteÃ§Ãµes server-side por perfil.

**DecisÃ£o de domÃ­nio para o redesign:** preservar as aÃ§Ãµes existentes e seus contratos; adaptar ou ocultar visualmente qualquer affordance nÃ£o suportada. Nenhuma funcionalidade do .pen deve ser criada apenas porque aparece desenhada.

## 2. Arquitetura funcional encontrada

### Stack e organizaÃ§Ã£o

- Next.js `16.3.6`, React `19.2.8`, TypeScript `5`, App Router.
- Supabase SSR e `supabase-js` para sessÃ£o, consultas, RPCs, RLS e Storage.
- Server Components para carregamento inicial e Server Actions em `src/modules/*` para mutaÃ§Ãµes.
- CSS Modules por mÃ³dulo e tokens globais em `src/app/globals.css`; componentes compartilhados em `src/components`.
- NÃ£o hÃ¡ suÃ­te automatizada de E2E/unitÃ¡ria detectada no repositÃ³rio. Os gates disponÃ­veis sÃ£o lint, typecheck, build e testes manuais autenticados.

### SessÃ£o e proteÃ§Ã£o

- `src/proxy.ts` atualiza cookies da sessÃ£o; ele nÃ£o Ã© a fronteira de autorizaÃ§Ã£o.
- A autorizaÃ§Ã£o real ocorre em `requireCustomerPage`, `requirePlatformAdmin`, `requireCompanyOperator`, Server Actions, RPCs e RLS.
- Perfis internos: `CUSTOMER`, `INTERNAL_OPERATOR`, `DRIVER`, `PLATFORM_ADMIN`.
- Clientes tÃªm `company_id` obrigatÃ³rio; os outros papÃ©is operacionais/plataforma nÃ£o tÃªm `company_id` no perfil-base, com membership/convite aplicado conforme o fluxo.
- Logout real: `signOut()` em `src/modules/auth/auth.actions.ts`, usado por `SignOutButton`. NÃ£o substituir por simples navegaÃ§Ã£o para `/auth/login`.

### Isolamento

- Cliente: `resolveCustomerContext()` exige perfil `CUSTOMER` ativo, membership ativo e seleciona um estabelecimento ativo da prÃ³pria empresa por cookie `prostock-establishment` ou primeiro estabelecimento disponÃ­vel.
- CatÃ¡logo e preÃ§os sÃ£o globais por SKU/produto, mas preÃ§o vigente Ã© por empresa.
- Carrinho Ã© por empresa + estabelecimento; o mesmo carrinho Ã© compartilhado pelos membros autorizados daquele estabelecimento.
- Pedidos sÃ£o consultÃ¡veis pelos membros ativos da empresa conforme as polÃ­ticas RLS vigentes. O servidor valida empresa, estabelecimento, membership, preÃ§o, quantidade mÃ­nima e status antes de mutaÃ§Ãµes.
- Detalhes operacionais usam `company_get_order_details`: plataforma pode consultar; operador interno consulta dentro da prÃ³pria empresa; entregador consulta somente pedido atribuÃ­do. O cliente usa as consultas protegidas de pedidos prÃ³prios/da empresa, conforme RLS.
- Conversas sÃ£o diretas e limitadas a participantes autorizados da mesma empresa; as RPCs e policies de chat nÃ£o permitem leitura arbitrÃ¡ria.

## 3. Matriz design â†’ funcionamento

### AutenticaÃ§Ã£o

| Frame | Rota atual | ImplementaÃ§Ã£o/contrato | PermissÃ£o | ObservaÃ§Ãµes de produto |
|---|---|---|---|---|
| `sKLrk` Login | `/auth/login` | `LoginContent` â†’ `signIn`; redirect para `/auth/after-login` ou aceite de convite | PÃºblica; sessÃ£o criada pelo Supabase | Campos e estados de erro/loading existem. O frame contÃ©m `Login with Google`, mas nÃ£o hÃ¡ OAuth Google implementado. NÃ£o renderizar como aÃ§Ã£o funcional sem autorizaÃ§Ã£o de produto/backend. |
| `KOx2B` RecuperaÃ§Ã£o | `/auth/forgot-password` | `requestPasswordReset` | PÃºblica | Envia link pelo Supabase; manter mensagem genÃ©rica e nÃ£o revelar se o e-mail existe. |
| `RbFrT` Cadastro | `/auth/signup` | `signUp`; cadastro comum nÃ£o concede empresa; cadastro com convite preserva token | PÃºblica | Validar senha, confirmaÃ§Ã£o, loading e estado de confirmaÃ§Ã£o. O texto do frame sobre acesso de empresa deve ser mantido semanticamente. |
| â€” | `/auth/reset-password` | `updatePassword` | SessÃ£o de recuperaÃ§Ã£o | NÃ£o hÃ¡ frame listado, mas o fluxo tÃ©cnico deve continuar. |
| â€” | `/auth/invite`, `/auth/invite/accept` | `acceptCompanyInvitation` e redirects de sessÃ£o | Link + sessÃ£o autenticada | NÃ£o transformar aceite em simples estado visual; token, e-mail, papel convidado e expiraÃ§Ã£o continuam server-side. |

### Admin â€” empresas, estabelecimentos e convites

| Frame | Rota atual | ImplementaÃ§Ã£o/contrato | PermissÃ£o | Lacunas/conflitos |
|---|---|---|---|---|
| `Xkwdd` Empresas | `/admin/empresas` | `listCompanies`, `createCompany`; cards atuais com links de ediÃ§Ã£o/estabelecimentos | `PLATFORM_ADMIN` ativo | Frame mostra tabela, busca, filtro de status e paginaÃ§Ã£o; a rota atual entrega cards e nÃ£o possui busca/filtro/paginaÃ§Ã£o. Esses controles nÃ£o podem ser conectados a mocks. Confirmar se serÃ£o apenas composiÃ§Ã£o visual ou se haverÃ¡ autorizaÃ§Ã£o para ampliar o domÃ­nio. |
| `l6fLqB` Estabelecimentos + confirmaÃ§Ã£o | `/admin/empresas/[companyId]/estabelecimentos` | `listEstablishments`, `setEstablishmentStatus`; `EstablishmentStatus`/`ConfirmDialog` | `PLATFORM_ADMIN` ativo | A confirmaÃ§Ã£o de desativaÃ§Ã£o existe. A listagem atual nÃ£o possui busca/filtro; o status real deve ser usado. O estabelecimento pertence ao `companyId` da URL, validado pelo RPC. |
| `BgB9z` Estabelecimentos sem modal | Mesma rota | Mesmo contrato | Mesmo | Ã‰ estado normal da mesma rota, nÃ£o rota nova. A aÃ§Ã£o `Gerenciar convites` aponta para a rota de convites da empresa. |
| `ILrZa` Convites | `/admin/empresas/[companyId]/convites` | `listCompanyInvitations`, `createCompanyInvitation`, `revokeCompanyInvitation` | `PLATFORM_ADMIN` ativo | O frame prevÃª perfis Cliente, Entregador e Operador interno, todos suportados por `invited_role`. Labels sÃ£o apresentaÃ§Ã£o; payload deve continuar usando os enums internos. Busca por e-mail desenhada nÃ£o existe atualmente e nÃ£o deve fingir filtrar. |
| â€” | `/admin/empresas/nova`, `/admin/empresas/[companyId]`, `/admin/.../estabelecimentos/novo` | `createCompany`, `updateCompany`, `createEstablishment`, status RPCs | `PLATFORM_ADMIN` ativo | NÃ£o hÃ¡ frames especÃ­ficos no inventÃ¡rio do .pen, mas devem receber tokens/shell do mÃ³dulo sem remoÃ§Ã£o de campos cadastrais. |

### Admin â€” produtos, categorias, variantes e imagens

| Frame | Rota atual | ImplementaÃ§Ã£o/contrato | PermissÃ£o | ObservaÃ§Ãµes |
|---|---|---|---|---|
| `HMEgx` Produtos | `/admin/produtos` | `listAdminProducts`, `listAdminCategories`, `ProductsAdmin`; ediÃ§Ã£o via `/admin/produtos/[productId]` | `PLATFORM_ADMIN` ativo | Listagem, ediÃ§Ã£o, status e contagem real devem usar dados do RPC. Busca/filtro sÃ³ podem permanecer se estiverem implementados localmente; nÃ£o usar nomes, preÃ§os ou contagens do canvas. |
| `kZj4J` Categorias | `/admin/categorias` | `listAdminCategories`, `createAdminCategory`, `updateAdminCategory`, `deleteAdminCategory` | `PLATFORM_ADMIN` ativo | A confirmaÃ§Ã£o de inativaÃ§Ã£o/exclusÃ£o com produtos deve permanecer: RPC pode realocar para `Outros`; nÃ£o remover aviso nem alterar a regra. Busca/filtro mostrados no frame nÃ£o tÃªm contrato de backend atual. |
| `tDBsF` InformaÃ§Ãµes principais | `/admin/produtos/[productId]` | `updateAdminProduct`; abas sÃ£o estados da mesma rota | `PLATFORM_ADMIN` ativo | Preservar nome, marca, categoria, descriÃ§Ã£o e status. NÃ£o transformar aba em rota separada. |
| `Risda` Variantes | Mesma rota, estado/aba | `listAdminVariants`, `createAdminVariant`, `updateAdminVariant`; preÃ§os por empresa | `PLATFORM_ADMIN` ativo | SKU, unidade, venda mÃ­nima e status sÃ£o dados reais. â€œTodas recebem esse preÃ§oâ€ usa RPC bulk jÃ¡ existente e deve respeitar empresas autorizadas. |
| `E07F4` Drawer de variante | Mesma rota, drawer | Mesmo contrato + `admin_upsert_company_sku_price(s)` | `PLATFORM_ADMIN` ativo | Drawer Ã© apresentaÃ§Ã£o. Salvar variante e salvar preÃ§o sÃ£o mutaÃ§Ãµes distintas; nÃ£o misturar sucesso de uma com a outra. Checkbox deve refletir o estado real dos preÃ§os, nÃ£o apenas o Ãºltimo clique. SKU inativo pode ter preÃ§o preparado, mas nÃ£o pode entrar no catÃ¡logo/carrinho. |
| `ywSb3` Imagens | Mesma rota, aba | `listAdminProductImages`, upload Storage e `admin_create_product_image` | `PLATFORM_ADMIN` ativo; leitura autenticada conforme policies | Preservar validaÃ§Ã£o JPEG/PNG/WebP, atÃ© 5 MB e texto alternativo. NÃ£o trocar Storage por URLs fictÃ­cias ou imagens do canvas. |

### Admin/OperaÃ§Ã£o â€” pedidos

| Frame | Rota atual | ImplementaÃ§Ã£o/contrato | PermissÃ£o | ObservaÃ§Ãµes |
|---|---|---|---|---|
| `WU6Sk` Fila | `/admin/pedidos` e `/operacao/pedidos` | `listAdminOrders` ou `listCompanyOrders`; `OrdersQueue` com busca/status, polling e aÃ§Ãµes | Plataforma; operador interno na prÃ³pria empresa | Status exibidos devem ser labels dos enums reais. NÃ£o remover status nÃ£o desenhado: `CANCELLED`, `CONFIRMED`, `SUBMITTED_FOR_REVIEW`, `PICKING`, `READY_FOR_DISPATCH`, `DISPATCHED`, `DELIVERED`, `RECEIPT_CONFIRMED` e equivalentes vigentes. |
| `S6mgJ` Aguardando cliente | Drawer dentro da fila | `getCompanyOrderDetails`, exportaÃ§Ã£o XLSX/PDF, contato manual via WhatsApp | Plataforma/operador; detalhe do entregador somente se atribuÃ­do | O WhatsApp Ã© link manual, nÃ£o API. Itens, SKU, unidade, quantidade e totais devem vir do snapshot do pedido. |
| `rm9SZ` Aguardando anÃ¡lise | Drawer dentro da fila | `setOrderFinalPrices`, `getCompanyOrderDetails`, exportaÃ§Ã£o | Plataforma/operador autorizado | Salvar preÃ§o final nÃ£o confirma compra. Depois da anÃ¡lise, o cliente revisa e confirma por fluxo prÃ³prio. NÃ£o permitir transiÃ§Ã£o apenas por mudar badge visual. |
| â€” | `/operacao/entregas` | `listCompanyOrders('DISPATCHED')`, `advanceOrderStatus('DELIVERED')` | Apenas `DRIVER` e atribuiÃ§Ã£o vigente | Driver nÃ£o deve enxergar a fila inteira da empresa; RPC/RLS devem continuar filtrando pedidos atribuÃ­dos. |

### Cliente â€” comprar e carrinho

| Frame | Rota atual | ImplementaÃ§Ã£o/contrato | PermissÃ£o | ObservaÃ§Ãµes |
|---|---|---|---|---|
| `Sdnoa` Carrinho vazio | `/catalogo` | `getCustomerContext`, `listCatalog`, `getActiveCart`, banners, `addCatalogItem` | `CUSTOMER` ativo + membership ativo | Estabelecimento, banners, categorias e produtos sÃ£o reais. Carrinho vazio Ã© estado do mesmo catÃ¡logo. NÃ£o usar nomes/preÃ§os/imagens do frame como seed visual. |
| `G4VM0i` Carrinho preenchido | `/catalogo` | `getActiveCart`, `setCartItemQuantity`, `addCatalogItem` | Mesmo | Carrinho Ã© compartilhado por estabelecimento. Contador do shell deve representar produtos distintos se essa semÃ¢ntica for mantida; volumes ficam no resumo. Quantidade mÃ­nima Ã© validada no servidor. |
| `L9mHNx` Muitos itens | `/catalogo` | Mesmo estado, resumo limitado localmente | Mesmo | NÃ£o criar nova rota; â€œVer carrinho completoâ€ aponta para `/pedido`. Itens ocultos devem continuar acessÃ­veis no checkout. |
| `QFXql` RevisÃ£o/entrega | `/pedido` | `getActiveCart`, `listActiveAddresses`, `createAddress`, `selectCustomerEstablishment`, `confirmActiveCart` â†’ `submit_order_for_review` | `CUSTOMER` ativo + membership ativo | Envio Ã© para anÃ¡lise, nÃ£o confirmaÃ§Ã£o de compra. EndereÃ§o, estabelecimento, janela, mÃ­nimo, preÃ§o, estoque e idempotÃªncia sÃ£o validados no servidor. ObservaÃ§Ã£o do frame sÃ³ pode ser enviada se o contrato existente for preservado; nÃ£o adicionar campo ao payload por causa do desenho. |

### Cliente â€” perfil e mensagens

| Frame | Rota atual | ImplementaÃ§Ã£o/contrato | PermissÃ£o | ObservaÃ§Ãµes |
|---|---|---|---|---|
| `vyXQN` Perfil/configuraÃ§Ãµes | `/perfil` | `getCurrentUser`, `ProfileForm`, `updateMyPhone`, `signOut` | Qualquer usuÃ¡rio ativo; role Ã© exibido de forma real | Apesar do nome â€œAdminâ€ no frame, usar semÃ¢ntica de conta real. NÃ£o hardcode â€œClienteâ€ para operador/driver/admin. Manter explicaÃ§Ã£o de contato manual e remover telefone via campo vazio. Sair deve encerrar a sessÃ£o. |
| â€” | `/mensagens`, `/mensagens/[conversationId]` | `listDirectConversations`, `listDirectMessages`, `sendDirectMessage`, `createDirectConversation` | Participantes autorizados, mesma empresa | O frame de cliente pode mostrar â€œMensagensâ€, mas a rota nÃ£o deve ser escondida ou exposta por papel sem manter a autorizaÃ§Ã£o RPC/RLS. NÃ£o prometer tempo real: implementaÃ§Ã£o atual Ã© consulta/envio direto. |
| â€” | `/notificacoes` | `listOrderNotifications` | Cliente/membership conforme consultas | NotificaÃ§Ãµes sÃ£o derivadas do histÃ³rico; nÃ£o inventar centro de notificaÃ§Ãµes alÃ©m do fluxo existente. |

## 4. AÃ§Ãµes visÃ­veis e contrato real

| AÃ§Ã£o visual | ImplementaÃ§Ã£o real | Regra a preservar |
|---|---|---|
| Entrar | `signIn` | SessÃ£o Supabase, convite opcional e redirect por perfil |
| Criar conta | `signUp` | Cadastro normal nÃ£o associa empresa; convite associa somente apÃ³s aceite vÃ¡lido |
| Recuperar/redefinir senha | `requestPasswordReset`, `updatePassword` | Mensagens seguras e sessÃ£o de recuperaÃ§Ã£o |
| Sair | `signOut` | Invalidar sessÃ£o e limpar estado visual ao trocar de usuÃ¡rio |
| Trocar estabelecimento | `selectCustomerEstablishment` | Cookie de contexto; limpar/recarregar carrinho e endereÃ§os do estabelecimento selecionado |
| Buscar/filtrar catÃ¡logo | estado local da rota | SÃ³ conectar filtros quando o campo/contrato existir; nÃ£o transformar chips decorativos em promessa falsa |
| Adicionar produto | `addCatalogItem` â†’ `add_to_establishment_cart` | SKU ativo, preÃ§o vigente, membership, estabelecimento e mÃ­nimo |
| Alterar quantidade/remover | `setCartItemQuantity` | Inteiro, limite, mÃ­nimo e remoÃ§Ã£o com quantidade zero |
| Cadastrar endereÃ§o | `createAddress` | EndereÃ§o pertence ao estabelecimento; validaÃ§Ã£o e status ativo |
| Enviar para anÃ¡lise | `confirmActiveCart` â†’ `submit_order_for_review` | Carrinho/endereÃ§o/janela/empresa/estoque/preÃ§o validados server-side; idempotÃªncia |
| Definir preÃ§o final | `setOrderFinalPrices` | Somente operador/plataforma autorizado; nÃ£o confirma pedido |
| Confirmar preÃ§o final/compra | `confirmFinalOrderPrice` | Cliente decide apÃ³s revisÃ£o; reserva/estoque e idempotÃªncia continuam server-side |
| Iniciar separaÃ§Ã£o | `startOrderPicking`/`startCompanyOrderPicking` | Perfil e transiÃ§Ã£o de status reais |
| Marcar pronto, enviar rota, entregar | `advanceOrderStatus`; atribuiÃ§Ã£o por `assignCompanyOrderDriver` | TransiÃ§Ãµes vÃ¡lidas por perfil/status; driver sÃ³ em pedido atribuÃ­do |
| Editar/inativar empresa/estabelecimento | RPCs admin | Plataforma ativa; confirmaÃ§Ã£o para aÃ§Ã£o destrutiva; histÃ³rico preservado |
| Convite | `createCompanyInvitation`, `revokeCompanyInvitation`, `acceptCompanyInvitation` | PapÃ©is internos via enums; token e expiraÃ§Ã£o reais |
| Editar produto/variante/categoria/imagem | RPCs admin + Storage | Plataforma ativa; categoria `Outros`, SKU, mÃ­nimo, status e limites de upload preservados |
| Exportar pedido | `/api/operacao/pedidos/[orderId]/export` | Excel/PDF com dados autorizados; nÃ£o expor a driver/usuÃ¡rio sem escopo |
| Conversar | RPCs de chat direto | Participantes autorizados da mesma empresa; sem API externa ou promessa de realtime |

## 5. Conflitos e decisÃµes que precisam de gate

### Deve ser adaptado sem decisÃ£o adicional

- Nomes, preÃ§os, imagens, contagens e usuÃ¡rios do canvas sÃ£o apenas conteÃºdo de referÃªncia.
- Frames com modal/drawer sÃ£o estados da mesma rota.
- Aba de produto, drawer de variante e detalhe de pedido nÃ£o devem gerar novas rotas.
- Labels em portuguÃªs podem ser usados, mas payloads continuam usando `CUSTOMER`, `DRIVER`, `INTERNAL_OPERATOR`, `PLATFORM_ADMIN` e enums de status.
- O catÃ¡logo pode mostrar SKU sem preÃ§o como indisponÃ­vel; nÃ£o liberar adiÃ§Ã£o para contornar a regra.
- A navegaÃ§Ã£o pode ser reorganizada visualmente, mas as proteÃ§Ãµes server-side continuam obrigatÃ³rias.

### Requer confirmaÃ§Ã£o de produto se for desejado

1. **Login com Google:** nÃ£o existe provider, aÃ§Ã£o ou contrato atual. Ocultar/substituir por aÃ§Ã£o existente ou autorizar implementaÃ§Ã£o separada.
2. **Busca/filtros/paginaÃ§Ã£o em empresas, estabelecimentos, categorias e produtos:** alguns frames os exibem, mas as pÃ¡ginas correspondentes nÃ£o tÃªm contrato completo. Decidir se serÃ£o apenas layout sem controle ou se entram como novo escopo funcional.
3. **Campo de observaÃ§Ãµes no pedido:** o frame o exibe, mas o payload atual de `submit_order_for_review` nÃ£o deve receber um novo campo sem autorizaÃ§Ã£o de backend/domÃ­nio.
4. **Troca de empresa pelo usuÃ¡rio:** o sistema atual seleciona estabelecimento dentro da empresa do cliente; nÃ£o hÃ¡ seletor de empresa para cliente. NÃ£o inferir multiempresa no frontend.
5. **Mensagens em tempo real:** o chat atual Ã© direto, sem realtime. NÃ£o representar presenÃ§a, entrega instantÃ¢nea ou leitura em tempo real sem contrato.
6. **Itens e status adicionais desenhados:** manter todos os status existentes; nÃ£o criar estoque, ofertas, atendimento, mapa ou outros mÃ³dulos que apareÃ§am apenas como navegaÃ§Ã£o de referÃªncia.

## 6. Riscos de implementaÃ§Ã£o visual

- **Risco de autorizaÃ§Ã£o por aparÃªncia:** esconder botÃ£o nÃ£o Ã© seguranÃ§a; toda aÃ§Ã£o continua em RPC/RLS.
- **Risco de vazamento de contexto:** ao trocar de estabelecimento, o estado local deve ser recarregado e o carrinho anterior nÃ£o pode aparecer.
- **Risco de falso sucesso:** drawers, toasts e badges devem refletir resultado da Server Action, nÃ£o apenas o clique.
- **Risco de dados do canvas:** nunca usar os valores do .pen como fallback dinÃ¢mico ou seed visual em produÃ§Ã£o.
- **Risco de transiÃ§Ã£o invÃ¡lida:** o status mostrado nÃ£o autoriza por si sÃ³ iniciar separaÃ§Ã£o, despachar ou entregar.
- **Risco de preÃ§o:** preÃ§o por empresa e â€œTodas recebem esse preÃ§oâ€ continuam atomicamente no RPC atual; nÃ£o duplicar lÃ³gica no cliente.
- **Risco de sessÃ£o residual:** logout deve atualizar o shell, invalidar sessÃ£o e impedir que dados do usuÃ¡rio anterior apareÃ§am apÃ³s nova entrada.
- **Risco de acessibilidade:** drawers/modais precisam foco controlado, retorno de foco, Escape, rolagem interna e aÃ§Ãµes acessÃ­veis; o desenho nÃ£o substitui esses requisitos.

## 7. Ordem recomendada de lotes

1. **Shell e fundamentos:** separar visualmente shell admin, cliente e operaÃ§Ã£o; manter links/destinos atuais e permissÃµes server-side.
2. **Auth:** login, cadastro, recuperaÃ§Ã£o, reset, convite e estados de sessÃ£o; remover/neutralizar Google sem contrato.
3. **Cliente discovery:** catÃ¡logo, estabelecimento, banners, categorias, busca existente, cards, carrinho vazio/preenchido/muitos itens.
4. **Cliente transaction:** checkout, quantidades, remoÃ§Ã£o, endereÃ§os, janela, observaÃ§Ãµes conforme contrato atual, envio para anÃ¡lise.
5. **Admin onboarding:** empresas, estabelecimentos, confirmaÃ§Ãµes e convites.
6. **Admin catÃ¡logo:** produtos, categorias, abas, variantes, drawer, preÃ§o por empresa e imagens.
7. **Pedidos/operacional:** fila, filtros jÃ¡ suportados, drawers de anÃ¡lise/cliente, exportaÃ§Ã£o, picking, despacho, entrega e driver.
8. **Perfil/mensagens/notificaÃ§Ãµes:** papel real, contato manual, logout e chat autorizado.
9. **RegressÃ£o:** build, lint, typecheck, inspeÃ§Ã£o de rede/console, testes autenticados por papel, isolamento cross-company, responsividade e Design QA.

## 8. Matriz mÃ­nima de testes por mÃ³dulo

### Auth

- Login correto, senha invÃ¡lida, sessÃ£o expirada, logout e redirect por papel.
- Cadastro comum sem empresa e cadastro/aceite com convite vÃ¡lido, expirado, revogado e papel diferente.
- RecuperaÃ§Ã£o de senha sem revelar existÃªncia de e-mail.

### Admin

- Acesso direto por CUSTOMER, INTERNAL_OPERATOR e DRIVER deve ser negado.
- Plataforma consegue listar apenas via RPC autorizada, criar/editar/inativar empresa e estabelecimento e confirmar aÃ§Ã£o destrutiva.
- Convite preserva papel interno, expiraÃ§Ã£o, revogaÃ§Ã£o e nÃ£o pode ser reutilizado.
- Produto/variante/categoria/imagem respeitam status, SKU, mÃ­nimo, `Outros`, Storage e limites.
- PreÃ§o de empresa A nÃ£o aparece para empresa B; bulk aplica somente Ã s empresas autorizadas.

### Cliente

- Troca de estabelecimento nÃ£o mistura carrinho, endereÃ§o ou estado local.
- CatÃ¡logo usa preÃ§os da empresa autenticada, SKU ativo e imagens reais/fallback seguro.
- AdiÃ§Ã£o/quantidade respeitam preÃ§o vigente, mÃ­nimo, membership e carrinho compartilhado.
- Checkout nÃ£o envia pedido sem endereÃ§o, janela, preÃ§o/estoque vÃ¡lidos; retry nÃ£o duplica pedido.
- Cliente visualiza pedidos permitidos e somente confirma preÃ§o/recebimento nos status corretos.

### OperaÃ§Ã£o e entrega

- Operador interno vÃª apenas pedidos da empresa e pode executar apenas transiÃ§Ãµes permitidas.
- Driver vÃª apenas pedidos `DISPATCHED` atribuÃ­dos a ele e nÃ£o consegue iniciar separaÃ§Ã£o ou agir em pedido de outro driver.
- ExportaÃ§Ã£o nÃ£o contorna autorizaÃ§Ã£o do detalhe.
- Fila e drawers mostram itens/snapshots reais e nÃ£o exibem falso sucesso em falhas RPC.

### Perfil/chat

- Perfil mostra nome, e-mail, papel e telefone do usuÃ¡rio autenticado.
- Atualizar/remover telefone usa a RPC real; logout encerra sessÃ£o.
- Chat lista e envia apenas entre participantes permitidos da mesma empresa.

## 9. CritÃ©rio de saÃ­da desta auditoria

O redesign-02 estÃ¡ pronto para entrar em implementaÃ§Ã£o somente apÃ³s:

- Product Design usar esta matriz para conectar cada frame a uma rota/estado existente;
- Frontend reutilizar aÃ§Ãµes/componentes sem alterar contratos;
- conflitos de Google, filtros administrativos e observaÃ§Ãµes do pedido receberem decisÃ£o explÃ­cita ou serem ocultados/adaptados;
- cada lote apresentar arquivos alterados, integraÃ§Ãµes preservadas, testes e divergÃªncias;
- partes nÃ£o autenticadas ou nÃ£o visualmente comparadas serem marcadas como nÃ£o validadas.



