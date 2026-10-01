# Modelo de Domínio Inicial — ProStock MVP

**Tarefa:** DOMAIN-001  
**Status:** APPROVED  
**Data:** 2026-09-23  
**Revisão:** DOMAIN-001-REVISION-1 — pareceres APPROVE_WITH_CHANGES incorporados  
**Responsável:** PRODUCT-DOMAIN  
**Revisores requeridos:** SOFTWARE-ARCHITECT e DATABASE-ARCHITECT

## 1. Finalidade, escopo e autoridade

Este documento define o modelo de domínio inicial e implementável do MVP ProStock para a cadeia prioritária:

> catálogo → produto/SKU → carrinho → pedido → validação de preço → validação de estoque → reserva → confirmação → separação → expedição → entrega → confirmação de recebimento

O modelo também delimita cliente/empresa, atendimento, notificações e auditoria necessários para sustentar essa cadeia. Ele é independente de React, Next.js, Supabase e do desenho físico do banco. Persistência, APIs, RLS e policies SQL pertencem às fases DATA-001, ADR-001 e SECURITY-001.

Fontes consideradas:

- `context/PROMPT_maestri.txt`, fonte principal de escopo, perfis, regras e sequência de entrega;
- `docs/current-state.md` (AUDIT-001), fonte do estado real do código;
- `context/Documento sem título.md`, requisitos iniciais;
- `context/Guia de Identidade Visual e Experiencia - MVP Distribuicao ES.md`, fonte de jornadas e linguagem apresentada ao usuário;
- páginas atuais `/`, `/catalogo`, `/pedido` e `/pedidos`, usadas somente para identificar intenções, dados exibidos e lacunas.

Em caso de conflito, regras aprovadas no prompt mestre e nesta tarefa prevalecem sobre mocks e textos de interface. Decisões comerciais não aprovadas estão em **Decisões Humanas Pendentes** e não devem ser inferidas pela implementação.

## 2. Estado atual versus domínio real

O frontend atual é um protótipo navegável. Seus tipos e dados não são entidades do domínio:

| Elemento atual | Natureza atual | Interpretação no domínio real |
| --- | --- | --- |
| `Product` local com `name`, `detail`, `price`, `status`, `quantity` | View model duplicado | Projeção de Product + ProductVariant/SKU + Price + Availability; `quantity` é quantidade no carrinho, nunca estoque do produto |
| `Order` local com strings de data/status | View model de lista | Projeção tenant-scoped de Order, OrderItem, histórico e Delivery |
| `Disponível` / `Baixo estoque` | Texto mockado | Availability derivada; não substitui InventoryBalance nem autoriza confirmação |
| “Pedido em criação” | Estado local por página | Cart persistível e pertencente à empresa/usuário |
| “Confirmar pedido” | Booleano local | Comando server-side que revalida preço e estoque e cria pedido/reservas/históricos atomicamente |
| Previsão “hoje/amanhã” | Texto de apresentação | Estimativa ou compromisso de janela conforme decisão comercial pendente |
| Etapas `Confirmado`, `Separação`, `Pronto`, `Em rota`, `Entregue` | Narrativa do cliente | Projeção simplificada de estados internos de Order e Delivery |

Consequências:

1. a UI pode manter rótulos simples, mas não define transições;
2. DTOs de leitura podem combinar módulos, sem transformar essa combinação em agregado;
3. preço, disponibilidade, totais e permissões recebidos do browser nunca são autoritativos;
4. os mocks só devem ser removidos quando seus contratos reais estiverem implementados e validados.

## 3. Linguagem ubíqua

| Termo | Definição |
| --- | --- |
| Empresa (`Company`) | Organização cliente e fronteira principal de tenant dos dados comerciais do CUSTOMER |
| Estabelecimento (`Establishment`) | Unidade operacional de uma empresa; possui endereço e pode ser destino de pedido. A exigência de ao menos um estabelecimento vem dos requisitos iniciais |
| Perfil (`Profile`) | Dados duráveis da pessoa na aplicação; não representa sessão, cookie ou JWT e não determina sozinho tenant/papel efetivo |
| Vínculo (`Membership`) | Associação durável e autorizada entre Profile, papel e escopo de Company quando a política adotada exigir |
| Contexto do ator (`AuthenticatedActorContext`) | Objeto server-side validado para um caso de uso: `actorId`, `profileId`, papéis efetivos, tenant/escopo ativo, permissões e correlação; nunca construído a partir de claims/payload sem validação |
| Cliente (`Customer`) | Papel/relacionamento pelo qual uma empresa compra da plataforma; não é sinônimo de pessoa autenticada |
| Catálogo | Conjunto publicável de categorias, produtos, SKUs, imagens, preços e informações de apresentação |
| Produto (`Product`) | Conceito comercial agrupador, sem saldo de estoque e sem quantidade comprável por si só quando possui variantes |
| Variante / SKU (`ProductVariant`) | Unidade comercial identificável e comprável, com código SKU, embalagem/unidade de venda e atributos de variação |
| Preço (`Price`) | Oferta monetária de um SKU obrigatoriamente definida por Company; deve ser revalidada ao confirmar o pedido e capturada no OrderItem |
| Disponibilidade (`Availability`) | Projeção informativa derivada de estoque e regras de atendimento; não equivale ao saldo e não constitui garantia até a reserva |
| Carrinho (`Cart`) | Intenção mutável de compra de uma empresa antes da confirmação; contém SKUs e quantidades solicitadas |
| Pedido (`Order`) | Compromisso comercial persistido, com itens, valores capturados, destino, totais e histórico |
| Item de pedido (`OrderItem`) | Linha imutável quanto ao SKU e ao snapshot comercial após a confirmação |
| Local de estoque (`InventoryLocation`) | Local operacional no qual saldos são controlados |
| Saldo (`InventoryBalance`) | Posição corrente de um SKU em um local, separando quantidade física e reservada |
| Quantidade disponível | `onHand - reserved`, salvo regra futura explicitamente aprovada; não é campo de Product |
| Movimento (`InventoryMovement`) | Registro imutável de toda alteração relevante de estoque, com motivo e referência causal |
| Reserva (`InventoryReservation`) | Alocação temporária ou comprometida de quantidade disponível para um item de pedido |
| Separação (`Picking`) | Execução operacional que coleta os itens reservados para expedição |
| Expedição (`Dispatch`) | Saída do pedido da custódia de estoque para o fluxo de entrega |
| Entrega (`Delivery`) | Execução logística associada a um pedido, com responsável, paradas, estados, ocorrências e comprovação |
| Parada (`DeliveryStop`) | Conceito fora do MVP; o destino pertence diretamente à Delivery |
| Rota (`Route`) | Conceito fora do MVP; não há agrupamento multi-entrega |
| Ocorrência (`DeliveryOccurrence`) | Fato excepcional ocorrido na entrega, com tipo, descrição, autor e instante |
| Comprovante (`DeliveryProof`) | Evidência autorizada de tentativa ou conclusão da entrega |
| Confirmação de recebimento | Reconhecimento final do recebimento; é distinta do registro operacional de chegada do entregador |
| Ticket | Solicitação de atendimento vinculada à empresa e, opcionalmente, a pedido ou entrega |
| Notificação | Mensagem dirigida a um destinatário sobre evento relevante e com link para seu contexto autorizado |
| Auditoria | Registro imutável de quem fez o quê, quando, em qual recurso e em qual tenant/contexto |

## 4. Limites de módulos

O MVP é um monólito modular. Cada módulo controla suas invariantes e expõe casos de uso; nenhum componente de UI altera diretamente seus dados.

| Módulo | Responsabilidade e propriedade | Consome de |
| --- | --- | --- |
| Identity & Access | valida identidade autenticada e produz AuthenticatedActorContext; mantém Profile/memberships duráveis separados da sessão | provedor de identidade; regras definidas em SECURITY-001 |
| Customers | Company, Establishment, Address e dados comerciais do cliente | Identity & Access |
| Catalog | Category, Product, ProductVariant/SKU, ProductImage, Price e publicação | contexto comercial autorizado |
| Cart | intenção de compra mutável e seus itens | Customers, Catalog; disponibilidade é consulta, não estado próprio |
| Orders | Order, OrderItem, totais, snapshot, status e histórico | Customers, Catalog, Inventory |
| Inventory | InventoryLocation, InventoryBalance, InventoryMovement e InventoryReservation | referências de SKU e pedido, sem possuir Product/Order |
| Fulfillment | Picking e expedição do pedido confirmado | Orders e Inventory |
| Deliveries | Delivery, DeliveryOccurrence, DeliveryProof e histórico | Orders, Customers e Identity & Access |
| Support | SupportTicket, SupportMessage, atribuição e escalonamento humano | Customers e referências opcionais a Order/Delivery |
| Notifications | entrega e leitura de mensagens decorrentes de fatos do domínio | eventos dos módulos; não autoriza acesso ao recurso alvo |
| Audit | trilha transversal de ações críticas | contexto autenticado e eventos/comandos críticos |

Regras de acoplamento:

- módulos referenciam identidades de agregados externos, não objetos mutáveis de outros módulos;
- consultas compostas usam read models/DTOs e continuam sujeitas a autorização;
- eventos registram fatos já ocorridos, mas o MVP não usa event sourcing, broker ou microserviços;
- operações que cruzam Order e Inventory e que não toleram falha parcial devem compartilhar uma fronteira transacional;
- abstrações de aplicação e domínio não dependem do framework nem do adaptador de persistência.

### 4.1 Context map direcional

As setas indicam dependência de contrato ou consumo de fato, nunca importação bidirecional de agregados:

| Upstream | Direção | Downstream | Contrato permitido |
| --- | --- | --- | --- |
| Identity & Access | → | todos os casos de uso | `AuthenticatedActorContext`; módulos de negócio não leem cookie/JWT diretamente |
| Customers | → | Cart, Orders, Deliveries, Support | IDs opacos e snapshots validados de Company/Establishment/Address |
| Catalog | → | Cart, Orders, Inventory | `SkuId`, dados publicáveis e resolução de preço; Inventory não importa Product |
| Cart | → | Orders | snapshot/intenção do carrinho no comando de submissão; Orders não modifica Cart diretamente |
| Orders | → | Fulfillment | `OrderId`, itens/snapshots e fatos de confirmação |
| Orders | → | Inventory | pedido de reserva/liberação/consumo coordenado pela aplicação; nenhum agregado chama repositório do outro |
| Fulfillment | → | Deliveries | fato de prontidão/expedição e IDs opacos |
| Deliveries | → | Orders | `DeliveryCompleted`/`DeliveryAttemptFailed`; Delivery é autoridade logística e a aplicação atualiza Order idempotentemente |
| módulos de negócio | → | Notifications e Audit | fatos mínimos; consumidores revalidam recipient, tenant e autorização |

Regras contra ciclos:

- entidades de um módulo guardam somente IDs opacos/snapshots necessários de outro;
- coordenação cross-module ocorre em application services por ports, Unit of Work e eventos pós-commit;
- nenhum módulo de domínio importa repositório, entidade mutável ou serviço concreto de outro módulo;
- o retorno Delivery → Orders é por fato consumido idempotentemente, não dependência de domínio inversa;
- read models podem compor dados, mas não são usados para decidir invariantes.

## 5. Atores, perfis e escopos

| Perfil | Escopo permitido no MVP | Restrições obrigatórias |
| --- | --- | --- |
| `CUSTOMER` | manter dados comerciais autorizados; consultar catálogo; manter carrinho; criar e acompanhar pedidos/entregas da própria empresa; abrir e acompanhar tickets; ler notificações próprias | nunca acessar custos, margens, fornecedores internos ou dados de outra empresa |
| `INTERNAL_OPERATOR` | administrar catálogo/preços, estoque, pedidos, separação, logística, ocorrências e atendimento conforme permissões internas | acesso operacional não implica automaticamente administração de segurança; ações críticas são auditadas |
| `DRIVER` | consultar apenas entregas atribuídas; visualizar dados mínimos para executar a parada; atualizar estados permitidos; registrar ocorrência e comprovante | não acessar entregas alheias, custos, margens, fornecedores, catálogo administrativo ou dados comerciais desnecessários |
| `PLATFORM_ADMIN` | administrar contas internas, entregadores, parâmetros, segurança e operação; consultar auditoria e indicadores | operações privilegiadas são autorizadas server-side e auditadas; privilégio não deve ser inferido da UI |

Princípios de autorização:

- esconder UI não é autorização;
- role, identidade, atribuição e `company_id` são derivados de sessão/contexto confiável no servidor;
- `company_id`, role, preço, total, saldo e transição enviados pelo browser são apenas solicitações, nunca autoridade;
- toda leitura e mutação de recurso por ID valida tenant/escopo, evitando IDOR;
- respostas retornam o mínimo de dados necessário ao perfil;
- uma notificação ou referência conhecida não concede acesso ao objeto relacionado.

`AuthenticatedActorContext` é entrada obrigatória de todo comando/consulta protegidos. Ele é resolvido no servidor após validar sessão e estado do Profile/membership. Deve conter apenas o necessário para autorizar o caso de uso e não pode ser reconstruído por cada módulo a partir de cookie, JWT bruto ou campos enviados pelo browser.

## 6. Ownership e multi-tenancy

1. **Tenant principal do cliente:** Company. Recursos de compra carregam ownership imutável ou historicamente preservado por `companyId`.
2. **Escopo operacional:** dados mestres do catálogo, estoque da distribuidora e operação interna são platform-owned, mas sua exposição é filtrada por papel e contexto comercial.
3. **Estabelecimento:** pertence exatamente a uma Company. Address operacional pertence ao Establishment e alcança a Company por relação obrigatória e imutável.
4. **Cart, Order, SupportTicket e notificações do cliente:** pertencem a uma Company e não podem mudar de tenant.
5. **Delivery:** é platform-owned operacionalmente e referencia o `companyId` do pedido para visibilidade do cliente; DRIVER acessa por atribuição ativa, não por tenant informado.
6. **Inventory:** é platform-owned por InventoryLocation. Um cliente não lê saldos internos; recebe somente Availability permitida.
7. **Audit:** preserva `actorId`, papel efetivo, tenant/contexto, ação, recurso e instante. Não deve conter segredos nem payloads sensíveis desnecessários.
8. **Acesso interno cross-tenant:** só existe por permissão operacional explícita e auditável; não é consequência implícita de não possuir `companyId`.
9. **Insumos RLS-ready:** o tenant de todo registro filho tenant-owned é derivado do pai por caminho relacional obrigatório e imutável. `companyId` enviado pelo browser ou duplicado no filho não é autoridade; nenhuma tabela filha pode ficar sem caminho verificável até a Company proprietária.

## 7. Value objects

| Value object | Regras mínimas |
| --- | --- |
| `EntityId` especializados | não vazios, opacos, não intercambiáveis entre tipos |
| `SkuCode` | normalizado e único no escopo definido em DATA-001 |
| `Money` | valor em unidade mínima inteira + moeda; mesma moeda para operações aritméticas; nunca `float` |
| `Quantity` | inteiro positivo em itens/reservas e zero permitido em saldos; usa a unidade comercial do SKU, sem frações ou conversões no MVP |
| `UnitOfMeasure` | identifica a unidade comercial e de controle do SKU; carrinho, pedido e estoque usam a mesma unidade no MVP |
| `AddressSnapshot` | dados suficientes do destino capturados no pedido/entrega; mudança posterior do cadastro não altera o histórico |
| `DeliveryWindow` | início anterior ao fim, fuso explícito, natureza estimada/comprometida ainda depende de decisão humana |
| `DateTime` | instante absoluto armazenável e exibido no fuso do usuário/estabelecimento |
| `PriceSnapshot` | unit price, moeda, regra/origem aplicável e instante de captura; imutável no OrderItem confirmado |
| `ContactSnapshot` | nome/telefone mínimos necessários à entrega, com acesso limitado e retenção apropriada |
| `FileReference` | referência a objeto armazenado, MIME/tamanho/ownership validados; binário não integra o agregado |
| `StatusChange` | estado anterior, novo estado, instante, ator/motivo e referência de correlação |
| `IdempotencyKey` | chave opaca recebida/gerada para um comando crítico, no escopo tenant/plataforma + actor + commandName + key, retida por 90 dias |

## 8. Entidades e agregados candidatos

“Candidato” indica fronteira lógica a validar no desenho de dados; não exige uma tabela por classe nem persistência orientada a objetos.

### 8.1 Customers e Identity

#### Company — raiz candidata

- identidade, razão/nome de exibição, dados comerciais estritamente necessários e timestamps;
- possui um ou mais Establishments segundo o requisito inicial;
- é a fronteira de ownership dos dados do CUSTOMER;
- suspensão/inativação e seus efeitos em pedidos existentes precisam ser definidos em SECURITY-001/decisão de negócio.

#### Establishment — entidade da Company

- identidade, `companyId`, nome, status operacional e endereços;
- pode ser destino e contexto de compra;
- nunca pode ser associado a Order de outra Company.

#### Profile — raiz candidata de identidade da aplicação

- referencia a identidade autenticada e mantém nome, contato e estado duráveis;
- não é sessão, cookie, JWT nem o próprio AuthenticatedActorContext;
- Profile possui um papel global; CUSTOMER tem vínculo com uma única Company e alterna seus Establishments; internos têm escopo platform sem `companyId` conforme DH-11;
- role e tenant efetivos nunca são alterados ou selecionados por payload não privilegiado.

#### Membership — vínculo de Company

- associa o Profile CUSTOMER à sua única Company/escopo de Establishments, com vigência/estado e concessor auditável;
- não atribui um segundo papel global nem uma segunda Company no MVP; é o vínculo que autoriza o compartilhamento do Cart por Establishment;
- não substitui a validação server-side da sessão nem concede escopo fora de sua vigência.

#### Address

- endereço operacional cadastrado pertence ao Establishment; a Company proprietária é derivada por relação obrigatória; endereço cadastral direto da Company não faz parte do MVP;
- qualquer filho ou referência deve permitir derivar a Company proprietária para autorização/RLS;
- Order captura AddressSnapshot; edição do cadastro não reescreve pedidos passados.

### 8.2 Catalog

#### Category — raiz candidata

- identidade, nome, ordem e estado de publicação; cada Product pertence a uma Category e não há hierarquia no MVP;
- categoria inativa não aparece em novas consultas, sem apagar referências históricas.

#### Product — raiz candidata

- identidade, nome, marca/apresentação, descrição, uma Category e estado de publicação;
- agrupa uma ou mais ProductVariants;
- não contém preço autoritativo, saldo ou quantidade de carrinho.

#### ProductVariant / SKU — entidade comprável

- identidade, `productId`, SkuCode, atributos de variação, embalagem, unidade de venda e estado;
- cada CartItem, OrderItem, InventoryBalance e reserva referencia um SKU, nunca apenas o nome do produto;
- SKU inativo não entra em novo carrinho/pedido, mas permanece em históricos.

#### Price — raiz candidata temporal

- referencia obrigatoriamente Company, SKU, Money, vigência e estado;
- para uma mesma combinação `companyId + skuId`, vigências aplicáveis não podem se sobrepor nem produzir mais de um preço no mesmo instante;
- Company é a única dimensão comercial de resolução no MVP: Establishment, segmento e volume não participam sem nova decisão humana;
- alterar Price não altera OrderItem já confirmado, que preserva PriceSnapshot com valor, moeda, Company/contexto e instante de captura;
- custo e margem são dados internos separados do preço exposto e nunca integram DTO de CUSTOMER/DRIVER.

#### ProductImage

- referencia Product ou SKU, FileReference, texto alternativo, ordem e indicação de imagem principal;
- imagem principal é no máximo uma por escopo publicável;
- arquivo e metadados obedecem autorização e validação de upload futuras.

