# REDESIGN-02 — Lote V1 cliente

**Status:** implementado e validado localmente  
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
