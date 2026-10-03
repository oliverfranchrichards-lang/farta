# REDESIGN-02 — Especificação de escopo, filtros e observações

**Status:** especificação de Product Domain autorizada para implementação; nenhum código, migration, RPC, RLS ou DTO foi alterado.

**Data:** 03/10/2026

**Fontes:** `inspirations/instructions/redesign-02.md`, `docs/design/redesign-02-design-audit.md`, `docs/design/redesign-02-domain-audit.md`, `docs/design/redesign-02-design-decisions.md`, frames do `pencil-new.pen` e contratos atuais em `src/`/`supabase/migrations/`.

## 1. Decisões incorporadas

Esta especificação incorpora as decisões visuais já registradas:

- Google permanece visível apenas como opção desabilitada e informativa. Não haverá OAuth, callback, mock ou novo provider neste redesign.
- O perfil `vyXQN` representa a conta do cliente. Deve mostrar papel real, com o label `Cliente` apenas quando o perfil for `CUSTOMER`, e empresa real quando houver vínculo autorizado. Não criar troca de empresa.
- O campo do checkout é uma observação opcional do cliente para a operação. Hoje ele é somente visual e não está conectado ao payload; sua persistência foi autorizada e está especificada neste documento para a próxima implementação de domínio/backend.
- A observação do cliente é diferente da observação de análise/preço final do operador (`p_reason`). Não compartilhar estado, coluna ou semântica por conveniência visual.
- Filtros só podem aparecer como controles funcionais. Busca, categoria, ordenação e status existentes podem ser conectados; não adicionar filtros de empresa, cliente, data, disponibilidade, preço, marca ou embalagem sem contrato aprovado.

## 2. Classificação usada

- **Suportável agora:** os dados necessários já fazem parte do retorno atual ou podem ser filtrados no estado já carregado, sem migration/RPC/RLS novo.
- **Frontend pendente:** o domínio suporta o comportamento, mas a página atual ainda não tem controle/handler visual conectado. É alteração de apresentação/estado local, não evolução do banco.
- **Backend necessário:** o controle exige novo parâmetro RPC, consulta paginada, coluna, DTO, policy, índice ou regra server-side.
- **Não permitido neste lote:** aparência que sugira uma ação inexistente, mock, hardcode de dados do canvas ou evolução funcional não aprovada.

## 3. Inventário de filtros e seleções do `.pen`

### 3.1 Administração de empresas — `Xkwdd`

| Controle visual | Semântica pretendida | Situação do contrato atual | Classificação | Decisão de implementação |
|---|---|---|---|---|
| `Buscar empresa...` | Procurar por nome fantasia, razão social ou CNPJ | `listCompanies()` retorna `display_name`, `legal_name` e `tax_id` | Suportável agora / frontend pendente | Filtrar em memória após o carregamento. Busca deve ter label, limpar e estado vazio. |
| `Todas as empresas` | Filtrar status da empresa | O retorno possui `status` e `setCompanyStatus` usa `ACTIVE/INACTIVE` | Suportável agora / frontend pendente | Select real com `Todos`, `Ativas`, `Inativas`; labels não substituem enum no domínio. |
| Footer `Mostrando 4 de 12` | Paginação/quantidade exibida | RPC não recebe `limit`, `offset`, cursor ou total separado | Backend necessário para paginação server-side | Nesta fase mostrar contagem real do resultado carregado; não desenhar páginas clicáveis. Paginação server-side só após contrato de escala. |
| Ordenação de coluna | Não aparece como controle aprovado | RPC retorna ordenação própria e não há sort param | Não permitido neste lote | Não adicionar setas ou headers clicáveis. |

**Limite:** a busca local é adequada enquanto a lista carregada for a unidade de trabalho. Se a quantidade de empresas crescer, evoluir `admin_list_companies(p_status, p_query, p_limit, p_cursor)` com total/cursor, validação de plataforma e testes de não vazamento.

### 3.2 Estabelecimentos — `l6fLqB` e `BgB9z`