### 8.3 Cart

#### Cart — raiz

- `id`, `companyId`, `establishmentId`, criador original para auditoria, itens, versão e timestamps;
- existe no máximo um Cart `ACTIVE` por `Company + Establishment`; ele é compartilhado entre Profiles com Membership ativa e autorizada para esse escopo;
- `createdByProfileId` não torna o Cart privado nem concede acesso por si só;
- toda mutação informa a versão esperada; conflito otimista rejeita a gravação obsoleta e exige recarga/reaplicação consciente;
- possui no máximo uma linha por SKU; adicionar o mesmo SKU incrementa/substitui Quantity conforme comando explícito;
- não possui estoque reservado;
- preços exibidos são estimativas e precisam ser revalidados no servidor;
- só pode ser convertido uma vez em Order por operação idempotente; retries retornam o mesmo resultado e nunca criam segundo pedido; após conversão fica somente para rastreabilidade ou é encerrado conforme política de retenção.

#### CartItem — entidade interna

- `skuId`, Quantity e último preço apresentado opcional para explicar divergência;
- quantidade deve respeitar limites comerciais aprovados; mínimo/lote são pendências se aplicáveis;
- não captura preço histórico definitivo.

Estados mínimos: `ACTIVE` → `CONVERTED`; abandono/expiração do carrinho não é necessário ao fluxo crítico e depende de política posterior.

### 8.4 Orders

#### Order — raiz

- `id`, número legível, `companyId`, `establishmentId`, criador, itens, AddressSnapshot, janela solicitada/aceita, observação, totais, estado e timestamps;
- o número legível é gerado server-side, global, nunca identifica ownership/autorização e pode conter lacunas;
- referencia o Cart de origem quando aplicável;
- possui pelo menos um OrderItem válido;
- tenant, destino, preços, totais e permissões são validados server-side;
- cada alteração de estado gera OrderStatusHistory;
- itens e snapshots comerciais ficam imutáveis após `CONFIRMED`, exceto por fluxo explícito de alteração ainda fora do MVP.

#### OrderItem — entidade interna

- `skuId`, SkuCode/nome/embalagem snapshots necessários, Quantity, PriceSnapshot, subtotal e referências de reserva;
- `subtotal = unitPrice × quantity`, com Quantity inteira na unidade comercial do SKU e Money em unidade mínima; não há rateio fracionário;
- preço atual do catálogo jamais recalcula histórico.

#### OrderStatusHistory

- registro append-only de estado anterior/novo, ator, instante e motivo/correlação;
- não substitui AuditLog: histórico explica o negócio; auditoria explica a ação e segurança.

### 8.5 Inventory

#### InventoryLocation — raiz candidata

- local físico/lógico controlado pela operação, com identidade e estado;
- somente locais operacionais podem participar de novas reservas/movimentos.

#### InventoryBalance — raiz de consistência por Location + SKU

- chave lógica `inventoryLocationId + skuId`;
- mantém `onHand` e `reserved`; `available = onHand - reserved` é derivado;
- `onHand >= 0`, `reserved >= 0` e `reserved <= onHand`, salvo aprovação explícita de estoque negativo;
- `reserved` deve ser igual à soma das quantidades de InventoryReservation `ACTIVE` para o mesmo Location + SKU, na mesma unidade de controle;
- não é propriedade de Product e não é exposto diretamente ao CUSTOMER.

#### InventoryMovement — ledger imutável

- tipos iniciais: `IN`, `OUT`, `ADJUSTMENT`, `RESERVATION`, `RELEASE`, `SALE`, `RETURN`;
- contém SKU, local, `onHandDelta`, `reservedDelta`, saldos anterior/posterior para ambos (ou informação equivalente conciliável), unidade, motivo, ator, instante, referência causal e chave de idempotência quando aplicável;
- toda alteração de `onHand` ou `reserved` gera movimento; edição/destruição de movimento lançado é proibida, usando movimento compensatório.

Deltas canônicos, independentes do momento comercial de baixa ainda pendente em DH-04:

| Fato | `onHandDelta` | `reservedDelta` | Observação |
| --- | ---: | ---: | --- |
| entrada | `+q` | `0` | aumenta físico |
| saída não reservada autorizada | `-q` | `0` | reduz físico |
| ajuste | `+q` ou `-q` | `0` | motivo obrigatório; não pode violar reservas |
| reserva | `0` | `+q` | exige `available >= q` antes do fato |
| liberação | `0` | `-q` | exige reserva ACTIVE correspondente; no MVP ocorre por cancelamento/falha autorizada |
| consumo com baixa | `-q` | `-q` | momento escolhido em DH-04; ambos no mesmo fato/unidade de trabalho |
| retorno físico | `+q` | `0` | não reativa reserva encerrada |

Para todo movimento: `afterOnHand = beforeOnHand + onHandDelta` e `afterReserved = beforeReserved + reservedDelta`. O tipo nominal não substitui esses deltas. `SALE` representa consumo com baixa na expedição, conforme DH-04 aprovado.

#### InventoryReservation — raiz candidata

- vincula OrderItem, SKU, InventoryLocation e Quantity;
- estados: `ACTIVE`, `CONSUMED`, `RELEASED`;
- somente `ACTIVE` compõe `reserved`;
- criação exige quantidade disponível suficiente e é atômica com sua movimentação e com a confirmação do pedido;
- `ACTIVE → CONSUMED` na baixa/venda; `ACTIVE → RELEASED` por cancelamento autorizado ou falha operacional registrada;
- estados terminais não retornam a `ACTIVE`; nova alocação cria nova reserva.

### 8.6 Fulfillment

#### Picking — raiz candidata ou processo do pedido

- representa separação de um Order confirmado, linhas esperadas e quantidades efetivamente separadas;
- só inicia com reservas ativas suficientes;
- divergência não pode ser ocultada: bloqueia avanço e exige revisão do Cart;
- concluir separação é pré-condição para `READY_FOR_DISPATCH`.

O MVP não possui picking parcial, substituição automática ou ondas: a separação é integral e qualquer divergência exige revisão do Cart.

### 8.7 Deliveries

#### Delivery — raiz

- `id`, `orderId`, `companyId` derivado do pedido, janela, estado e timestamps;
- cada Order confirmado possui exatamente uma Delivery no MVP;
- cada mudança gera DeliveryStatusHistory;
- Delivery é a autoridade dos fatos logísticos; Order não registra entrega por comando independente;
- atribuição do DRIVER é temporal e append-only: responsável, início/fim de vigência, atribuidor e motivo; somente a atribuição ativa autoriza execução.

#### DeliveryStop / Route

Não são entidades do MVP. AddressSnapshot, ContactSnapshot mínimo e instruções pertencem à única Delivery do Order. Rota multi-entrega e paradas ordenadas ficam fora do escopo aprovado.

#### DriverAssignmentHistory

- registro append-only de atribuição/revogação com `deliveryId`, `driverProfileId`, vigência, ator, motivo e instante;
- no máximo uma atribuição ativa por Delivery, salvo futura política explícita;
- revogação encerra imediatamente autorização futura, sem apagar o histórico.

#### DeliveryOccurrence

- tipo, descrição objetiva, autor, instante e anexos permitidos;
- não altera estado automaticamente sem regra explícita;
- visibilidade ao cliente é controlada: notas internas e dados de terceiros não são expostos.

#### DeliveryProof

- tipo autorizado, FileReference ou dado comprobatório, instante, recebedor quando aplicável e autor;
- prova válida é pré-condição para conclusão quando a modalidade aprovada a exigir;
- formatos obrigatórios (foto, assinatura, nome/código) são decisão pendente.

### 8.8 Support

#### SupportTicket — raiz

- `id`, `companyId`, solicitante, assunto, descrição, prioridade, estado, responsável humano e referências opcionais a Order/Delivery;
- estados iniciais: `OPEN`, `IN_PROGRESS`, `WAITING_CUSTOMER`, `RESOLVED`, `CLOSED`;
- todo ticket deve poder ser assumido/escalado a atendente humano; automação não pode impedir esse ponto;
- reabertura, SLA e prioridades definitivas dependem de decisão operacional.

#### SupportMessage — entidade interna

- autor, visibilidade (`CUSTOMER_VISIBLE` ou `INTERNAL_ONLY`), conteúdo, anexos permitidos e instante;
- CUSTOMER lê apenas mensagens visíveis e do próprio tenant.

Transições mínimas: `OPEN → IN_PROGRESS`; `IN_PROGRESS ↔ WAITING_CUSTOMER`; `IN_PROGRESS → RESOLVED`; `RESOLVED → CLOSED`. Reabertura permanece pendente.

#### SupportStatusHistory

- append-only para toda mudança de estado/atribuição relevante, com estado anterior/novo, ator, instante, motivo e correlação;
- não é substituído por `updatedAt` nem por AuditLog.

### 8.9 Notifications e Audit

#### Notification

- `recipientProfileId` obrigatório, `companyId`/tenant quando a notificação tratar recurso tenant-owned, tipo, título/mensagem, referência de contexto, instante e `readAt` opcional;
- notificações operacionais internas sem Company continuam tendo recipient explícito e escopo platform autorizado; broadcast implícito fica fora do modelo inicial;
- estados derivados `UNREAD`/`READ`; marcar leitura não altera o recurso de origem;
- alertas críticos permanecem até reconhecimento conforme diretriz de experiência;
- o serviço revalida acesso antes de abrir o recurso referenciado.

#### AuditLog

- append-only: ator, papel/contexto efetivo, empresa quando aplicável, ação, tipo/id do recurso, instante, correlação, resultado e metadados mínimos;
- obrigatório para preço, estoque, pedido/cancelamento, entrega, permissões e operações administrativas críticas;
- não armazena secrets, credenciais, arquivos ou conteúdo sensível integral.

## 9. Relacionamentos e cardinalidades lógicas

