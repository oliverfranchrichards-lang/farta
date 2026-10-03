# Redesign 02 — decisões visuais complementares

**Data:** 03/10/2026  
**Escopo:** revisão do design aprovado após as decisões mais recentes. Este documento orienta a implementação visual; não autoriza alteração de backend, banco, migrations ou contratos.

## 1. Botão Google desabilitado

Os frames de autenticação (`sKLrk` e `RbFrT`) possuem um bloco visual de SSO/Google, mas o fluxo atual de autenticação implementa entrada e cadastro por e-mail/senha e não possui ação Google.

Decisão de adaptação:

- manter o bloco na posição e proporção do `.pen`, para preservar a composição aprovada;
- renderizá-lo como `<button type="button" disabled>` ou controle equivalente semanticamente desabilitado;
- manter aparência claramente inativa: contraste reduzido, cursor `not-allowed`, sem hover de ação e sem foco navegável;
- usar o texto `Continuar com Google` apenas como affordance informativa, sem prometer disponibilidade;
- incluir texto auxiliar curto, quando houver espaço: `Indisponível no momento`;
- não adicionar OAuth, callback, dependência, rota ou mock de autenticação;
- não disparar toast, redirect ou alteração de estado ao clicar — o controle deve estar realmente desabilitado.

Critério de aceite visual: a pessoa deve entender que a opção existe no produto, mas não está disponível, sem confundi-la com um erro ou com um botão quebrado. O login por e-mail/senha continua sendo o único caminho ativo.

## 2. Perfil: rótulo Cliente + empresa

O frame `vyXQN` representa o perfil do cliente, embora o nome legado do frame contenha “Admin”. O cartão de dados da conta deve exibir:

- nome real da pessoa;
- e-mail real;
- badge de papel com o texto `Cliente`;
- empresa ativa associada, com o rótulo `Empresa` e o nome real da empresa.

O nome da empresa deve ser apresentado como contexto de conta, não como um seletor ou CTA. Não criar no redesign uma troca de empresa que não esteja suportada pelo produto; a troca existente é de estabelecimento no catálogo/checkout.

### Lacuna de dados a validar

Atualmente `getCurrentUser()` consulta `profiles` com `company_id`, mas não retorna `companies.display_name`. Portanto, a implementação visual precisa de uma consulta já autorizada para obter o nome da empresa ou de uma extensão explícita do contrato de leitura. Não preencher com “Empresa Demo”, nome do frame ou outro mock.

Se a consulta de empresa não puder ser feita usando o contrato existente, parar o lote visual do perfil e solicitar decisão/autorização de domínio. Não esconder a ausência de dados com texto inventado.

Permissões:

- clientes veem a empresa à qual o perfil está vinculado;
- o badge não deve permitir alteração de papel;
- perfis de operador, entregador e administrador continuam usando seus labels existentes, sem serem apresentados como Cliente;
- o acesso à empresa continua sendo protegido pelo contexto/RLS real.

## 3. Observações no checkout e nos detalhes

### Intenção visual

No frame `QFXql`, manter o campo de observações próximo às informações de entrega, antes do resumo/finalização. O campo deve ser claramente opcional, multiline e ter label persistente:

`Observações para a operação (opcional)`

O placeholder pode orientar sem virar dado persistido, por exemplo: `Ex.: entregar na entrada lateral…`. Não usar placeholder como label.

Nos drawers de pedidos (`S6mgJ` e `rm9SZ`) reservar uma seção de leitura `Observações do pedido` próxima ao endereço/janela e antes das ações. Quando não houver observação, mostrar estado explícito `Nenhuma observação informada`, em vez de deixar um espaço ambíguo.

### Estado atual e contrato autorizado

O checkout já desenha um `<textarea>` de observações, porém ele não está conectado a estado nem é enviado por `confirmActiveCart`. A tabela `orders`/as RPCs de confirmação analisadas também não possuem campo de observação nos payloads atuais. Os detalhes de cliente e operador, portanto, não conseguem exibir uma observação persistida.

Decisão do usuário: a observação faz parte do escopo atual e deve ser persistida de forma real. A implementação autorizada usa `orders.customer_note`, limite de 500 caracteres, RPC versionado, hash de idempotência, DTOs autorizados e exportações. Nenhum agente visual deve simular sucesso ou guardar o texto apenas no cliente.

Esta é uma lacuna funcional identificada, não uma autorização para alterar o backend durante a remodelagem.

### Observação do operador