| Controle visual | Semântica pretendida | Situação do contrato atual | Classificação | Decisão de implementação |
|---|---|---|---|---|
| `Buscar estabelecimento...` | Procurar por nome, endereço, cidade ou UF dentro da empresa | `listEstablishments(companyId)` retorna `name`, `address_label`, `city`, `state`, `status` | Suportável agora / frontend pendente | Filtrar o resultado da empresa em memória. |
| `Todas as empresas` | Trocar/filtrar empresa proprietária | A rota é `/admin/empresas/[companyId]/estabelecimentos`; RPC é escopado por `p_company_id` | Backend/arquitetura necessário | Não renderizar como filtro funcional nesta rota. Usar contexto/breadcrumb da empresa. Um filtro global exigiria nova rota e RPC platform-scoped. |
| Modal de desativação | Não é filtro; confirma mudança de status | `admin_set_establishment_status` e `ConfirmDialog` existem | Suportável agora | Preservar modal, texto de impacto, cancelar, confirmar e retorno de foco. |
| Footer paginado | Indica volume total | RPC não tem paginação | Backend necessário para paginação real | Mostrar contagem carregada sem controles de página. |

`l6fLqB` é o estado com modal aberto; `BgB9z` é o estado normal. Não criar uma rota por estado.

### 3.3 Convites — `ILrZa`

| Controle visual | Semântica pretendida | Situação do contrato atual | Classificação | Decisão de implementação |
|---|---|---|---|---|
| Seleção `Cliente`, `Entregador`, `Operador interno` | Define `invited_role` na criação | `createCompanyInvitation` e RPC aceitam `CUSTOMER`, `DRIVER`, `INTERNAL_OPERATOR` | Suportável agora | Usar labels em português com payload enum real. Não permitir `PLATFORM_ADMIN` pelo formulário. |
| `Buscar convite...` | Procurar por e-mail | `admin_list_company_invitations` retorna `invited_email`, status e datas | Suportável agora / frontend pendente | Busca local por e-mail, normalizada sem alterar valor persistido. |
| `Filtrar por e-mail` | Filtro textual/exato por e-mail | Não existe filtro server-side; mesmo conjunto já vem por empresa | Frontend pendente | Pode ser um campo de busca ou select derivado dos e-mails carregados. Não mostrar como filtro se não tiver estado aplicado. |
| Filtro por status | Não aparece claramente como controle no frame | Status é retornado, mas action não recebe filtro | Frontend pendente | Pode ser adicionado somente se fizer parte do lote visual e operar localmente; não é necessário para reproduzir o frame. |
| Paginação | Footer/tabela em canvas sugere lista | RPC não pagina | Backend necessário em escala | Não inventar paginação. |

O retorno atual não inclui `invited_role` na função de listagem; portanto, a tabela não deve prometer filtrar ou exibir papel histórico até o DTO ser ampliado. A seleção do formulário de novo convite continua suportada.

### 3.4 Produtos — `HMEgx`

| Controle visual | Semântica pretendida | Situação do contrato atual | Classificação | Decisão de implementação |
|---|---|---|---|---|
| `Buscar produto por nome ou marca...` | Procurar produto por nome/marca; categoria pode ser incluída se label for ajustado | `listAdminProducts` retorna nome, marca, categoria e status | Frontend pendente, suportável localmente | Filtrar produtos carregados. O placeholder deve refletir exatamente os campos pesquisados. |
| `Todos os status` | Ativo/inativo | `listAdminProducts(status?)` e RPC `p_status` existem | Suportável agora | Reutilizar o select atual; manter `ACTIVE/INACTIVE` no contrato. |
| Filtro por categoria | Não aparece como controle explícito no frame | `category_id/category_name` estão no DTO, mas RPC não recebe categoria | Frontend pendente se local; backend se server-side | Não adicionar como filtro global nesta fase sem necessidade. Se aparecer no redesign, filtragem local é possível para dados carregados; não criar parâmetro RPC automaticamente. |
| Filtro por preço/empresa | Não é filtro da listagem | Preço é configurado no drawer de variante por empresa | Não permitido neste lote | Manter preço no contexto de edição da variante, não duplicar em Produtos. |
| Paginação/ordenação | Não há contrato | RPC não pagina nem recebe ordenação | Backend necessário | Sem affordance clicável. |