| Origem | Relação | Destino |
| --- | --- | --- |
| Company | 1:N, ao menos 1 ativo conforme requisito inicial | Establishment |
| Company | 1:N | Establishment, Cart, Order, SupportTicket; Address pertence ao Establishment e Profile CUSTOMER tem vínculo único |
| Category | 1:N, sem hierarquia no MVP | Product |
| Product | 1:N, ao menos 1 SKU publicável | ProductVariant/SKU |
| Product/SKU | 1:N | ProductImage |
| Company + SKU | 1:N temporal, sem vigências sobrepostas | Price |
| Company + Establishment | 0..1 com estado `ACTIVE` | Cart compartilhado |
| Cart | 1:N | CartItem |
| CartItem | N:1 | SKU |
| Order | 1:N | OrderItem, OrderStatusHistory |
| OrderItem | N:1 | SKU; 1:N possíveis reservas |
| InventoryLocation + SKU | 1:1 posição corrente | InventoryBalance |
| InventoryBalance | 1:N fatos | InventoryMovement |
| InventoryReservation | N:1 | OrderItem, SKU, InventoryLocation |
| Order | 0..1 no fluxo inicial | Picking |
| Order | 1:1 no MVP | Delivery |
| Delivery | 1:N | StatusHistory, Occurrence, Proof, DriverAssignmentHistory |
| Delivery | 0..1 atribuição ativa e N históricos | Profile DRIVER |
| SupportTicket | 0..N | SupportMessage, SupportStatusHistory |
| SupportTicket | 0..1 cada | Order e/ou Delivery relacionados |
| Profile | 1:N como recipient explícito | Notification; tenant obrigatório quando o contexto for Company-owned |

Essas cardinalidades são de domínio inicial; DATA-001 define chaves, constraints, tabelas associativas e histórico sem enfraquecer as invariantes.

## 10. Máquinas de estado

### 10.1 Order

Estados canônicos do Order:

- `CONFIRMED`: preço/estoque validados e reservas ativas criadas atomicamente;
- `PICKING`: separação iniciada;
- `READY_FOR_DISPATCH`: separação concluída e pedido liberado;
- `DISPATCHED`: custódia transferida ao fluxo de entrega;
- `DELIVERED`: espelho comercial derivado idempotentemente do fato `DeliveryCompleted`, nunca autoridade logística;
- `RECEIPT_CONFIRMED`: recebimento final confirmado;
- `CANCELLED`: terminal, permitido conforme as janelas de cancelamento aprovadas em DH-06.

Não existem `AWAITING_VALIDATION`, `VALIDATION_FAILED`, estados de parcialidade ou substituição no Order do MVP. A submissão falha sem criar Order comercial; qualquer tentativa técnica/auditoria fica fora da máquina de Order. Divergência de item impede o pedido/separação como um todo e exige revisão do Cart.

Transições permitidas no caminho feliz:

`CONFIRMED → PICKING → READY_FOR_DISPATCH → DISPATCHED`; depois, `DeliveryCompleted` causa atualização idempotente `DISPATCHED → DELIVERED`; a confirmação aprovada causa `DELIVERED → RECEIPT_CONFIRMED`.

Transições de exceção:

- a falha de preço, SKU, endereço/tenant ou estoque é resposta de submissão e não cria Order comercial;
- CUSTOMER pode cancelar somente antes de `PICKING`; INTERNAL_OPERATOR pode cancelar até `READY_FOR_DISPATCH`, sempre com motivo; após expedição não há cancelamento de Order, apenas ocorrência/devolução conforme processo futuro;
- não há saltos, retorno de terminal nem edição direta de status;
- cada transição valida ator, estado atual, pré-condições e idempotência, e grava histórico/auditoria na mesma unidade de trabalho quando necessário.

Pré-condições principais:

| Transição | Pré-condições mínimas |
| --- | --- |
| criação → `CONFIRMED` | empresa/estabelecimento autorizados; itens válidos; preço vigente por Company + SKU resolvido e capturado; totais recalculados em unidade inteira; estoque suficiente; reservas/movimentos criados atomicamente |
| `CONFIRMED → PICKING` | reservas ativas e ator operacional autorizado |
| `PICKING → READY_FOR_DISPATCH` | separação integral concluída; qualquer divergência impede avanço e exige revisão |
| `READY_FOR_DISPATCH → DISPATCHED` | exatamente uma Delivery criada/atribuída para o Order; baixa de estoque e consumo de reserva ocorrem na expedição |
| `DISPATCHED → DELIVERED` | fato `DeliveryCompleted` da Delivery consumido uma única vez/idempotentemente pela coordenação de aplicação |
| `DELIVERED → RECEIPT_CONFIRMED` | confirmação válida do recebedor/cliente ou regra operacional aprovada |

Mapeamento de apresentação ao CUSTOMER:

| Narrativa atual | Estados canônicos possíveis |
| --- | --- |
| Aguardando confirmação | resposta transitória da submissão; não é estado persistido do Order |
| Confirmado | `CONFIRMED` |
| Em separação | `PICKING` |
| Pronto para envio | `READY_FOR_DISPATCH` |
| Em rota | `DISPATCHED` e Delivery `IN_TRANSIT` |
| Entregue | `DELIVERED` ou `RECEIPT_CONFIRMED`, exibindo claramente se confirmação ainda for necessária |

### 10.2 Delivery

Estados mínimos propostos para a autoridade logística:

`PLANNED → ASSIGNED → IN_TRANSIT → DELIVERED`

Exceções: `IN_TRANSIT → ATTEMPT_FAILED`; reprogramação a partir de tentativa falha e cancelamento dependem de política aprovada. `CANCELLED` é terminal quando permitido.

Regras:

- `ASSIGNED` exige DRIVER ativo/autorizado;
- somente responsável atribuído ou operação autorizada atualiza a entrega;
- início da execução exige pedido pronto/expedido;
- conclusão registra instante e nome do recebedor informado pelo DRIVER; foto, assinatura ou código não são obrigatórios no MVP;
- ocorrência não equivale automaticamente a falha ou entrega;
- CUSTOMER vê narrativa simples e somente dados de sua empresa; DRIVER vê dados mínimos de suas atribuições.
- `CompleteDelivery` valida a Delivery e publica/registra `DeliveryCompleted`; um application handler atualiza Order idempotentemente. Não existe comando de Order concorrente chamado `RegisterDelivered`.
- não existe Route nem DeliveryStop obrigatório no MVP; o destino e a execução ficam na única Delivery do Order.

### 10.3 InventoryReservation

`ACTIVE → CONSUMED | RELEASED`.

- transições terminais são irreversíveis;
- toda transição atualiza Balance e gera Movement de modo atômico;
- não há expiração automática no MVP; liberação ocorre por cancelamento autorizado ou falha operacional explicitamente registrada.

## 11. Invariantes testáveis

### Tenant e autorização

1. um CUSTOMER nunca lê nem altera Cart, Order, Delivery, Ticket, Address ou Notification de outra Company;
2. `companyId` efetivo é derivado/validado no servidor e não aceito como autoridade do browser;
3. um DRIVER só lê e atualiza Delivery com atribuição ativa a ele;
4. CUSTOMER e DRIVER nunca recebem custo, margem ou fornecedor interno;
5. conhecer um ID ou receber uma notificação não concede acesso;
6. toda mutação crítica valida papel, escopo e ownership no momento da operação.
7. sessão/cookie/JWT são insumos de autenticação, não Profile, Membership nem autorização suficiente; somente AuthenticatedActorContext validado entra no caso de uso.

### Catálogo e preço

8. somente SKU ativo/publicável pode entrar em novo pedido;
9. Product não armazena saldo de estoque;
10. o preço definitivo é resolvido no servidor e capturado no OrderItem;
11. alteração posterior de catálogo/preço não muda pedido confirmado;
12. totais do pedido são derivados de seus itens e Money compatível, nunca confiados ao cliente; Quantity é inteira na unidade comercial do SKU e Money usa unidade mínima;
13. para cada `Company + SKU + instante` existe no máximo um Price aplicável; Establishment, segmento e volume não alteram a resolução no MVP.

### Carrinho e pedido

14. Cart e Order pertencem a exatamente uma Company imutável; existe no máximo um Cart `ACTIVE` compartilhado por `Company + Establishment`, acessível somente por Membership autorizada;
15. Cart não reserva estoque e sua disponibilidade é informativa;
16. Order confirmado possui ao menos um item, destino válido, preço capturado e reservas suficientes;
17. um Cart é convertido em no máximo um Order, e repetir a mesma conversão idempotente retorna esse Order sem duplicação;
18. mutação concorrente de Cart compartilhado com versão obsoleta é rejeitada e exige recarga/reaplicação consciente, nunca sobrescrita silenciosamente;
19. transições fora da máquina escolhida após as decisões são rejeitadas;
20. toda transição de Order gera histórico com ator e instante;
21. número legível é server-generated, não autoriza acesso e tolera lacunas; formato/escopo seguem DH-19;
22. repetição do mesmo comando idempotente não duplica pedido, reserva, movimento ou transição; reuso da chave com payload diferente é conflito.

### Estoque

23. cada alteração de `onHand` ou `reserved` gera InventoryMovement imutável com deltas canônicos;
24. `available` é derivado e nunca atualizado isoladamente;
25. salvo aprovação expressa, `onHand >= 0`, `reserved >= 0` e `reserved <= onHand`;
26. para cada Location + SKU, `reserved = Σ Quantity` das reservas `ACTIVE`, na mesma unidade;
27. reserva ativa nunca excede o disponível observado dentro da mesma operação atômica;
28. confirmação de pedido + reservas + movimentos + históricos é tudo-ou-nada;
29. cancelamento + liberação + movimentos + históricos é tudo-ou-nada quando a transição for aprovada;
30. consumo de reserva/baixa + expedição/históricos correlatos é tudo-ou-nada no ponto escolhido em DH-04;
31. movimentos lançados não são editados/apagados; correções usam compensação auditável;

