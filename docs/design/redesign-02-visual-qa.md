# REDESIGN-02 - QA visual autenticado

**Data:** 2026-10-05  
**Ambiente:** `http://localhost:3000`  
**Referencia:** exports em `C:\Users\olive\.pencil\documents\620c7e4a-0c42-4316-bb18-490255c78e3f\screens`

## Resultado

O QA autenticado desta rodada foi executado com uma conta operacional existente. Nao foram alterados pedidos, empresas, produtos ou status durante a verificacao.

## Correcoes de fidelidade aplicadas nesta rodada

- Shell: navegacao administrativa alinhada a ordem do export; links passaram a usar altura, padding, pesos e estado ativo equivalentes; perfil e sair passaram a controles iconograficos com nomes acessiveis.
- Autenticacao: o SSO Google foi reposicionado acima dos campos, com botao em formato pill e marca visual, preservando a desativacao por configuracao e os fluxos de convite.
- Catalogo: banner passou para a composicao clara do export, com fundo verde-claro, texto verde escuro e imagem lateral, sem inventar CTA ou destino que nao existe no contrato de banner.
- Catalogo: contexto de estabelecimento e busca foram alinhados ao topbar do export em desktop; os controles continuam sincronizados com filtros e troca de estabelecimento da pagina, enquanto o layout compacto preserva os controles no conteudo.
- Editor de variante: fechamento iconografico, foco inicial, retorno de foco, captura de Tab e Escape preservados no drawer.
- Tabelas administrativas: acoes de editar, visualizar e alterar status foram reduzidas a controles iconograficos compactos, com `aria-label`, `title` e foco visivel; confirmacoes e acoes server-side foram preservadas.
- Admin Empresas/Estabelecimentos: o topbar passou a contextualizar o modulo, os resumos redundantes foram removidos e o modal de confirmacao recebeu fechar, alerta de acao reversivel e hierarquia dos botoes conforme o export.
- ConfirmDialog reutilizavel: estados destrutivos agora exibem aviso de reversibilidade e fechamento explicito, sem alterar callbacks ou permissoes.
- Drawer de variante: largura ajustada para 543px, overlay mais proximo do export, bloco de preco em superficie verde-clara, campos altos e rodape de acoes fixo durante a rolagem.

### Login e shell

- Login concluido com sucesso e redirecionamento por papel preservado para `/operacao/pedidos`.
- Auth `1303x900`: login e cadastro exibem o SSO no topo do card, com largura de `380px`/`54px`, campos e CTA alinhados ao export; o fluxo de senha e convite permaneceu intacto.
- Desktop `1280x716`: sidebar, logo, topbar, navegacao e fila aparecem sem overflow horizontal.
- Mobile `390x844`: shell troca para header compacto e navegacao inferior fixa; controles da fila ocupam a largura disponivel.
- Sair da conta permanece exposto como botao acessivel no shell.

### Fila operacional e drawer

- Busca, filtro de status, contador de resultados e acoes de pedido foram localizados no snapshot de acessibilidade.
- O drawer de detalhes abriu em desktop com overlay, foco no botao de fechar e largura de `543px`, alinhado ao export `S6mgJ`/`rm9SZ`.
- O link manual de WhatsApp foi preservado; nenhuma API de mensagens foi adicionada.
- Nenhum erro de console foi registrado durante a navegacao e abertura do drawer.

### Controle de permissao

- A conta operacional nao foi redirecionada para `/operacao/entregas`; a rota permaneceu protegida pelo papel/escopo vigente. Isso confirma que o redesign nao substitui a autorizacao server-side por aparencia.

## Limites desta rodada

- Os portais `Farta QA`, `Farta Baseline` e `Security QA` estavam em estado `chrome-error` e nao puderam ser usados para nova coleta.
- O portal autenticado estava minimizado; por isso a captura PNG expirou, mas os snapshots de acessibilidade e geometria foram coletados normalmente.
- As telas de `/admin/*` exigem uma sessao `PLATFORM_ADMIN`; a conta usada nesta rodada e operacional. A comparacao autenticada de empresas, produtos e editor de produto continua pendente ate haver uma sessao administrativa disponivel.
- A tentativa de abrir `/admin/empresas` sem sessao administrativa retornou para `/auth/login` em `390x836`, confirmando que a protecao da rota continua ativa.

## Proximo gate

Repetir a mesma matriz com uma conta `PLATFORM_ADMIN`: empresas, estabelecimentos, convites, produtos, variantes, drawer de preco e imagens em `1303px`, alem do breakpoint `390px`. Depois disso, registrar somente divergencias visuais restantes antes do proximo lote.