O canvas usa contagens e marcas de exemplo. A lista deve usar somente os dados reais do RPC.

### 3.5 Categorias — `kZj4J`

| Controle visual | Semântica pretendida | Situação do contrato atual | Classificação | Decisão de implementação |
|---|---|---|---|---|
| `Buscar categoria...` | Procurar pelo nome | `listAdminCategories` retorna nome/status; lista já é carregada | Frontend pendente, suportável localmente | Filtrar localmente e mostrar vazio específico. |
| `Todos os status` | Ativa/inativa | `listAdminCategories(status?)` possui parâmetro | Suportável agora | Reutilizar filtro por status e atualizar tabela. |
| Contagem de produtos | Informação, não filtro | Contagem é derivada comparando `category_id` dos produtos carregados | Suportável agora | Exibir contagem real; não usar contagem do frame. |
| Excluir/inativar | Ação destrutiva, não filtro | RPC exige confirmação/realoção para `Outros` quando necessário | Suportável agora | Não remover confirmação, aviso nem exceção da categoria `Outros`. |

### 3.6 Drawer de variante — `E07F4`

| Controle visual | Semântica pretendida | Situação do contrato atual | Classificação | Decisão de implementação |
|---|---|---|---|---|
| Empresa do preço | Selecionar tenant cujo preço será salvo | Lista de empresas é carregada pelo editor; RPC upsert é por `company_id + sku_id` | Suportável agora | Preservar seletor real, empresas autorizadas e escopo platform admin. |
| `Todas recebem esse preço` | Aplicar o mesmo valor às empresas autorizadas | RPC bulk `admin_upsert_company_sku_prices` existe | Suportável agora | Checkbox deve refletir cobertura real ao reabrir; não é um filtro e não pode ignorar autorização. |
| Status da variante | Ativa/inativa | `admin_update_variant` suporta status; preços de SKU inativo podem ser preparados, mas catálogo não libera compra | Suportável agora | Mostrar estado real e manter bloqueios de catálogo/carrinho. |

### 3.7 Fila de pedidos — `WU6Sk`

| Controle visual | Semântica pretendida | Situação do contrato atual | Classificação | Decisão de implementação |
|---|---|---|---|---|
| `Buscar pedido ou empresa` / `Número ou nome da empresa` | Procurar pedido por número, empresa ou estabelecimento | `AdminOrder` retorna número, company_name e establishment_name; `OrdersQueue` já filtra localmente | Suportável agora | Preservar busca local e nomes reais. |
| `Status: Todos` | Filtrar status da fila | `listAdminOrders(p_status?)` e `listCompanyOrders(p_status?)` existem; driver usa `DISPATCHED` | Suportável agora | Select deve usar somente status válidos e respeitar o escopo do papel. Driver não recebe filtro que amplie pedidos. |
| Métricas | Resumo de estados | Derivadas da lista carregada | Suportável agora | Não tratar métricas como filtros clicáveis sem handler. |
| Empresa/estabelecimento/entregador/data | Possíveis filtros úteis, não desenhados como filtros aprovados | Alguns campos existem, mas não há contrato dedicado | Não permitido neste lote | Não adicionar. |

### 3.8 Cliente — catálogo `Sdnoa`, `G4VM0i`, `L9mHNx`