### Entrega, suporte e auditoria

32. Delivery sempre referencia Order existente e preserva o tenant derivado dele;
33. somente atribuição de DRIVER ativa no instante da operação expõe contato/endereço e permite comandos;
34. histórico de atribuição não é apagado quando o motorista muda;
35. Delivery é autoridade da conclusão logística; Order só reflete `DeliveryCompleted` uma vez, de modo idempotente;
36. Delivery e Order não podem avançar para estados incompatíveis;
37. conclusão de entrega exige dados mínimos e prova quando a modalidade aprovada exigir;
38. toda mudança de Delivery gera histórico;
39. SupportTicket do cliente pertence a sua Company, permite transferência humana e toda mudança de estado gera SupportStatusHistory;
40. mensagens internas de suporte não são expostas ao CUSTOMER;
41. Notification sempre possui recipient explícito e tenant quando referencia recurso tenant-owned;
42. ações críticas de preço, estoque, pedido, cancelamento, entrega, permissões e administração geram AuditLog;
43. históricos e auditoria não são silenciosamente sobrescritos;
44. todo filho tenant-owned deriva o tenant por caminho obrigatório e imutável até seu pai/Company para autorização e futura RLS.

## 12. Comandos de aplicação

Comandos expressam intenção, recebem IDs/dados externos validados e operam com `AuthenticatedActorContext`. Comandos críticos recebem envelope de idempotência e executam em Unit of Work quando cruzam agregados/módulos.

### Customers / Identity

- `CreateCompany`, `UpdateCompany`, `CreateEstablishment`, `UpdateEstablishment`, `AddAddress`, `UpdateAddress`;
- `AssignProfileToCompany`, `ChangeRole`, `ChangeAccessStatus` somente por autoridade definida em SECURITY-001.

### Catalog

- `CreateCategory`, `PublishCategory`, `CreateProduct`, `UpdateProduct`, `PublishProduct`;
- `AddVariant`, `ChangeVariantStatus`, `SetProductImage`, `PublishPrice`, `EndPriceValidity`.

### Cart / Orders

- `GetOrCreateActiveCart`, `AddCartItem`, `SetCartItemQuantity`, `RemoveCartItem`, `SelectDeliveryAddress`, `SelectRequestedWindow`;
- `SubmitOrder`/`ConfirmOrder`: revalidar contexto, preço e estoque; criar Order/OrderItems/snapshots; reservar; calcular totais; gravar histórico/auditoria atomicamente;
- `StartPicking`, `CompletePicking`, `MarkReadyForDispatch`, `DispatchOrder`, `ApplyDeliveryCompleted`, `ConfirmReceipt`; `ApplyDeliveryCompleted` é handler interno idempotente do fato da Delivery, não ação direta de usuário;
- `CancelOrder` somente após política aprovada e com liberação atômica quando aplicável.

### Inventory

- `RegisterInbound`, `RegisterOutbound`, `AdjustInventory`, `ReserveInventory`, `ReleaseReservation`, `ConsumeReservation`, `RegisterReturn`;
- todos exigem motivo/referência, autorização e movimento.

### Delivery

- `CreateDelivery`, `AssignDriver`, `StartDelivery`, `CompleteStop`, `RecordOccurrence`, `AttachDeliveryProof`, `CompleteDelivery`, `MarkAttemptFailed`.

### Support / Notification

- `OpenSupportTicket`, `AssignTicket`, `PostSupportMessage`, `WaitForCustomer`, `ResolveTicket`, `CloseTicket`, `EscalateToHuman`;
- `CreateNotification`, `MarkNotificationRead` como efeitos controlados de eventos/casos de uso.

### 12.1 Envelope de comando e idempotência persistente

Para operações críticas, o contrato inclui `AuthenticatedActorContext`, `commandName`, `idempotencyKey`, `payloadHash`, `correlationId` e payload validado. O registro persistente de idempotência precisa distinguir ao menos tenant/escopo, ator quando relevante e nome do comando, guardar hash, estado/resultado seguro e timestamps.

- mesma chave + mesmo escopo/comando/hash retorna o resultado anterior sem repetir efeitos;
- mesma chave + mesmo escopo/comando + hash diferente retorna conflito;
- processamento concorrente da mesma chave possui um único vencedor;
- registros concluídos ou falhos de idempotência são retidos por 90 dias; possibilidade de reuso após esse prazo e granularidade exata continuam em DH-18;
- a chave não substitui constraints/invariantes do domínio.

### 12.2 Ports mínimos orientados a casos de uso

São contratos comportamentais, não CRUD genérico. Nomes são conceituais e podem ser refinados pela arquitetura sem alterar responsabilidades.

| Port | Operações mínimas esperadas |
| --- | --- |
| `ActorContextProvider` | `requireAuthenticatedActor()`, produzindo contexto validado server-side |
| `AuthorizationPort` | `requirePermission(actor, action, resourceScope)` para decisões que não cabem no agregado |
| `CompanyAccessPort` | validar Company/Establishment/Address e produzir snapshot/tenant autorizado |
| `CatalogReadPort` | buscar SKU publicável e snapshots necessários por IDs opacos |
| `PriceResolutionPort` | resolver exatamente um preço aplicável por `Company + SKU + instante`; não considerar Establishment/segmento/volume no MVP |
| `CartRepository` | `findActive(companyId, establishmentId)`, `load(cartId, actorScope)`, `save(cart, expectedVersion)` e localizar conversão anterior; acesso exige Membership autorizada |
| `OrderRepository` | `loadForTransition(orderId, scope)`, `save(order, expectedVersion)`, consultar por Cart/idempotência |
| `InventoryReservationPort` | validar/reservar, liberar e consumir conjunto de linhas com resultado atômico e deltas conciliáveis |
| `InventoryQueryPort` | obter posição/Availability autorizada sem expor Balance a CUSTOMER |
| `FulfillmentRepository` | carregar/salvar Picking para transição com versão |
| `DeliveryRepository` | carregar Delivery atribuída/para operação e salvar transição com histórico/versão |
| `SupportRepository` | carregar Ticket autorizado e salvar mensagem/transição com histórico |
| `NotificationPort` | criar para recipient/tenant explícitos e marcar leitura autorizada |
| `AuditPort` | anexar ação crítica com contexto/correlação, sem payload sensível integral |
| `IdempotencyStore` | iniciar/obter/concluir/falhar processamento pelo escopo definido em DH-18 |
| `OrderNumberGenerator` | produzir número legível server-side segundo DH-19, sem função de autorização |
| `UnitOfWork` | executar confirmação+reserva, cancelamento+liberação e expedição+consumo como unidade atômica |

Repositórios não expõem `list/create/update/delete` irrestritos. Application services orquestram ports; entidades não conhecem ports nem transações.

## 13. Consultas e projeções

Consultas não expõem registros brutos, recebem AuthenticatedActorContext e sempre aplicam autorização:

- `GetCurrentProfileContext`;
- `SearchCatalog(query, categories, brand, availability, price, deliveryEstimate, page)`;
- `GetProductDetails(productId)` com SKUs, imagens, preço aplicável e Availability permitida;
- `GetActiveCart` e `GetOrderReview`, deixando claro que preço/estoque serão revalidados;
- `ListCompanyOrders` e `GetCompanyOrderDetail` com histórico simplificado;
- `ListOperationalOrders` com filtros e campos internos conforme permissão;
- `GetInventoryPosition` e `ListInventoryMovements` apenas para operação autorizada;
- `GetAssignedDeliveries(driverId derivado do ator)` e `GetDeliveryExecutionContext` com dados mínimos e atribuição vigente;
- `GetCompanyDeliveryTracking` sem dados de outros clientes/rota completa indevida;
- `ListSupportTickets`, `GetSupportTicketConversation` com filtro de visibilidade;
- `ListNotifications` e `GetAuditTrail` conforme escopo.

Dashboard, métricas, alertas, “comprados com frequência” e recomendações são read models. Não são agregados nem fontes autoritativas de pedido ou estoque.

## 14. Eventos de domínio e históricos

Eventos são fatos para coordenação interna, notificações, projeções e auditoria; não implicam broker nem event sourcing.

- `CompanyCreated`, `EstablishmentCreated`;
- `ProductPublished`, `VariantStatusChanged`, `PricePublished`, `PriceChanged`;
- `CartConvertedToOrder`;
- `OrderSubmissionFailed`, `OrderConfirmed`, `OrderStatusChanged` e `OrderCancelled` quando autorizado;
- `InventoryMoved`, `InventoryReserved`, `ReservationReleased`, `ReservationConsumed`;
- `PickingStarted`, `PickingCompleted`, `PickingDivergenceDetected`, `OrderDispatched`;
- `DeliveryCreated`, `DriverAssigned`, `DriverUnassigned`, `DeliveryStarted`, `DeliveryOccurrenceRecorded`, `DeliveryCompleted`, `DeliveryAttemptFailed`;
- `ReceiptConfirmed`;
- `SupportTicketOpened`, `SupportTicketAssigned`, `SupportMessagePosted`, `SupportEscalatedToHuman`, `SupportTicketResolved`;
- `NotificationCreated`, `NotificationRead`.

Requisitos comuns: identidade/correlação, tipo, agregado e ID, instante, ator/contexto e payload mínimo versionável. Dados sensíveis não devem ser copiados desnecessariamente. O consumo de `DeliveryCompleted` por Orders registra o `eventId`/correlação processado para impedir avanço duplicado.

## 15. Fluxo prioritário ponta a ponta

