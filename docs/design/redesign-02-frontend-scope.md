# REDESIGN-02 — Escopo frontend para filtros, observações, perfil e Google

**Status:** plano frontend; não implementado.  
**Data:** 2026-10-03  
**Base:** `redesign-02.md`, `redesign-02-frontend-audit.md`, `redesign-02-domain-audit.md` e `redesign-02-design-audit.md`.

## 1. Objetivo e limites

Este plano descreve os ajustes de apresentação e os estados de interface necessários para aproximar o produto dos frames aprovados, preservando:

- rotas existentes;
- componentes, server actions, RPCs, payloads e enums atuais;
- autenticação, permissões e isolamento entre empresas/estabelecimentos;
- dados reais do Supabase;
- regra de que o canvas não cria funcionalidades por si só.

Não há autorização neste lote para criar OAuth Google ou filtros adicionais sem contrato. A persistência de observações e a exibição da empresa real no perfil foram autorizadas como evolução funcional separada e devem usar os contratos versionados e leituras autorizadas definidos pelo Product Domain.

## 2. Decisões de escopo

### 2.1 Filtros

Os filtros devem ser separados em dois grupos:

1. **Filtros já suportados no frontend com dados reais já carregados:** podem ser redesenhados e conectados sem alteração de domínio.
   - Catálogo: busca local por nome/marca/detalhe, categoria e ordenação por preço, usando `products` já retornados por `listCatalog`.
   - Meus pedidos: busca por número e filtro por status, usando a lista real retornada por `listOrders`.
   - Fila operacional/admin: busca e filtro de status já mantidos pelo `OrdersQueue` (`query`, `status`), usando `listAdminOrders`/`listCompanyOrders`.
   - Preços por empresa: busca local por produto, variante ou SKU, usando `listAdminCompanyPrices`.

2. **Filtros desenhados, mas sem contrato atual:** não devem ser falsamente funcionais.
   - Busca/filtro/paginação de empresas, estabelecimentos, categorias e produtos, caso não exista fonte ou regra equivalente já implementada.
   - Filtros administrativos de status/contagem/paginação que exigiriam consulta nova, paginação server-side ou mudança de RPC.

Para esses casos, a implementação visual deve escolher uma das opções aprovadas pelo Product Domain: ocultar o controle, apresentar apenas agrupamento/estrutura sem interação, ou registrar uma futura alteração de produto. Não usar estado local para simular que um filtro de backend existe.

### 2.2 Observações do pedido

O frame `QFXql` exibe um campo de observações no checkout e os frames de pedido administrativo exibem a observação no detalhe. Atualmente:

- `/pedido` renderiza `Input as="textarea"` com id `order-notes`, mas o valor não está em estado nem é incluído em `confirmActiveCart`;
- `confirmActiveCart` envia apenas `cartId`, `addressId` e `deliveryWindow` para `submit_order_for_review`;
- o domínio descreve observação no modelo de pedido, mas a auditoria registra que o payload/contrato frontend atual não deve ser ampliado somente pelo redesign;
- o detalhe administrativo (`CompanyOrderDetails`) já pode exibir o valor se vier do snapshot/consulta real, mas não pode inventar conteúdo.

Plano visual condicionado ao contrato:

- manter o campo no layout do checkout, com label, helper, limite e estado de edição coerentes com o frame;
- adicionar estados visuais `vazio`, `preenchido`, `disabled`, `busy` e `erro` somente se o contrato existente confirmar persistência;
- o backend agora está autorizado a receber a observação por RPC versionado; o campo só deve mostrar sucesso após a confirmação dessa action;
- no detalhe operacional, renderizar a observação somente quando existir no retorno real e manter separação entre observação do cliente e nota interna;
- não alterar o RPC legado; usar o RPC versionado de observação e preservar os contratos existentes.

### 2.3 Perfil do cliente

O frame `vyXQN` representa a conta do cliente apesar do nome “Admin”. A rota real `/perfil` é compartilhada por usuários ativos e deve continuar exibindo dados reais conforme o papel autenticado.

No redesign, a hierarquia será:

- identidade real: `full_name` e `user.email` vindos de `getCurrentUser`;
- papel real: `profile.role`, traduzido somente na apresentação;
- contato manual: telefone/WhatsApp via `ProfileForm` e `updateMyPhone`;
- logout real: `SignOutButton` via `signOut`, não um link decorativo;
- estados de carregamento, sucesso, erro, campo vazio/remoção e sessão expirada.

Não adicionar avatar, empresa editável, troca de empresa, preferências fictícias, endereço ou dados comerciais que não tenham action/contrato. O telefone continua sendo contato manual; não prometer API de WhatsApp.

## 3. Mapa de arquivos e responsabilidades