| Controle visual | Semântica pretendida | Situação do contrato atual | Classificação | Decisão de implementação |
|---|---|---|---|---|
| Busca por produto, marca, categoria ou embalagem | Filtrar catálogo carregado | `listCatalog` retorna nome, brand, category e detail; `Catalogo` já filtra localmente | Suportável agora | Manter input controlado, limpar, vazio e anúncio acessível. |
| Chips `Todos`, bebidas, mercearia etc. | Filtrar por categoria | `category` vem do catálogo e o estado local já existe | Suportável agora | Chips reais com estado selecionado; categorias devem vir dos dados, não da lista fixa do canvas. |
| `Ordenar: recomendados` | Ordenar produtos | Implementação atual alterna preço crescente/decrescente; “recomendados” não é um critério de domínio | Frontend/decisão de produto | Não chamar de recomendados se o handler ordena por preço. Usar label coerente (`menor/maior preço`) ou solicitar contrato de recomendação. |
| Marca, disponibilidade, embalagem e faixa de preço | Possíveis filtros | Não há estado/contrato no frame como controles individuais; preço pode ser nulo | Não permitido neste lote | Não desenhar como filtros ativos. SKU sem preço aparece indisponível e não pode ser adicionado. |
| Estabelecimento | Seleção de contexto, não filtro de produto | `getCustomerContext`/`selectCustomerEstablishment` usam cookie e membership | Suportável agora | Preservar troca de estabelecimento e recarregar carrinho/endereço; não misturar dados. |
| Carrinho compartilhado | Contexto/contador, não filtro | Carrinho é por empresa + estabelecimento | Suportável agora | Contador de produtos distintos; volumes separados no resumo. |

### 3.9 Checkout `QFXql`

Não há filtros de resultados neste frame. Existem seletores funcionais:

- estabelecimento no topo: suportado por `selectCustomerEstablishment`;
- endereço de entrega: suportado por `listActiveAddresses` e seleção local;
- cadastro de endereço: suportado por `createAddress`;
- janela `Hoje`/`Amanhã`: suportada pelo contrato atual de `submit_order_for_review`;
- quantidade/remoção: suportadas por `setCartItemQuantity` e regras de mínimo.

Esses controles não devem ser apresentados como filtros de catálogo nem receber novos valores sem evolução explícita do contrato.

### 3.10 Auth e perfil `sKLrk`, `KOx2B`, `RbFrT`, `vyXQN`

Não existem filtros. O botão Google é uma ação visual explicitamente desabilitada. O seletor de papel no convite é criação de acesso, não filtro. Perfil exibe empresa real do usuário, não permite seleção de empresa.

## 4. Observação do cliente — especificação end-to-end

### 4.1 Objetivo e semântica

`customer_note` é texto opcional informado pelo cliente no checkout para orientar a operação do pedido. Exemplos: instrução de acesso, ponto de entrega ou observação logística. É distinto de:

- `order_status_history.reason`: motivo técnico/operacional da transição;
- `order_price_history.reason`: justificativa do operador ao alterar preços finais;
- `cancel_order(p_reason)`: motivo obrigatório do cancelamento;
- mensagens do chat: comunicação posterior entre participantes.

Regra aprovada para esta implementação: texto opcional, normalizado com `trim`, nulo quando vazio, máximo de 500 caracteres.

Não permitir edição da observação após o pedido ser enviado para análise nesta V1. A observação deve ser um snapshot imutável da intenção enviada junto do pedido.

### 4.2 Schema autorizado para implementação

Adicionar à tabela `public.orders`:

```sql
customer_note text null,
check (customer_note is null or char_length(customer_note) <= 500)
```

Recomendações:

- não usar `jsonb`/`address_snapshot` para esconder o campo;
- não adicionar índice: não há requisito de busca por texto nesta V1;
- não registrar o texto integral em `audit_logs`, URLs, idempotency payloads ou logs de erro;
- preservar `NULL` para ausência de observação, distinguindo de texto vazio;
- não alterar o histórico de status existente.

### 4.3 RPC e idempotência

O RPC atual `submit_order_for_review` recebe `p_cart_id`, `p_address_id`, `p_window_label` e `p_idempotency_key`; não recebe observação. A implementação atual também calcula o hash de idempotência sem observação.

Evolução mínima recomendada:

1. atualizar a implementação interna para receber `p_customer_note text default null`;
2. normalizar e validar o texto antes de criar o pedido;
3. incluir o valor normalizado no `request_hash` da idempotência;
4. inserir `customer_note` em `public.orders` na mesma transação que cria o pedido e os snapshots dos itens;
5. manter rollback integral em falha de endereço, estoque, preço, mínimo ou autorização;
6. expor um contrato RPC versionado/aditivo ou substituir explicitamente a assinatura atual, evitando sobrecarga ambígua no PostgREST;
7. manter `SECURITY DEFINER`, `search_path`, `revoke`/`grant` e validações de perfil/membership existentes.