1. **Autorização:** o servidor valida a sessão e resolve AuthenticatedActorContext a partir de Profile/membership duráveis; rejeita identidade, papel ou tenant inválido.
2. **Catálogo:** CUSTOMER pesquisa Category/Product e recebe SKUs publicáveis, imagens, preço aplicável e Availability informativa.
3. **Carrinho:** CUSTOMER adiciona SKU e Quantity ao Cart de sua Company. Nenhuma reserva ocorre.
4. **Revisão:** sistema apresenta itens, último preço conhecido, destino, janela solicitada e total estimado. Divergências são possíveis até confirmar.
5. **Submissão:** comando idempotente recebe o Cart compartilhado de `Company + Establishment`, sua versão esperada, destino e preferências; exige Membership autorizada e não aceita preço/total/company como autoridade. Conversão repetida retorna o mesmo Order; o envelope segue DH-18 e tem retenção de 90 dias.
6. **Validação comercial:** servidor verifica Company/Establishment/Address, SKU ativo e Quantity; resolve o único preço vigente por `Company + SKU` e prepara seu snapshot, sem considerar Establishment, segmento ou volume.
7. **Validação de estoque:** Inventory verifica disponibilidade autoritativa por SKU/local dentro da fronteira concorrente.
8. **Reserva e confirmação atômicas:** cria diretamente Order `CONFIRMED`/itens/snapshots, reservas, movimentos e histórico. Qualquer falha desfaz os efeitos conjuntos e retorna divergência sem Order comercial; não há pedido parcial ou substituição.
9. **Separação:** operador autorizado inicia Picking. O sistema mantém vínculo entre quantidade esperada, separada e reservas; divergências não avançam silenciosamente.
10. **Pronto para expedição:** separação válida conclui e Order muda para `READY_FOR_DISPATCH`.
11. **Expedição:** exatamente uma Delivery é criada/atribuída; reservas são consumidas e estoque baixado na expedição; Order muda atomicamente para `DISPATCHED`.
12. **Entrega:** DRIVER com atribuição vigente vê apenas sua Delivery, registra ocorrência e nome do recebedor e conclui. Delivery vai a `DELIVERED` e emite `DeliveryCompleted`; a aplicação atualiza Order idempotentemente, sem comando paralelo do usuário.
13. **Confirmação:** recebimento é confirmado por mecanismo aprovado e Order chega a `RECEIPT_CONFIRMED`.
14. **Comunicação e histórico:** eventos produzem notificações autorizadas; históricos e auditoria preservam todas as mudanças críticas.
15. **Atendimento:** cliente pode abrir ticket a partir de Order/Delivery e obter atendimento humano sem revelar dados de outro tenant.

Falhas esperadas devem ser explícitas: preço alterado, SKU inativo, estoque insuficiente, disputa concorrente, destino inválido, transição obsoleta, entrega não atribuída e comando duplicado.

## 16. User stories e critérios de aceite de alto nível

### Catálogo e compra

**Como CUSTOMER**, quero localizar um SKU comprável e montar um pedido para meu estabelecimento.

- catálogo retorna somente itens publicáveis e dados comerciais permitidos;
- a quantidade selecionada fica no Cart e não altera Inventory;
- revisão diferencia preço/Availability estimados da confirmação;
- ao confirmar, preço e estoque são revalidados no servidor;
- OrderItem preserva o preço capturado e o SKU correto.

### Consistência de pedido e estoque

**Como INTERNAL_OPERATOR**, quero que pedidos confirmados tenham estoque reservado para separar sem promessas inconsistentes.

- confirmação concorrente não reserva a mesma unidade duas vezes;
- falha em qualquer item não cria Order comercial nem deixa reserva órfã; o cliente revisa o Cart inteiro;
- toda reserva, liberação, consumo e ajuste gera movimento;
- totais e saldos negativos indevidos são rejeitados;
- comandos repetidos não duplicam efeitos.

### Operação e entrega

**Como INTERNAL_OPERATOR**, quero conduzir o pedido pelas etapas permitidas e atribuir a entrega.

- somente transições válidas aparecem e, sobretudo, são aceitas no servidor;
- separação incompleta/divergente não vira “pronto” silenciosamente;
- expedição coordena baixa/consumo de reserva e estados atomicamente;
- históricos identificam ator, instante e motivo.

**Como DRIVER**, quero executar somente minhas entregas com os dados necessários.

- entrega não atribuída retorna acesso negado mesmo com ID válido;
- custos, margens, fornecedor e dados de outras entregas não são retornados;
- estados inválidos são rejeitados;
- ocorrência e comprovante ficam vinculados à entrega e auditados.
- mudança de motorista preserva histórico e invalida acesso do anterior após o fim da atribuição;

**Como CUSTOMER**, quero acompanhar meu pedido e confirmar o recebimento.

- narrativa simples deriva de estados canônicos;
- só pedidos/entregas da própria Company são visíveis;
- previsão é identificada como estimativa ou compromisso conforme regra aprovada;
- confirmação final não pode ser aplicada duas vezes nem a pedido não entregue.

### Atendimento

**Como CUSTOMER**, quero pedir ajuda sobre pedido/entrega e alcançar uma pessoa.

- Ticket herda o tenant do contexto, não do browser;
- referência a Order/Delivery é validada contra a Company;
- mensagens internas não vazam ao cliente;
- existe comando e estado que permitem atribuição/escalonamento humano.

## 17. Segurança e auditoria por fronteira

| Fronteira | Controle de domínio/aplicação obrigatório |
| --- | --- |
| Company/Customer | tenant derivado; validação de vínculo do Profile; proteção contra IDOR |
| Catalog | CUSTOMER recebe apenas campos publicados; custo/margem/fornecedor permanecem internos |
| Cart/Order | ownership imutável; preço/total/company ignorados como autoridade; idempotência |
| Inventory | sem acesso direto de CUSTOMER; mutações autorizadas, históricas e atômicas |
| Delivery | acesso de CUSTOMER por tenant e de DRIVER por atribuição; minimização de contato/endereço |
| Support | tenant e visibilidade por mensagem; referência relacionada validada |
| Notification | destinatário autorizado; link não burla autorização do recurso |
| Audit | append-only, consulta privilegiada, sem secrets e com contexto suficiente para investigação |

Policies RLS, grants, sessão, armazenamento e matriz detalhada de permissões são responsabilidade de SECURITY-001/DATA-001; este documento define as invariantes que elas não podem violar. Filhos tenant-owned derivam ownership pelo pai por relações obrigatórias e imutáveis, sem confiar em tenant informado pelo browser.

## 18. Fora do MVP

- aplicativo mobile nativo;
- rastreamento GPS contínuo/quase em tempo real, ETA dinâmico e retenção de localização;
- otimização automática de rotas/frota;
- IA/ML, previsão autônoma ou recomendação que exceda regras simples/recorrência aprovada;
- microsserviços, event sourcing, broker/Kafka e arquitetura distribuída;
- marketplace complexo, múltiplos vendedores por item, split financeiro e motor de comissões;
- faturamento fiscal, pagamento, crédito/cobrança e integração contábil, salvo novo requisito;
- pedidos parciais, backorder, substituição automática, múltiplas entregas por pedido e devolução complexa;
- WMS avançado: ondas, lotes, validade, serial, FEFO/FIFO, endereçamento e inventário cíclico;
- precificação/promotions avançadas, cupons, negociação e regras dinâmicas sem aprovação;
- SLA automático, chatbot autônomo e automação que impeça atendimento humano;
- analytics avançado; apenas indicadores operacionais mínimos como projeções;
- edição retroativa/destrutiva de históricos e movimentos;
- schema SQL, migrations, RLS policies, infraestrutura ou refatoração do frontend nesta tarefa.

Favoritos, recomendações simples, alertas de estoque do cliente e previsão de demanda somente entram quando seus dados, ownership e regras forem explicitamente priorizados; não bloqueiam o fluxo crítico.

## 19. Decisões Humanas

Todas as decisões DH-01 a DH-20 estão marcadas como **APPROVED** e são regras normativas deste modelo. `Bloqueia DATA-001` permanece apenas como rastreabilidade histórica nas entradas; o gate final abaixo libera DATA-001.

### DH-01 — Escopo do preço e precedência

**STATUS:** APPROVED — exceção ao pacote A.  
**DECISION:** Preço varia por Company. Company é dimensão obrigatória; a precedência/unicidade lógica é `Company + SKU + instante`. Establishment, segmento e volume não participam salvo nova decisão. OrderItem preserva o PriceSnapshot.  

**QUESTION:** Um preço é global por SKU ou pode variar por empresa, estabelecimento, segmento, volume ou condição comercial?  
**CONTEXT:** O código mostra um único preço por produto, mas o modelo B2B menciona condições comerciais e preço por unidade/volume. A escolha altera chaves, vigência, unicidade e resolução do preço.  
**OPTION A:** Preço único vigente por SKU para todos os clientes no MVP.  
**OPTION B:** Tabela/contexto de preço por cliente/segmento/volume com regra explícita de precedência.  
**IMPACT:** Company é dimensão obrigatória. A unicidade lógica e a resolução são por `Company + SKU + instante`, sem vigências sobrepostas. O OrderItem captura PriceSnapshot imutável. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Decisão registrada: preço varia por Company; Establishment, segmento e volume ficam fora da resolução até nova decisão humana.

### DH-02 — Momento da reserva e existência de pedido rejeitado

**STATUS:** APPROVED — OPTION A.  
**DECISION:** O Order comercial só é criado como `CONFIRMED` junto com itens, snapshots, reservas, movimentos e históricos na mesma operação atômica. Falhas de preço/estoque/endereço retornam divergência e não criam Order comercial; tentativa técnica pode ser auditada.

**QUESTION:** O pedido só passa a existir após validação/reserva bem-sucedidas ou deve persistir uma tentativa `AWAITING_VALIDATION`/`VALIDATION_FAILED`?  
**CONTEXT:** O fluxo aprovado coloca pedido antes das validações, enquanto a regra exige confirmação + reserva atômicas.  
**OPTION A:** Criar Order confirmado e reservas na mesma transação; falhas não criam Order comercial, apenas tentativa/auditoria técnica.  
**OPTION B:** Persistir Order pendente antes da validação e registrar falha de negócio no histórico.  
**IMPACT:** Define criação direta em `CONFIRMED`, sem estados pendentes no Order. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-03 — Local de estoque e rateio

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Todo Order usa um InventoryLocation previamente determinado server-side; não há rateio de um item/pedido entre locais no MVP.