| Tema | Rota/frame | Arquivos principais | Alterações previstas no redesign |
|---|---|---|---|
| Filtros do catálogo | `/catalogo`; `Sdnoa`, `G4VM0i`, `L9mHNx` | `src/app/catalogo/page.tsx`, `catalogo.module.css`, `src/modules/orders/order.actions.ts` apenas como leitura de contrato | Reorganizar barra de busca, chips e ordenação; manter estados locais existentes; adicionar estados de filtro ativo/limpar/sem resultados; não criar query nova |
| Busca/filtro de pedidos cliente | `/pedidos` | `src/app/pedidos/page.tsx`, `pedidos.module.css` | Aplicar padrão compartilhado de Search/FilterBar e mobile list; preservar polling, status, cancelamento e link de detalhe |
| Fila admin/operação | `/admin/pedidos`, `/operacao/pedidos`, `WU6Sk` | `src/app/admin/pedidos/orders-queue.tsx`, `orders-queue.module.css` | Consolidar aparência de busca/status/métricas/lista/tabela; manter `scope`, polling, ações condicionais e guards de status |
| Filtros de preços | `/admin/empresas/[companyId]/precos` | `prices-admin.tsx`, `prices.module.css` | Reestilizar busca e estados sem preço/indisponível; não alterar ação de preço por empresa |
| Filtros administrativos sem contrato | `Xkwdd`, `BgB9z`, `ILrZa`, `HMEgx`, `kZj4J` | páginas correspondentes, módulos CSS e componentes admin | Adaptar visualmente somente se controle for funcional com dados já disponíveis; caso contrário ocultar/desabilitar/registrar como gap, sem mock |
| Observações checkout | `/pedido`, `QFXql` | `src/app/pedido/page.tsx`, `pedido.module.css`, `src/modules/orders/order.actions.ts` | Ajustar composição, label/helper e estados; só conectar valor ao envio se contrato existente for confirmado pelo Product Domain |
| Observação no detalhe | `/admin/pedidos`, `S6mgJ`/`rm9SZ`; `/pedidos/[orderId]` | `orders-queue.tsx`, `order-detail/page.tsx`, CSS correspondentes | Exibir somente o campo real retornado; diferenciar texto do cliente de nota interna; não usar placeholder do frame como dado |
| Perfil do cliente | `/perfil`, `vyXQN` | `src/app/perfil/page.tsx`, `profile-form.tsx`, `profile.module.css`, `src/components/layout/SignOutButton.tsx` | Redesenhar card de conta/contato, status de feedback e logout; manter role real e action de telefone |
| Login Google desabilitado | `/auth/login`, `sKLrk` | `src/app/auth/login/login-content.tsx`, `src/app/auth/auth-shell.tsx`, `src/app/auth/auth.module.css` | Adicionar estado visual não interativo somente se necessário para fidelidade: `button disabled`, label “Google (em breve)” ou equivalente aprovado; nenhum `signInWithOAuth` |

## 4. Estados a especificar antes de implementar

### 4.1 Filtros

Cada superfície que possui filtro funcional deve ter:

- estado inicial sem filtro;
- estado com termo/chip/status ativo;
- botão ou ação de limpar quando houver alteração;
- estado sem resultados, com próximo passo;
- carregamento inicial;
- erro de carregamento sem apagar dados válidos já exibidos;
- operação em andamento quando a mudança troca estabelecimento ou recarrega dados;
- responsividade: chips agrupados/drawer compacto em mobile, sem overflow global;
- teclado, `aria-pressed`/`aria-label`, foco visível e leitura do resultado.

Filtros não suportados por contrato devem ser visualmente não interativos ou removidos. Um disabled visual precisa explicar o motivo quando continuar visível; não deve parecer que está filtrando dados.

### 4.2 Observações

Estados mínimos do textarea:

- vazio e pronto para edição;
- preenchido com contador/limite, se houver limite real;
- disabled após envio/busy;
- erro de validação associado por `aria-describedby`;
- erro de persistência sem falso sucesso;
- sucesso somente após retorno confirmado da action;
- conteúdo exibido no detalhe apenas quando vier do backend.

Se a decisão for manter o campo fora do payload neste lote, o estado final deve ser documentado como “não persistido” e o controle não pode ser apresentado como parte do pedido enviado.

### 4.3 Perfil

- carregamento/redirect de sessão;
- nome/e-mail/papel reais;
- telefone inicial, edição e remoção;
- validação de telefone inválido;
- salvando/desabilitado;
- sucesso anunciado por `role=status`;
- erro anunciado por `role=alert` e foco apropriado;
- logout em andamento, erro de logout e limpeza visual pós-logout;
- acesso de operador/driver/admin sem receber affordances exclusivas de cliente.

### 4.4 Google

Como não existe provider OAuth nem action no projeto, o botão não pode ser um botão funcional. O estado visual recomendado é:

- `button type="button" disabled`;
- texto claro “Continuar com Google (em breve)” ou texto aprovado no design;
- `aria-disabled="true"` apenas como complemento, mantendo `disabled` nativo;
- cursor/contraste de desabilitado e helper curto “Login Google ainda não está disponível”;
- sem `onClick`, sem redirect, sem chamada de Supabase, sem mensagem de sucesso;
- não usar `href="#"`, que criaria falsa navegação;
- o login por e-mail/senha permanece a única ação primária funcional;
- visualmente separado por divisor “ou” apenas se isso fizer parte do frame aprovado.

Se o Product Design optar por não expor uma affordance indisponível, o botão deve ser omitido em vez de desabilitado. Essa é uma decisão visual; nenhuma das opções autoriza OAuth.

## 5. Componentes a criar ou adaptar — somente apresentação

Antes de criar novos componentes, reutilizar `Button`, `Input`, `Card`, `Badge`, `Alert`, `EmptyState`, `PageHeader` e `ConfirmDialog`.

Possíveis abstrações puramente visuais, após aprovação do Product Design:

- `SearchInput` com label visível, limpar e estado de busca;
- `FilterBar`/`FilterChipGroup` com estado ativo e limpar;
- `SelectField` para selects com label/error/helper consistentes;
- `ProfileSummary` e `ProfileContactCard` para `/perfil`;
- `UnavailableSocialButton` ou variante `disabled` de `Button` para o Google;
- `ObservationField` apenas como apresentação do campo já autorizado, sem assumir persistência;
- `DataTable/MobileList` compartilhando aparência, não regras de cada módulo.

Não criar componente que esconda regras distintas sob a mesma API apenas porque a aparência é parecida. Ações continuam nos módulos de domínio atuais.

## 6. Ordem de implementação frontend

1. Confirmar com Product Domain se observação já possui contrato persistente e quais filtros são oficialmente funcionais.
2. Product Design Director aprova tratamento visual do Google desabilitado/omitido e estados dos filtros/observação/perfil.
3. Adaptar foundations e componentes de input/filter/feedback sem alterar actions.
4. Implementar o lote de auth: login com Google não funcional visualmente, estados de login existentes preservados.
5. Implementar catálogo e pedidos cliente: filtros já existentes, carrinho, sem resultados e responsividade.
6. Implementar checkout: observação conforme decisão contratual; endereço/janela/envio permanecem intactos.
7. Implementar perfil do cliente e validar também os demais papéis autenticados.
8. Propagar componentes para fila admin/operação e filtros de preços.
9. Rodar QA visual e funcional por estado; atualizar inventário somente após evidência.

## 7. Testes de regressão requeridos

### Filtros

- busca por nome/marca/detalhe no catálogo;
- categoria e ordenação com preço indefinido;
- filtro por status e busca por número em `/pedidos`;
- busca/status na fila sem alterar escopo de empresa;
- preço de empresa A não aparecer no contexto de B;
- limpar filtros e recuperar estado vazio;
- mobile sem overflow e teclado acessível.

### Observações

- digitar, apagar, exceder limite e submeter;
- confirmar se o payload realmente contém a observação ou se o controle foi omitido/adaptado;
- retry/falha de API sem falso sucesso;
- detalhe do cliente/admin mostra apenas snapshot real autorizado;
- troca de estabelecimento não mistura observação ou estado do pedido anterior.

### Perfil e auth

- nome/e-mail/papel corretos por sessão;
- atualizar e remover telefone via action real;
- logout elimina a sessão e impede dados residuais após novo login;
- login e cadastro continuam funcionando;
- Google não dispara rede, redirect ou alteração de sessão;
- acesso negado permanece correto por papel.

### Gates

- `npm.cmd run lint`;
- `npm.cmd run typecheck`;
- `npm.cmd run build`/`npm.cmd run check`;
- inspeção de console/rede;
- screenshots nas larguras do `.pen` e em 320/390/768/1024px;
- revisão de foco, contraste, reduced motion, zoom 200% e drawers/modais.

## 8. Bloqueios e critérios de aceite

Bloqueios antes de implementar filtros novos:

- falta de contrato para filtros administrativos/paginação além dos estados locais já existentes;
- ausência de integração OAuth Google, que deve permanecer explicitamente não funcional;
- necessidade de conta autenticada para validar perfil, cliente e isolamento multiempresa.

O escopo estará pronto quando:

- cada controle funcional apontar para uma action/estado real;
- controles sem contrato estiverem omitidos ou claramente desabilitados;
- Google não fizer chamada, redirect ou falso sucesso;
- observações forem apresentadas somente após persistência confirmada pelo RPC versionado;
- perfil usar dados reais e logout real;
- filtros preservarem empresa, estabelecimento, status e permissões;
- lint, typecheck, build, QA visual e fluxos autenticados passarem ou estiverem explicitamente marcados como não validados.