Para minimizar risco, a recomendação é criar um RPC explicitamente versionado, por exemplo `submit_order_for_review_with_note`, durante uma janela de migração, atualizar a action e os tipos e só remover o contrato antigo após todos os consumidores serem migrados. Se a equipe preferir substituir a assinatura, deve revisar as funções wrapper/impl e os grants em conjunto.

### 4.4 Action e DTOs

Alterações necessárias na implementação autorizada:

- `confirmActiveCart(input)` recebe `customerNote?: string`;
- validação client-side de tamanho é apenas ergonomia; o servidor continua autoridade;
- action envia valor normalizado no RPC e mapeia erro específico `INVALID_CUSTOMER_NOTE`;
- `ConfirmOrderResult` não precisa expor o texto, somente o pedido criado;
- `getOrderDetails` seleciona `customer_note` e adiciona `customerNote: string | null` ao DTO do cliente;
- `CompanyOrderDetails`/retorno de `company_get_order_details` adiciona `customerNote` para plataforma, operador interno e driver autorizado;
- tipos Supabase devem ser regenerados depois da migration;
- exportações XLSX/PDF devem incluir a observação uma vez no cabeçalho/metadado do pedido, não repetida como item, com quebra de linha segura no PDF e célula protegida no Excel.

Não incluir a observação em `listOrders`, notificações ou contador do carrinho salvo se surgir requisito específico; esses DTOs devem continuar mínimos.

### 4.5 RLS e autorização

Com a coluna em `orders`, as policies de leitura existentes já escopam pela empresa/membership, mas precisam ser reavaliadas:

- cliente ativo só lê o campo através dos pedidos que a policy atual permite;
- operador interno ativo lê pedidos da própria empresa;
- plataforma lê por RPC admin;
- driver não recebe observações de pedidos não atribuídos; `company_get_order_details` deve manter a guarda de atribuição antes de retornar o DTO;
- escrita não deve ser liberada diretamente por `INSERT/UPDATE` do cliente; somente RPC autorizado deve preencher a coluna;
- não criar policy ampla para a nova coluna, pois PostgreSQL RLS é por linha, não por coluna;
- confirmar que o endpoint de exportação usa o detalhe autorizado e não consulta direta sem escopo.

Nenhuma policy nova é necessariamente requerida se a tabela `orders` continuar com as policies de linha atuais; a revisão é obrigatória para confirmar que nenhum caminho de leitura alternativo expõe pedidos cross-company.

### 4.6 UI e acessibilidade

No checkout:

- substituir o textarea não controlado por estado `customerNote`;
- label persistente: `Observações para a operação (opcional)`;
- `maxLength` coerente com o limite server-side;
- contador de caracteres opcional, mas não usar placeholder como label;
- preservar o texto durante erros/retry, sem duplicar pedido;
- após sucesso, mostrar confirmação e não permitir edição do pedido enviado;
- loading/desabilitado enquanto envia;
- erro junto ao campo ou alerta focável, sem falso sucesso.

Nos drawers `S6mgJ` e `rm9SZ`:

- seção `Observações do pedido` perto do endereço/janela e antes das ações;
- valor real escapado/seguro;
- ausência explícita: `Nenhuma observação informada`;
- leitura disponível para plataforma/operador e driver quando autorizado;
- não apresentar o campo como editável.

Na tela de detalhe do cliente:

- mostrar a observação apenas quando o contrato de leitura estiver disponível;
- não permitir que a ausência seja confundida com falha de carregamento.

## 5. Alterações necessárias para executar o escopo

### Sem evolução de backend

- filtros locais para empresas, estabelecimentos dentro da empresa, convites por e-mail, produtos, categorias e catálogo;
- status usando os parâmetros já existentes;
- correção dos labels de ordenação do catálogo para não prometer “recomendados” quando o critério real é preço;
- Google disabled conforme decisão;
- perfil com empresa real via consulta autorizada já existente, caso a leitura de `companies.display_name` por membership seja confirmada;
- remoção de affordances de paginação, colunas ordenáveis e filtros cross-company não suportados.