**QUESTION:** De qual InventoryLocation um pedido reserva e pode um item ser atendido por mais de um local?  
**CONTEXT:** Há conceito de local, mas nenhuma regra de seleção, prioridade ou rateio.  
**OPTION A:** Um local de estoque previamente determinado para todo o pedido; sem rateio.  
**OPTION B:** Seleção automática/manual e reservas divididas entre locais.  
**IMPACT:** Cada reserva referencia um único InventoryLocation resolvido server-side. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-04 — Momento da baixa física

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Na expedição, a reserva é consumida e `onHand` é reduzido atomicamente; até esse momento a quantidade permanece reservada.

**QUESTION:** A reserva é consumida e `onHand` baixado ao concluir separação, ao expedir ou ao entregar?  
**CONTEXT:** O prompt exige definir quando reservar e baixar; sem isso, saldos e cancelamentos ficam ambíguos.  
**OPTION A:** Consumir reserva e baixar estoque na expedição.  
**OPTION B:** Baixar na conclusão da separação ou na entrega.  
**IMPACT:** Fixa `consumo com baixa = onHandDelta -q + reservedDelta -q` na expedição. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-05 — Expiração de reserva

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Não existe expiração automática de reservas no MVP. Liberação ocorre somente por cancelamento autorizado ou falha operacional registrada, com movimento compensatório.

**QUESTION:** Reservas de pedidos confirmados expiram automaticamente? Qual prazo e quais estados impedem expiração?  
**CONTEXT:** O prompt solicita prazo e devolução, mas não informa regra comercial.  
**OPTION A:** Não expirar automaticamente no MVP; somente liberar por cancelamento/falha operacional autorizada.  
**OPTION B:** Expirar após prazo configurado, com job, notificação e transição coordenada do Order.  
**IMPACT:** Reservation não possui `EXPIRED` nem job de expiração no MVP. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-06 — Cancelamento

**STATUS:** APPROVED — OPTION A.  
**DECISION:** CUSTOMER pode cancelar somente antes de `PICKING`; INTERNAL_OPERATOR pode cancelar até `READY_FOR_DISPATCH`, sempre com motivo. Após expedição, não há cancelamento de Order; eventuais problemas seguem ocorrência/devolução futura.

**QUESTION:** Quem pode cancelar, até qual estado, com quais motivos e o que ocorre após separação/expedição?  
**CONTEXT:** Cancelamento exige liberação/compensação atômica, mas a política comercial não existe.  
**OPTION A:** CUSTOMER cancela somente antes de `PICKING`; operador pode cancelar até `READY_FOR_DISPATCH` com motivo; após expedição vira ocorrência/devolução.  
**OPTION B:** Política mais ampla, incluindo cancelamento em rota.  
**IMPACT:** Define janelas de transição e liberação atômica de reservas. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-07 — Atendimento parcial, substituição e ruptura

**STATUS:** APPROVED — OPTION A.  
**DECISION:** O MVP é tudo-ou-nada: falha de qualquer item impede a confirmação ou conclusão da separação; não há pedido parcial nem substituição automática. O cliente revisa o Cart.

**QUESTION:** Se um item falhar na validação ou separação, o pedido inteiro falha, pode ser parcialmente confirmado ou pode receber substituição?  
**CONTEXT:** A tela mockada sugere substituição, mas não existe autorização, equivalência, preço ou aceite do cliente.  
**OPTION A:** Tudo-ou-nada no MVP; informar divergências e exigir revisão do carrinho.  
**OPTION B:** Permitir parcial/substituição com consentimento, recálculo e novos estados.  
**IMPACT:** Não há estados, linhas substitutas ou quantidades parciais no MVP. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-08 — Janela de entrega

**STATUS:** APPROVED — OPTION A.  
**DECISION:** O pedido captura uma janela solicitada/estimada; a operação registra separadamente a janela confirmada. A estimativa não é promessa até confirmação operacional.

**QUESTION:** A janela escolhida no checkout é estimativa, solicitação ou compromisso confirmado? Quando ela pode mudar?  
**CONTEXT:** A UI afirma “hoje até 18h” e simultaneamente “sujeito à confirmação após separação”.  
**OPTION A:** Janela solicitada/estimada no pedido e janela confirmada separadamente pela operação.  
**OPTION B:** Janela já comprometida na confirmação do pedido.  
**IMPACT:** Order e Delivery distinguem janela solicitada/estimada de janela confirmada. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-09 — Confirmação de recebimento e prova

**STATUS:** APPROVED — OPTION A.  
**DECISION:** DRIVER registra a entrega com nome do recebedor; CUSTOMER pode confirmar depois. Foto, assinatura e código não são obrigatórios no MVP.

**QUESTION:** Quem confirma recebimento e qual prova é obrigatória: cliente autenticado, nome/código do recebedor, foto ou assinatura?  
**CONTEXT:** O fluxo termina com confirmação, e o guia lista alternativas “quando aplicável”.  
**OPTION A:** DRIVER registra entrega com nome do recebedor; CUSTOMER pode confirmar depois.  
**OPTION B:** Exigir código, assinatura ou foto para concluir a entrega.  
**IMPACT:** Nome do recebedor é o dado mínimo; Proof binário é opcional e não bloqueia `DELIVERED`. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-10 — Uma ou múltiplas entregas por pedido

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Cada Order atendido possui exatamente uma Delivery no MVP; entregas parciais/múltiplas estão fora do escopo.

**QUESTION:** Um pedido pode ser dividido em múltiplas entregas no MVP?  
**CONTEXT:** Não há requisito de entrega parcial; habilitá-la altera estados e cardinalidades.  
**OPTION A:** Exatamente uma entrega por pedido atendido.  
**OPTION B:** Uma ou mais entregas/parciais por pedido.  
**IMPACT:** Order–Delivery é 1:1 no MVP. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-11 — Papéis, memberships e usuários internos

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Profile possui papel global; CUSTOMER vincula-se a uma única Company e alterna apenas seus Establishments. Usuários internos têm escopo platform explícito sem `companyId`; Membership autoriza o vínculo CUSTOMER e o acesso ao Establishment.

**QUESTION:** Onde o papel é atribuído, uma identidade pode acumular papéis/Companies e como usuários internos sem tenant são representados?  
**CONTEXT:** O guia mostra seletor de estabelecimento; há quatro perfis, mas não define se role é global ou por vínculo, múltiplas empresas, acúmulo de papéis nem escopo de INTERNAL_OPERATOR/DRIVER/PLATFORM_ADMIN.  
**OPTION A:** Um Profile possui um papel global; CUSTOMER liga-se a uma Company e alterna apenas estabelecimentos dela; internos têm escopo platform explícito sem `companyId`.  
**OPTION B:** Papéis e escopos residem em Memberships; uma identidade pode acumular vínculos/papéis em Companies ou no escopo platform, com seleção server-side do contexto ativo.  
**IMPACT:** Profile possui um papel global e no máximo um vínculo CUSTOMER ativo de Company; Membership não acumula Companies/papéis no MVP. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-12 — Estoque exibido ao cliente

**STATUS:** APPROVED — OPTION A.  
**DECISION:** CUSTOMER vê somente Availability categórica (`Disponível`, `Baixo estoque`, `Indisponível`); quantidade exata e Balance nunca são expostos. A confirmação sempre revalida o saldo.

**QUESTION:** CUSTOMER vê apenas rótulos (`Disponível`, `Baixo estoque`, `Indisponível`) ou quantidade disponível exata?  
**CONTEXT:** Os mocks usam rótulos, enquanto o saldo autoritativo é interno e pode revelar capacidade operacional.  
**OPTION A:** Exibir somente Availability categórica e revalidar na confirmação.  
**OPTION B:** Exibir quantidade exata reservável.  
**IMPACT:** O contrato público retorna categoria de disponibilidade, não quantidade. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-13 — Quantidade, unidade faturável e arredondamento

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Quantity é inteira na unidade comercial do SKU; carrinho, pedido e estoque usam a mesma unidade. Money usa unidade mínima e subtotal é multiplicação exata, sem rateio fracionário.

**QUESTION:** O MVP vende/controla somente números inteiros por unidade comercial (fardo, caixa, galão) ou aceita quantidades fracionárias/conversões entre unidade comercial e unidade de estoque? Qual arredondamento monetário vale?  
**CONTEXT:** Os mocks usam quantidades inteiras e preço por embalagem, mas o requisito não define escala, conversão ou arredondamento; sem isso subtotal e saldo não são calculáveis de forma única.  
**OPTION A:** Quantity inteira na unidade comercial do SKU; a mesma unidade controla carrinho, pedido e estoque; Money em unidade mínima e subtotal exato sem rateio fracionário.  
**OPTION B:** Quantidade decimal e/ou unidades distintas, exigindo escala, fatores de conversão, unidade faturável e regra de arredondamento por linha/total.  
**IMPACT:** Quantity, reservas, movimentos e subtotais são inteiros na unidade comercial do SKU. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-14 — Categoria, produto e hierarquia

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Cada Product pertence a uma Category; não há N:N nem hierarquia de categorias no MVP.

**QUESTION:** Um Product pertence a uma única Category ou a várias, e Category possui hierarquia no MVP?  
**CONTEXT:** A UI exibe chips, mas não há regra de classificação; `N:N ou hierarquia` não pode ser tratado como cardinalidade canônica.  
**OPTION A:** Uma Category por Product, sem hierarquia no MVP.  
**OPTION B:** N:N e/ou árvore de categorias, com regras de ciclo, profundidade e categoria principal.  
**IMPACT:** A relação Category–Product é simples e sem árvore. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-15 — Semântica de Delivery, Route e Stop

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Delivery representa a execução de um único Order/destino; não existe Route ou DeliveryStop obrigatório no MVP. O destino e instruções ficam na Delivery.