O drawer de análise já possui `Observação (opcional)` associado à justificativa de preços finais. Essa observação é uma regra diferente da observação do cliente e deve manter sua semântica, label e action próprios. Não reutilizar o mesmo campo/estado semântico apenas porque ambos usam textarea.

## 4. Filtros funcionais sem affordances inventadas

O redesign deve preservar somente filtros que tenham comportamento já existente ou cuja implementação seja aprovada como parte do contrato do módulo.

### Cliente — catálogo

Controles visuais permitidos pelo funcionamento atual:

- busca por produto, marca, categoria ou embalagem;
- filtro por categoria;
- ordenação por preço crescente/decrescente;
- limpar filtros.

Cada controle deve ser um input, select, botão ou grupo de botões real, com estado selecionado e feedback. Não desenhar um botão “Filtros” que abre painel sem filtros adicionais implementados. Não mostrar chips de marca, embalagem, disponibilidade ou faixa de preço como se fossem filtráveis se não houver estado/handler correspondente.

O contador do carrinho continua representando produtos distintos; não transformá-lo em filtro.

### Admin — empresas/estabelecimentos/convites

- busca deve filtrar os registros correspondentes;
- status deve usar o select/enum real disponível;
- filtros de e-mail em convites só devem aparecer se estiverem ligados ao estado de busca/filtro existente;
- o visual de tabela, select e campo de busca pode seguir o `.pen`, mas não deve sugerir paginação, ordenação de coluna ou ações em massa se elas não existirem.

### Admin — produtos/categorias

- manter busca/status existentes;
- exibir contagens reais;
- não criar filtros de empresa/preço dentro da listagem se o contrato da página não os suporta;
- o filtro de preço por empresa pertence ao contexto de edição da variante, conforme o desenho do drawer `E07F4`, e não deve ser duplicado como filtro global sem decisão de produto.

### Admin — pedidos

- status e busca devem filtrar a fila real;
- o estado do pedido e a disponibilidade das ações devem continuar vindo das permissões/status do backend;
- não adicionar filtros por cliente, empresa, estabelecimento, entregador ou intervalo de data apenas porque seriam úteis visualmente;
- não estilizar uma métrica como se fosse um filtro clicável se ela não tiver handler e consulta correspondente.

## 5. Requisitos transversais de apresentação

- Estados de filtro devem sobreviver a loading, erro e vazio sem falso sucesso.
- Botões de limpar devem ficar desabilitados quando não houver filtro aplicado ou manter ação idempotente clara.
- Inputs precisam de label acessível, foco visível e `aria-pressed`/`aria-expanded` somente quando o estado existir.
- O botão Google desabilitado não deve receber foco; filtros e campos funcionais devem receber.
- Drawers de pedido e variante devem manter foco controlado, fechamento por teclado, retorno de foco e rolagem interna.
- O redesign não deve esconder ações existentes apenas porque não aparecem no frame.
- Dados de perfil, empresa, observações e filtros devem ser reais; nenhum texto do canvas pode virar dado de produção por hardcode.

## 6. Matriz de impacto e aprovação necessária

| Decisão | Visual | Contrato existente | Implementação permitida no lote visual | Bloqueio |
|---|---|---|---|---|
| Google indisponível | Ajustar estado disabled do componente SSO | Não há OAuth Google | Sim, somente apresentação acessível | Nenhum |
| Badge `Cliente` + empresa | Ajustar cartão do perfil | Papel existe; nome da empresa não é retornado por `getCurrentUser` | Sim, se usar leitura já autorizada | Confirmar fonte de `display_name` |
| Observação no checkout | Campo opcional no layout | Persistida por RPC versionado em `orders.customer_note` | Implementação funcional autorizada | Migration/RPC/DTO já iniciados |
| Observação nos detalhes | Seção com valor/estado vazio | Retornada pelo detalhe autorizado e exportação | Exibir somente valor real | Validar QA por perfil |
| Filtros | Conectar controles aos filtros atuais | Busca/categoria/ordenação/status já existem em partes | Sim, sem novos critérios | Não inventar filtros adicionais |

## 7. Próximo lote visual recomendado

1. Atualizar a especificação dos componentes de autenticação com SSO disabled.
2. Atualizar o cartão de perfil com badge Cliente e bloco Empresa, após confirmar a fonte real do nome.
3. Implementar/validar a camada visual dos filtros existentes, incluindo vazio e limpar.
4. Conectar o campo persistido de observações ao checkout e aos detalhes autorizados.
5. Executar o fluxo completo com evidência de payload, leitura posterior e exportação.