### Com evolução de backend

- persistência da observação do cliente e retorno nos DTOs;
- exportação da observação depois que o DTO operacional a fornecer;
- paginação server-side, busca server-side e filtro global de estabelecimentos se a escala exigir;
- incluir `invited_role` no RPC de listagem se a tabela precisar exibir/filtrar o papel histórico;
- qualquer filtro por disponibilidade real, estoque, faixa de preço, cliente, entregador ou datas, caso seja aprovado depois.

## 6. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Campo de observação continua parecendo funcional sem persistir | Alto: perda silenciosa de instrução | Não declarar pronto; manter documentado como pendente ou implementar migration/RPC completo antes de habilitar o CTA. |
| Alteração de assinatura RPC quebra PostgREST/consumidores | Alto | Preferir RPC aditivo/versionado; atualizar grants, tipos e action em conjunto. |
| Observação entra no hash de idempotência de forma inconsistente | Alto: retry pode criar conflito ou duplicidade | Normalizar antes do hash; testar mesmo texto, texto diferente e chave reutilizada. |
| Texto livre contém dados sensíveis | Médio/alto | Não logar conteúdo; limitar tamanho; documentar visibilidade para equipe da empresa e retenção. |
| Filtro cross-company em rota company-scoped | Alto: risco de IDOR | Não renderizar; exigir RPC platform-scoped e teste cross-tenant antes de liberar. |
| Filtro local diverge de paginação futura | Médio | Definir contrato único antes de migrar para server-side; manter labels e semantics estáveis. |
| Label “recomendados” mente sobre ordenação | Médio: decisão errada de compra | Alterar label para o critério real ou aprovar ranking de recomendação separadamente. |
| Nota do operador confundida com nota do cliente | Médio: atribuição incorreta | Campos, DTOs, labels, actions e tabelas separados (`customer_note` vs `p_reason`/históricos). |

## 7. Testes necessários

### Filtros

- Empresas: busca por nome fantasia, razão social e CNPJ; status ativo/inativo; vazio; limpar; dados reais sem paginação falsa.
- Estabelecimentos: busca por nome/endereço/cidade; garantir que o resultado permaneça dentro da empresa da URL.
- Convites: busca case-insensitive por e-mail; convite pendente/aceito/expirado; nenhum e-mail de outra empresa aparece.
- Produtos/categorias: busca por campos permitidos, status, contagem real e combinação filtro + reload.
- Pedidos: busca por número/empresa/estabelecimento e status; confirmar que operador/driver recebem apenas escopo autorizado.
- Catálogo: busca, categoria, ordenação real, limpeza, sem preço, SKU inativo e troca de estabelecimento sem mistura.
- Todos: submit duplicado, erro de API, loading, vazio e foco acessível.

### Observação do cliente

- `NULL` e string em branco resultam em ausência persistida, não em texto vazio.
- Texto válido no limite; texto acima do limite rejeitado pelo servidor.
- Caracteres Unicode, quebra de linha e HTML não executam nem quebram PDF/Excel.
- Observação persiste no pedido criado e aparece no detalhe autorizado do cliente/operador.
- Driver vê somente nota do pedido atribuído; outro driver e outra empresa recebem `FORBIDDEN`/ausência segura.
- Cliente não consegue alterar a observação após envio por update direto ou RPC indevido.
- Falhas de estoque/preço/endereço não deixam pedido parcial nem nota órfã.
- Mesmo idempotency key + mesmo payload retorna o mesmo pedido; mesma key + nota diferente retorna conflito.
- Exportação inclui nota apenas para plataforma/operador autorizados.
- Logout, sessão expirada e troca de conta não deixam nota de usuário anterior na UI.

## 8. Critério de aprovação do escopo

O lote visual pode avançar com filtros locais e Google disabled após revisão do Product Design. A observação do cliente está autorizada como lote funcional separado e só deve ser habilitada na UI após migration, RPC, RLS/DTO, tipos, action, exportação e testes acima serem implementados e validados.

Até a implementação desse lote, a observação do cliente permanece uma **lacuna funcional explicitamente registrada**; o frontend não deve simular persistência ou sucesso.