**QUESTION:** No MVP, Delivery representa a execução de um único pedido/destino ou existe Route que agrupa múltiplas Deliveries/Stops?  
**CONTEXT:** O documento usava Stop e sequência sem definir rota, embora otimização de rota esteja fora do MVP.  
**OPTION A:** Uma Delivery por Order/destino, sem Route e sem entidade Stop obrigatória; dados do destino ficam na Delivery.  
**OPTION B:** Route agrupa Stops, cada Stop referencia uma Delivery/Order, com sequência e estados coordenados explicitamente.  
**IMPACT:** Order–Delivery é 1:1 e o destino é direto na Delivery. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-16 — Ownership de Address

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Address operacional pertence ao Establishment; Company é derivada pela relação obrigatória. Endereço cadastral direto de Company fica fora do MVP.

**QUESTION:** Address pertence à Company, ao Establishment ou existem tipos distintos para endereço cadastral e endereço operacional?  
**CONTEXT:** Um vínculo ambíguo impede ownership/RLS consistente e validação de destino.  
**OPTION A:** Address pertence ao Establishment, cuja Company é derivável; dados cadastrais da Company são separados se necessários.  
**OPTION B:** Address pertence diretamente à Company e pode ser associado a Establishments por regra explícita.  
**IMPACT:** Address–Establishment é ownership único e o tenant é derivado. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-17 — Ownership e unicidade do carrinho ativo

**STATUS:** APPROVED — exceção ao pacote A.  
**DECISION:** Existe um único Cart `ACTIVE` por `Company + Establishment`, compartilhado por Profiles com Membership autorizada, com versão otimista e conversão idempotente.  

**QUESTION:** Existe um Cart `ACTIVE` por Profile, por Company, por Establishment ou múltiplos carrinhos nomeados?  
**CONTEXT:** Há risco de duas abas/usuários alterarem o mesmo carrinho e nenhuma regra atual define owner funcional ou chave de unicidade.  
**OPTION A:** Um Cart ativo por `Company + Establishment + createdByProfile`, com concorrência por versão.  
**OPTION B:** Carrinho compartilhado por Company/Establishment ou múltiplos carrinhos, exigindo colaboração, ownership e seleção explícitos.  
**IMPACT:** A chave lógica ativa é `Company + Establishment`; Profiles com Membership autorizada compartilham o Cart. Controle otimista de versão evita sobrescrita silenciosa e conversão idempotente impede pedidos duplicados. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Decisão registrada: adotar carrinho compartilhado por Establishment, sem carrinhos privados ou múltiplos carrinhos ativos no mesmo escopo.

### DH-18 — Escopo e reuso da idempotência

**STATUS:** APPROVED — OPTION A.  
**DECISION:** O registro usa escopo `tenant/plataforma + actor + commandName + key`, guarda payload hash e resultado seguro e é retido por 90 dias; após esse prazo, reuso depende de nova operação/regras de limpeza.

**QUESTION:** Qual é o escopo exato por tenant/ator/comando e chaves podem ser reutilizadas após a retenção aprovada de 90 dias?  
**CONTEXT:** A retenção é de 90 dias. Ainda é necessário fechar reuso após expiração e exceções de escopo; uma chave solta não impede duplicação persistentemente.  
**OPTION A:** Escopo `tenant/plataforma + actor + commandName + key`, com retenção aprovada de 90 dias.  
**OPTION B:** Escopo por tenant + comando sem ator, com retenção distinta por caso de uso.  
**IMPACT:** Define escopo e retenção do registro persistente de idempotência. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-19 — Número legível do pedido

**STATUS:** APPROVED — OPTION A.  
**DECISION:** O número legível é uma sequência global server-side com prefixo de apresentação; lacunas são permitidas e o número não participa da autorização.

**QUESTION:** Qual formato e escopo de unicidade do número exibido (`PED-1049`): global, por Company, por ano ou outro?  
**CONTEXT:** O ID técnico não deve ser exposto como regra comercial, e concorrência/rollback podem produzir lacunas.  
**OPTION A:** Sequência server-side global com prefixo de apresentação e lacunas permitidas.  
**OPTION B:** Numeração por Company/período, exigindo escopo composto e regra de rollover.  
**IMPACT:** A unicidade do número é global e a geração tolera lacunas. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

### DH-20 — Caminho de ownership para RLS em filhos

**STATUS:** APPROVED — OPTION A.  
**DECISION:** Ownership de filhos tenant-owned é sempre derivado pelo pai por relações obrigatórias e imutáveis; não há `companyId` materializado como autoridade do filho.

**QUESTION:** Para cada filho tenant-owned, qual cadeia obrigatória e imutável até o pai/Company será usada na autorização e futura RLS?  
**CONTEXT:** Ownership derivado pelo pai está fixado. OrderItem, históricos, mensagens, proofs e notificações ainda precisam ter seu caminho parental explicitado sem confiar no browser.  
**OPTION A:** Derivação direta pelo agregado pai sempre que o relacionamento já identificar a Company.  
**OPTION B:** Derivação por uma cadeia intermediária de pais imutáveis quando o filho não se relacionar diretamente ao agregado tenant-owned.  
**IMPACT:** O desenho físico deve preservar a cadeia parental e testar cross-tenant; não há alternativa de ownership materializado. **Bloqueia DATA-001: NÃO — decisão aprovada.**  
**RECOMMENDATION:** Mantida OPTION A.

## 20. Checklist de consistência e rastreabilidade

### Rastreabilidade com AUDIT-001

- [x] separa view models locais de entidades e DTOs reais;
- [x] conecta Cart persistível à revisão/Order, eliminando a lacuna conceitual entre `/catalogo` e `/pedido`;
- [x] substitui status de texto por estados normativos aprovados e projeções para o cliente;
- [x] define preço capturado, Money e snapshots em vez de `number`/string como autoridade;
- [x] modela Company/ownership, hoje ausentes;
- [x] modela Inventory/Movement/Reservation, hoje ausentes;
- [x] cobre Delivery, Support, Notification e Audit, hoje ausentes;
- [x] preserva os mocks até slices reais estarem testados;
- [x] mantém domínio/application isoláveis de React, Next.js e Supabase.

### Checklist de invariantes e transições

- [x] preço do item é capturado e histórico não usa preço corrente;
- [x] estoque não é campo de Product;
- [x] toda alteração de estoque produz movimento imutável;
- [x] confirmação/reserva, cancelamento/liberação e expedição/baixa têm atomicidade explícita;
- [x] saldo negativo é proibido por padrão;
- [x] tenant/role são derivados de contexto confiável;
- [x] CUSTOMER, DRIVER e acesso interno têm escopos mínimos explícitos;
- [x] IDOR e cross-tenant são invariantes negativas;
- [x] Order, Reservation, Delivery e Support têm estados/transições explícitos;
- [x] transições geram históricos e ações críticas geram auditoria;
- [x] fluxo prioritário possui caminho feliz, pré-condições e falhas;
- [x] decisões comerciais foram aprovadas e incorporadas sem condicionais residuais;
- [x] fora do MVP está explícito.

### Rastreabilidade dos pareceres APPROVE_WITH_CHANGES

1. [x] DH-02/DH-07 foram aprovadas: Order nasce confirmado atomicamente e divergência é tudo-ou-nada, sem parcial/substituição.
2. [x] ports comportamentais, AuthenticatedActorContext, idempotência persistente e Unit of Work foram definidos.
3. [x] context map direcional, IDs opacos e proibição de imports/dependências circulares foram explicitados.
4. [x] Delivery tornou-se autoridade logística; `RegisterDelivered` foi removido do comando público de Order e substituído por consumo idempotente de `DeliveryCompleted`.
5. [x] DH-15 foi aprovada: uma Delivery por Order/destino, sem Route/Stop obrigatório.
6. [x] DH-16 e DH-11 foram aprovadas: Address pertence ao Establishment; Profile tem papel global e vínculo CUSTOMER único.
7. [x] Notification agora exige recipient explícito e tenant quando referencia recurso tenant-owned.
8. [x] SupportStatusHistory append-only foi incluído.
9. [x] Profile/Membership duráveis foram separados de sessão/cookie/JWT e AuthenticatedActorContext foi definido.
10. [x] DH-17 foi aprovada: Cart ativo único por Company + Establishment, compartilhado por Membership autorizada, com versão otimista e conversão idempotente.
11. [x] DH-05 foi aprovada: não há expiração automática de reserva no MVP.
12. [x] DH-13 foi aprovada: Quantity inteira na unidade comercial e Money em unidade mínima.
13. [x] DH-11 foi aprovada: role global, uma Company CUSTOMER e internos platform sem tenant.
14. [x] DH-14 foi aprovada: um Product pertence a uma Category, sem hierarquia.
15. [x] InventoryMovement recebeu `onHandDelta`/`reservedDelta` canônicos e `reserved = Σ reservas ACTIVE` virou invariante.
16. [x] DH-18 foi aprovada: escopo tenant/plataforma + actor + commandName + key e retenção de 90 dias.
17. [x] DH-19 foi aprovada: número global server-side com lacunas permitidas.
18. [x] atribuição de DRIVER passou a ter vigência, histórico append-only e revogação de acesso.
19. [x] DH-20 foi aprovada: ownership de filhos derivado pelo pai por relações obrigatórias e imutáveis.
20. [x] inconsistências conceituais foram resolvidas em nível de domínio, sem schema, migration ou implementação.

## 21. Gate para DATA-001

**DOMAIN-001: APPROVED. DATA-001: LIBERADO.** Todas as decisões humanas DH-01 a DH-20 estão aprovadas e incorporadas às invariantes, estados, cardinalidades e contratos comportamentais deste documento. DATA-001 pode traduzir o modelo para PK/FK, constraints, índices, timestamps, histories, ownership derivado pelo pai, RLS inputs e política de exclusão.

O gate libera a modelagem de dados, não autoriza ainda migrations neste arquivo/tarefa; migrations continuam pertencendo à execução posterior de DATA-001.
