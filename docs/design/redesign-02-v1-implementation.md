# REDESIGN-02 — Lote V1 cliente

**Status:** implementado e validado localmente  

O lote atual tambÃ©m alinhou empresas, estabelecimentos e convites aos frames administrativos: tabelas responsivas, filtros horizontais, seleÃ§Ã£o visual de perfil no convite e confirmaÃ§Ãµes de status preservadas.

O editor de produtos tambÃ©m foi alinhado aos estados exportados: navegaÃ§Ã£o por abas para informaÃ§Ãµes principais, variantes/SKUs e imagens; resumo lateral com dados reais do produto; e Ã¡rea de upload com affordance visual acessÃ­vel. As abas apenas organizam as aÃ§Ãµes jÃ¡ existentes e nÃ£o alteram contratos de produto, preÃ§o, SKU, Storage ou permissÃµes.

ApÃ³s o QA visual, o shell foi refinado para a geometria e iconografia dos exports, o banner do catÃ¡logo passou para a variante clara com imagem lateral e o drawer de variante recebeu foco inicial, focus trap, Escape e retorno de foco. Nenhuma aÃ§Ã£o de domÃ­nio foi alterada.

> Os exports HTML/PNG em `C:\\Users\\olive\\.pencil\\documents\\620c7e4a-0c42-4316-bb18-490255c78e3f\\screens` sÃ£o a referÃªncia visual desta rodada. O inventÃ¡rio e tokens estÃ£o em `docs/design/exported-screens-audit.md`; foundations, shell, autenticaÃ§Ã£o, catÃ¡logo e checkout receberam o primeiro alinhamento. O QA visual autenticado em mÃºltiplas larguras ainda Ã© pendente.
**Base visual:** `redesign-02-current-review.md` e frames `Sdnoa`, `G4VM0i`, `L9mHNx`, `QFXql`, `vyXQN`.

## Entregue

- Shell cliente com sidebar de 220px, topbar de 88px e navegação mobile inferior.
- Estados de foco, navegação ativa, skip link e adaptação responsiva do shell.
- Catálogo com busca, chips de categoria, ordenação, cards, resumo do carrinho e estado sem resultados.
- Controles de quantidade alinhados ao padrão visual, mantendo digitação, mínimo, busy, erro e remoção.
- Checkout com composição visual de itens, entrega, endereço, observações, resumo e estados de operação.
- Perfil com papel `Cliente`, empresa real, contato manual e feedback de salvamento/logout.

## Contratos preservados

Nenhuma action, RPC, migration, regra de RLS, permissão, preço, estabelecimento, carrinho ou status foi alterado neste lote. Os dados continuam vindo do Supabase e o campo `customerNote` usa o contrato versionado já implementado.

## Validação

- `npm.cmd run lint` — aprovado.
- `npm.cmd run typecheck` — aprovado.
- `npm.cmd run build` — aprovado; 28 rotas geradas.
- `git diff --check` — sem erros de conteúdo.

## Pendências de QA manual

- screenshots comparativas nas larguras dos frames e em 320/390/768/1024/1303/1440px;
- teste autenticado de troca de estabelecimento, carrinho, checkout, observação e perfil;
- teste de teclado, zoom 200%, reduced motion, contraste e console/rede;
- validação do fluxo Google permanece separada do aceite visual deste lote.

## Lote administrativo seguinte — empresas, estabelecimentos e convites

Também implementado no mesmo ciclo:

- barra administrativa de filtros responsiva, busca/status e limpar desabilitado;
- estados vazios específicos para nenhum resultado;
- status de convite apresentados como Pendente, Aceito, Expirado e Revogado;
- cards/status e formulário de convite reorganizados;
- confirmações, loading, erros e retorno de foco preservados.

## Próximo lote

### Lote administrativo de catálogo — concluído

- filtros locais de produtos/categorias com limpar, estados vazios e toolbar consistente;
- tabelas com hover, ações e status mais claros;
- drawer de variante refinado sem alterar SKU, unidade, venda mínima ou status;
- seletor de empresa bloqueado nativamente quando “Todas recebem esse preço” está ativo;
- cobertura real do checkbox preservada ao reabrir a variante;
- área de upload de imagem reorganizada visualmente;
- confirmações, busy, erro, sucesso e actions existentes preservados.

## Próximo lote

Remodelagem da fila administrativa de pedidos, drawers de detalhes/análise, exportações e QA visual autenticado. A implementação deve preservar filtros, status, permissões e contratos do backend.
## Lote administrativo de pedidos — concluído

- fila operacional alinhada aos frames WU6Sk, S6mgJ e rm9SZ, com métricas reais e status Recebido disponível no filtro;
- tabela preservada em desktop/tablet com rolagem localizada e cards somente no mobile;
- drawers de detalhes e análise com largura, overlay, foco, bloqueio de rolagem e feedback de erro/sucesso alinhados ao sistema visual;
- observação do cliente e observação da análise separadas, com quebra de linha e identificação completa dos itens;
- exportações Excel/PDF usando os endpoints existentes, com estado de carregamento e falha tratada;
- nenhuma action, RPC, regra de RLS, transição ou permissão de backend foi alterada.

## Próxima etapa

QA visual e autenticado da rodada completa, incluindo fila administrativa, detalhes/análise, exportações, responsividade (320/390/768/1024/1303px), teclado, zoom 200%, estados vazios e permissões por perfil.
## Lote cliente — pedidos e detalhe concluído

- lista de pedidos com resumo real, busca, filtros por status e estados vazios distintos para conta sem pedidos e filtros sem resultado;
- tabela preservada em desktop/tablet e cards em viewport móvel, com feedback de erro e atualização de status anunciado;
- detalhe do pedido com resumo semântico, observação preservada com quebras de linha, endereço/janela, total aproximado identificado e histórico visual;
- ações existentes de confirmação, cancelamento e revisão de preço mantidas sem mudança de contrato;
- nenhuma action, RPC, regra de RLS, status ou permissão de backend foi alterada.

### Próxima etapa

QA visual e autenticado das jornadas de pedidos do cliente, seguido pela padronização da tela de notificações e revisão das telas de entregas/mensagens.
## Lote cliente — notificações concluído

- página migrada de estilos inline para CSS Module e primitives do design system;
- estados de erro, vazio e lista cronológica receberam hierarquia, links para pedidos, timestamps semânticos e badges por status;
- nenhuma mudança no carregamento, autorização ou contrato de `listOrderNotifications`.

### Próxima etapa

Revisar visualmente entregas do entregador e mensagens diretas, mantendo o escopo mobile-first das rotas existentes.
## Lote operação — entregas e mensagens concluído

- `/operacao/entregas` agora usa a mesma fila responsiva, com título, métricas e linguagem específicos para entregadores;
- mensagens e conversas diretas receberam header, breadcrumb, estados de erro/vazio, histórico anunciado, contador de caracteres e composição responsiva;
- autorização de participantes, envio manual, escopo do entregador e transições de entrega permanecem inalterados.

### Próxima etapa

Executar QA autenticado e visual completo por perfil, registrar screenshots e consolidar pendências antes da preparação de produção.
