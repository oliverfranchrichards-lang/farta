# Redesign 02 — revisão rápida após `28c7bc9`

**Data:** 03/10/2026  
**Commit analisado:** `28c7bc9 feat: add google oauth and redesign filters`  
**Escopo:** revisão do estado visual e proposta do próximo lote. Nenhum código foi alterado nesta revisão.

## Estado verificado

- `HEAD` e `origin/main` apontam para `28c7bc9`.
- O worktree não possui alterações de código; permanece apenas `supabase-push.log` não rastreado.
- `npm.cmd run check` passou em lint, typecheck e build.
- O build continua gerando 28 rotas e o proxy do Next.js.

## O que o commit já cobre

1. **Filtros de apresentação e estado local** em empresas, estabelecimentos, convites, categorias, produtos, preços, pedidos do cliente e fila administrativa/operação.
2. **Checkout** com estado de observação do cliente, limpeza ao trocar estabelecimento e exibição no fluxo de confirmação.
3. **Detalhes de pedido** com seção de observações recebidas do retorno real.
4. **Perfil** com consulta do nome real da empresa e apresentação contextual para cliente.
5. **Auth** com estado visual Google desabilitado quando `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` está ausente/false, além de caminho OAuth quando explicitamente ativado.

## Divergência de escopo que precisa ficar registrada

O redesign-02 aprovado especificava o Google como opção desabilitada e não autorizava OAuth neste lote. O commit introduziu actions, callback e configuração de OAuth. O `.env.local` atual contém `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`, portanto o ambiente local pode exibir o Google como funcional.

Para a validação visual limitada ao redesign aprovado, o ambiente deve ser testado com essa flag ausente ou `false`. A existência do caminho OAuth não deve ser usada como critério de aceite visual nem deve gerar novas telas/affordances nesta rodada. A decisão de manter ou separar essa evolução deve ser tratada fora do próximo lote visual.

## Próximo lote visual de maior impacto

### Lote V1 — shell cliente + catálogo e checkout

**Justificativa:** os frames de cliente ocupam cinco referências de alta densidade (`Sdnoa`, `G4VM0i`, `L9mHNx`, `QFXql`, `vyXQN`) e concentram a jornada principal de compra. O commit atual adicionou comportamentos e filtros, mas ainda não fez a convergência visual completa para o `.pen`.

### Páginas concretas

- `/catalogo`: estados `Sdnoa`, `G4VM0i` e `L9mHNx`.
- `/pedido`: estado `QFXql`.
- `/perfil`: estado `vyXQN`.
- Shell compartilhado usado pelas páginas: `src/components/layout/AppShell.tsx`, `PrimaryNav.tsx`, `AppShell.module.css`, `PrimaryNav.module.css`.

### Componentes/arquivos concretos

- `src/components/layout/AppShell.tsx` e CSS: adaptar sidebar cliente de 220px, marca, menu Início/Comprar/Pedidos/Mensagens, topbar e perfil sem alterar `navByProfile`, logout ou guards.
- `src/app/catalogo/page.tsx` e `catalogo.module.css`: adaptar topbar, seletor de estabelecimento, busca, categorias, banner, cards, resumo compartilhado e contador de produtos distintos.
- `src/components/cart/CartItemControls.tsx` e CSS: manter quantidade mínima, digitação, busy, erro e remoção; apenas alinhar forma visual e estados ao card do `.pen`.
- `src/app/pedido/page.tsx` e `pedido.module.css`: adaptar revisão, itens, entrega, endereço, janela, textarea de observação, resumo e envio para análise.
- `src/app/perfil/page.tsx`, `profile-form.tsx` e `profile.module.css`: adaptar cartão de conta, badge Cliente, empresa real, WhatsApp manual, feedback e logout.
- Primitivas existentes `Button`, `Input`, `Card`, `Badge` e `PageHeader`: reutilizar antes de criar componentes novos.

### Integrações que devem permanecer intactas

- `getCustomerContext` e `selectCustomerEstablishment`.
- `listCatalog`, `getActiveCart`, `addCatalogItem`, `setCartItemQuantity`.
- `listActiveAddresses`, `createAddress`, `confirmActiveCart`.
- Observação do cliente somente pelo contrato versionado já introduzido; sucesso apenas após retorno real.
- `getCurrentUser`, `updateMyPhone` e `signOut`.
- Estabelecimento, empresa, carrinho, preço, disponibilidade, mínimo e status continuam vindo do servidor/RLS; dados do canvas não podem ser usados como mock.

## Critérios de QA do lote V1

### Visual

- Comparar screenshots nas dimensões dos frames: catálogo 1440×1420, checkout 1440×1610, perfil 1303×900.
- Validar sidebar, topbar, alinhamento, espaçamento, grid, cards, cores e tipografia contra `pencil-new.pen`.
- Confirmar que telas longas usam rolagem natural e que o resumo não cobre itens.
- Validar estados vazio, carrinho com 4 unidades, muitos itens, sem resultados, carregando, erro, sucesso e sem preço.
- Não renderizar simultaneamente estados/abas ocultos dos frames.

### Funcional

- Cliente troca estabelecimento sem misturar carrinho, endereço ou observação.
- Busca, categoria, ordenação e limpar filtros atualizam somente dados carregados reais.
- Contador do carrinho mostra produtos distintos; volumes aparecem no resumo.
- Mínimos, unidade de venda, preço e indisponibilidade continuam respeitados.
- Alterar/remover quantidade permanece conectado ao RPC e mantém retry/desfazer.
- Checkout valida endereço/janela, envia observação pelo payload aprovado e não exibe falso sucesso.
- Perfil mostra nome/e-mail/papel/empresa reais; telefone salva/remove pelo action real; logout encerra a sessão.
- Login Google permanece visualmente disabled durante este lote; não executar OAuth como parte do aceite.

### Acessibilidade e responsividade

- Labels persistentes e `aria-describedby` para busca, filtros, observação e telefone.
- Foco visível, ordem de teclado e feedback com `role=status`/`role=alert`.
- Validar 320px, 390px, 768px, 1024px, 1303px e 1440px.
- Sidebar recolhe/adapta sem overflow global; tabelas/listas e resumo têm rolagem localizada quando necessário.
- Zoom de 200%, reduced motion e contraste.
- Troca de estabelecimento e submissão devem bloquear controles somente durante a operação real.

## Fora deste lote

- Nova integração, tela ou affordance de Google OAuth.
- Filtros por empresa, cliente, data, disponibilidade, marca ou embalagem sem contrato aprovado.
- Alteração de permissões, roles, RLS, status, preços, estoque, pagamentos ou rotas.
- Redesign de admin/operação. Esses módulos ficam para o lote seguinte após aprovação do piloto cliente.

## Condição de saída

O lote só deve ser marcado como concluído depois de: screenshots comparativas, QA funcional autenticado, revisão de console/rede, `npm.cmd run check`, validação de teclado/responsividade e registro explícito de qualquer divergência visual ou estado não validado.
