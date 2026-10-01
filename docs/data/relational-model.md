# ProStock — Modelo Relacional DATA-001

**Task:** DATA-001  
**Status:** APPROVED DOMAIN INPUTS  
**Escopo:** modelo lógico PostgreSQL/Supabase; nenhuma migration, policy SQL ou alteração de código nesta tarefa.

## 1. Decisões consolidadas

- Tenant comercial: `companies`; `company_id` nunca é autoridade do browser.
- `auth.users` é a identidade de autenticação. `profiles.role` é global; `CUSTOMER` pertence a exatamente uma Company. Usuários internos não pertencem a Company cliente.
- Memberships autorizam usuários CUSTOMER da Company e dão acesso ao carrinho compartilhado.
- Preço é temporal por `company_id + sku_id`; OrderItem captura o preço.
- Um Cart `ACTIVE` por `company + establishment`, compartilhado pelos memberships autorizados.
- Order nasce `CONFIRMED`, com preço, reserva, movimentos e históricos na mesma unidade atômica.
- Um InventoryLocation atende cada Order; não há rateio.
- Reservas não expiram. Cancelamento segue DH-06; atendimento é tudo-ou-nada.
- Baixa física e consumo de reserva ocorrem na expedição.
- Uma Delivery por Order; não há Route nem DeliveryStop no MVP.
- Quantity é inteira na unidade comercial do SKU.
- Category → Product é 1:N, sem hierarquia.
- Idempotência: retenção de 90 dias; escopo `tenant/platform + actor + command + key`.
- Número legível do pedido é global, server-side e pode conter lacunas.
- Ownership de filhos é derivado por relação obrigatória ao pai; não há `company_id` redundante em filhos tenant-owned.

## 2. Convenções

- Todas as PKs são UUID opacos (`uuid`), exceto `auth.users.id`, que é fornecido pelo Supabase Auth.
- Todos os nomes abaixo são lógicos; tipos SQL concretos e enums serão materializados em migration posterior.
- Timestamps são `timestamptz`: `created_at`, `updated_at`; históricos possuem `occurred_at`/`changed_at` imutável.
- Valores monetários são inteiros em unidade mínima (`amount_minor`) e `currency_code`; MVP usa uma moeda por Order.
- Quantidades são inteiras não negativas/positivas conforme a entidade; unidade comercial é atributo do SKU.
- Exclusão física é proibida para pedidos, movimentos, reservas, históricos, auditoria e provas referenciadas. Use status/inativação.

### 2.1 Contratos de integridade cross-company

As FKs lógicas abaixo devem ser compostas quando o filho carrega `company_id`: `(child_id, company_id)` referencia `(parent_id, company_id)`. Quando o parent é platform-owned e não carrega tenant, a coerência é uma constraint transacional obrigatória na mesma Unit of Work; nunca é inferida do payload.

- `profiles`: Unique `(id, company_id)` para permitir referências compostas de perfis CUSTOMER.
- `profiles`: essa UNIQUE composta é obrigatória mesmo com `id` como PK; permite validar Profile + Company em Membership, Cart, Order, Notification e IdempotencyRecord.
- `company_memberships`: `(profile_id, company_id)` referencia o mesmo par de `profiles`; membership ativo é pré-condição de operações CUSTOMER.
- `establishments`: Unique `(id, company_id)`; qualquer `company_id + establishment_id` deve referenciar esse par.
- `carts`: Unique `(id, company_id)`; `(establishment_id, company_id)` e `(created_by_profile_id, company_id)` referenciam os respectivos pares; membership compartilhado é validado transacionalmente.
- `orders`: Unique `(id, company_id)`, `(id, inventory_location_id)` e `(id, company_id, inventory_location_id)`; `(establishment_id, company_id)`, `(created_by_profile_id, company_id)` e `(cart_id, company_id)` referenciam os pais correspondentes.
- `support_tickets`: solicitante, Order e Delivery referenciados devem ser da mesma Company; para Delivery, a igualdade é derivada por `deliveries.order_id` para `orders.company_id` e validada transacionalmente.
- `deliveries`: `order_id` é FK única; a Company da Delivery é sempre a Company do Order, sem `company_id` duplicado.

## 3. Identidade, Company e endereços

### 3.1 `profiles`

| Coluna | Regra |
|---|---|
| `id` PK | FK 1:1 para `auth.users(id)`; não muda |
| `role` | `CUSTOMER`, `INTERNAL_OPERATOR`, `DRIVER`, `PLATFORM_ADMIN`; global |
| `company_id` nullable | obrigatório somente para `CUSTOMER`; nulo para perfis internos |
| `full_name`, `phone`, `status` | dados duráveis e estado de acesso |
| `created_at`, `updated_at` | obrigatórios |

Constraints: `CUSTOMER` exige `company_id`; roles internos exigem `company_id IS NULL`; role/status não são alteráveis por cliente.

Unique composta obrigatória `(id, company_id)`, além da PK `id`, para FKs lógicas tenant-aware.

### 3.2 `companies`

PK `id`; razão social, nome de exibição, CNPJ normalizado, inscrição estadual opcional, e-mail e telefone corporativos, endereço fiscal, contatos legal e operacional, condições de pagamento, limite de crédito, status e timestamps. Uma Company possui um ou mais Establishments ativos. Endereços operacionais/de entrega pertencem a Establishment, não a Company.

Status MVP: `PENDING_SETUP`, `ACTIVE`, `INACTIVE`, `BLOCKED`. Company sem estabelecimento ativo não pode executar checkout.

### 3.3 `company_memberships`

Membership autoriza um Profile CUSTOMER a operar a Company do seu Profile.

- PK `id`.
- FK `profile_id → profiles.id`, FK `company_id → companies.id`.
- Unique `(profile_id, company_id)`; `status`, `created_at`, `revoked_at`, `granted_by_profile_id`.
- Constraint lógica: membership CUSTOMER só pode apontar para `profiles.company_id` correspondente.
- Índices `(company_id, status)` e `(profile_id, status)`.
- Integridade: FK composta lógica `(profile_id, company_id)` para o par correspondente de `profiles`; `granted_by_profile_id` referencia `profiles.id` e concessores CUSTOMER devem usar a mesma Company.

### 3.4 `company_invitations`

Convite de onboarding de Customer: PK `id`; `company_id`, e-mail normalizado, `token_hash`, criador, expiração, aceite/revogação e timestamps. Estados `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`; apenas um convite pendente por Company + e-mail. O token bruto não é persistido nem exposto por consultas. Aceite atômico cria/ativa `Profile CUSTOMER` e `company_membership` somente quando o e-mail autenticado corresponde ao convite.

### 3.5 `establishments`

- PK `id`; FK `company_id → companies.id` obrigatória.
- `name`, `status`, timestamps.
- Unique `(company_id, name)` conforme normalização definida na aplicação.
- Índice `(company_id, status)`.
- Unique `(id, company_id)` para permitir FKs compostas dos filhos e impedir associação cross-company.

### 3.6 `addresses`

- PK `id`; FK `establishment_id → establishments.id` obrigatória.
- Endereço operacional, `label`, `is_default`, timestamps/status.
- Ownership da Company é derivado por `establishments.company_id`.
- No máximo um endereço default ativo por Establishment.
- Índice `(establishment_id, status)`.

Orders e Deliveries armazenam `address_snapshot` imutável; o cadastro posterior não reescreve histórico.

## 4. Catálogo

### 4.1 `categories`

PK `id`; nome, ordem, status/publicação, timestamps. Sem `parent_id` no MVP.

### 4.2 `products`

- PK `id`; FK `category_id → categories.id` obrigatória.
- Nome, marca, descrição, status/publicação, timestamps.
- Category 1:N Product; Product não contém preço, saldo ou quantidade de carrinho.
- Índice `(category_id, status)`.

### 4.3 `product_variants`

- PK `id`; FK `product_id → products.id`.
- `sku_code` único global, nome/atributos, `sale_unit`, status, timestamps.
- SKU inativo não entra em novo Cart/Order, mas permanece referenciável no histórico.
- Índices `(product_id, status)` e `(sku_code)`.

### 4.4 `product_images`

- PK `id`; FK para Product e/ou Variant conforme escopo da imagem, com exatamente um owner válido.
- `storage_object_path`, MIME/tamanho validados, alt text, sort order, `is_primary`, timestamps.
- Unique lógico para uma imagem primária por owner publicável.
- Colunas explícitas: `product_id` nullable FK para `products.id` e `variant_id` nullable FK para `product_variants.id`.
- Constraint XOR: exatamente um entre `product_id` e `variant_id` deve estar preenchido.
- Unicidade parcial separada: no máximo uma linha `is_primary = true` por `product_id` e no máximo uma por `variant_id`; imagens não primárias podem ser múltiplas.

### 4.5 `prices`

- PK `id`; FK `company_id → companies.id`, FK `sku_id → product_variants.id`.
- `amount_minor`, `currency_code`, validade `[valid_from, valid_until)`, status, origem/regra, timestamps.
- Preço aplicável é determinado por Company + SKU + instante; deve existir no máximo um intervalo aplicável.
- Recomenda-se constraint de exclusão de intervalos por `(company_id, sku_id)` e índice de consulta `(company_id, sku_id, valid_from, valid_until)`.
- Alterar/encerrar Price não altera OrderItem confirmado.

## 5. Carrinho

### 5.1 `carts`

- PK `id`; FK `company_id → companies.id`, FK `establishment_id → establishments.id`, FK `created_by_profile_id → profiles.id`.
- `status`: `ACTIVE` ou `CONVERTED`; `version` para concorrência otimista; timestamps.
- Unique parcial lógico: um Cart `ACTIVE` por `(company_id, establishment_id)`.
- Constraint relacional: Establishment e criador devem pertencer/estar associados à Company.
- Membership ativo é obrigatório para ler/mutar o Cart.
- FKs compostas: `(establishment_id, company_id)` para `establishments(id, company_id)` e `(created_by_profile_id, company_id)` para `profiles(id, company_id)`.
- Acesso compartilhado por Membership é uma constraint transacional: cada mutação deve validar Membership ACTIVE da mesma Company; não é permitido combinar Establishment, Profile e Cart de Companies diferentes.

### 5.2 `cart_items`

- PK `id`; FK `cart_id → carts.id`, FK `sku_id → product_variants.id`.
- Unique `(cart_id, sku_id)`; `quantity` inteiro positivo; último preço exibido é apenas informativo.
- Exclusão somente enquanto Cart ACTIVE; após conversão, preservar para rastreabilidade.

## 6. Pedidos

### 6.1 `orders`

- PK `id`; `order_number` global, server-side, único e imutável; FK `company_id → companies.id`, `establishment_id → establishments.id`, `created_by_profile_id → profiles.id`, `cart_id → carts.id`, `inventory_location_id → inventory_locations.id`.
- `status`: `CONFIRMED`, `PICKING`, `READY_FOR_DISPATCH`, `DISPATCHED`, `DELIVERED`, `RECEIPT_CONFIRMED`, `CANCELLED`.
- `requested_window`, `confirmed_window` quando aplicável; `address_snapshot`; currency e totais capturados; timestamps.
- Order nasce `CONFIRMED` somente na transação que cria itens, reservas, movimentos e histórico.
- `cart_id` unique para impedir conversão duplicada.
- Unique composta `(id, company_id)` para FKs lógicas tenant-aware.
- Unique composta `(id, inventory_location_id)` para as FKs de Reservation e InventoryMovement; a combinação `(id, company_id, inventory_location_id)` permanece disponível para referências tenant-aware.
- Um único `inventory_location_id` por Order; nenhuma reserva pode usar outro local.
- Índices `(company_id, created_at DESC)`, `(company_id, status, created_at DESC)`, `(order_number)` e `(inventory_location_id, status)`.
- FKs compostas: `(establishment_id, company_id)` para `establishments(id, company_id)`, `(created_by_profile_id, company_id)` para `profiles(id, company_id)` e `(cart_id, company_id)` para `carts(id, company_id)`.
- A transação de criação rejeita qualquer Cart/Establishment/Profile cujo tenant não seja o `orders.company_id`.

### 6.2 `order_items`

- PK `id`; FK `order_id → orders.id`, FK `sku_id → product_variants.id`.
- `quantity` inteiro positivo na unidade do SKU; snapshots de SKU/embalagem/unidade; preço unitário/currency capturados; subtotal.
- Unique `(order_id, sku_id)` no MVP.
- Unique lógico adicional `(id, order_id, sku_id)` para suportar FKs compostas das reservas e movimentos.
- Imutável após `CONFIRMED`; alterações só por fluxo futuro explicitamente aprovado.

### 6.3 `order_status_history`

- PK `id`; FK `order_id → orders.id`.
- `from_status`, `to_status`, ator, motivo, correlação, `changed_at` append-only.
- Índice `(order_id, changed_at)`.

## 7. Estoque

### 7.1 `inventory_locations`

PK `id`; nome, tipo/status operacional, timestamps. Platform-owned.

### 7.2 `inventory_balances`

- PK composta lógica `(inventory_location_id, sku_id)` ou UUID com unique equivalente.
- FKs `inventory_location_id → inventory_locations.id`, `sku_id → product_variants.id`.
- `on_hand`, `reserved` inteiros não negativos; `available = on_hand - reserved` derivado.
- Constraint `reserved <= on_hand`.
- `reserved` deve igualar a soma de reservas ACTIVE do mesmo local/SKU.
- Lock/CAS obrigatório na atualização concorrente.

### 7.3 `inventory_movements`

- PK `id`; colunas causais opcionais `order_id`, `order_item_id`, `reservation_id`, `sku_id`, `inventory_location_id` e `adjustment_reference`.
- `sku_id` e `inventory_location_id` possuem FKs diretas para SKU/Location; referências compostas são obrigatórias para preservar a coerência causal.
- `movement_type`, `on_hand_delta`, `reserved_delta`, unidade, before/after, motivo, ator, idempotency reference, `occurred_at`.
- Ledger append-only; correção somente por movimento compensatório.
- Deltas canônicos: entrada `(+q,0)`; saída não reservada `(-q,0)`; ajuste `(+/-q,0)`; reserva `(0,+q)`; liberação `(0,-q)`; consumo na expedição `(-q,-q)`; retorno `(+q,0)`.
- Constraint aritmética: `after = before + delta`; toda alteração de saldo gera exatamente um movimento.
- Índices `(inventory_location_id, sku_id, occurred_at DESC)`, `(order_id)`, `(reservation_id)`.
- Referências compostas: `(order_id, inventory_location_id)` para `orders(id, inventory_location_id)`; `(order_item_id, order_id, sku_id)` para `order_items(id, order_id, sku_id)`; e `(reservation_id, order_id, inventory_location_id, sku_id)` para `inventory_reservations(id, order_id, inventory_location_id, sku_id)`.
- XOR causal obrigatório: exatamente um caminho deve ser válido — (a) Reservation: todos os IDs de Reservation/OrderItem/Order/SKU/Location preenchidos e coerentes; (b) Order: `order_id`, `sku_id` e `inventory_location_id` preenchidos, `order_item_id` opcional mas coerente quando presente; ou (c) Ajuste: todos os IDs de Order/Item/Reservation/SKU/Location nulos e `adjustment_reference` preenchido.
- Movimentos de reserva/consumo/liberação usam o caminho Reservation; entradas/saídas/retornos comerciais usam o caminho Order quando houver Order; ajustes usam exclusivamente o caminho Ajuste. Nenhum movimento pode combinar entidades incompatíveis.

### 7.4 `inventory_reservations`

- FKs compostas explícitas: `(order_item_id, order_id, sku_id) → order_items(id, order_id, sku_id)` e `(order_id, inventory_location_id) → orders(id, inventory_location_id)`.
- PK `id`; FKs `order_item_id → order_items.id`, `inventory_location_id → inventory_locations.id`, `sku_id → product_variants.id`.
- `quantity` inteiro positivo; estados `ACTIVE`, `CONSUMED`, `RELEASED`.
- Unique `(order_item_id)` no MVP; a Location deve ser a Location do Order.
- Unique lógico adicional `(id, order_id, inventory_location_id, sku_id)` para suportar referências causais compostas de InventoryMovement.
- Unique lógica `(id, order_id, inventory_location_id, sku_id)` é obrigatória para a FK causal de InventoryMovement.
- `ACTIVE` compõe `reserved`; transições terminais irreversíveis.
- Não há expiração automática.
- `order_id` é obrigatório para formar as FKs compostas `(order_item_id, order_id, sku_id)` e `(order_id, inventory_location_id)`.
- Assim, `Reservation.sku_id = OrderItem.sku_id` e `Reservation.inventory_location_id = Order.inventory_location_id` são constraints relacionais, não apenas validações de aplicação.

## 8. Fulfillment e Delivery

### 8.1 `pickings`

- PK `id`; FK única `order_id → orders.id`.
- Estado, ator, quantidades esperadas/separadas, timestamps e divergência explícita.
- Só inicia com reservas ACTIVE; conclusão válida precede `READY_FOR_DISPATCH`.

### 8.2 `deliveries`

- PK `id`; FK única `order_id → orders.id`; `company_id` não é necessário: deriva do Order.
- `status`: `PLANNED`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `ATTEMPT_FAILED`, `CANCELLED` quando permitido.
- Janela, endereço/contact snapshot, `recipient_name` mínimo registrado pelo DRIVER na conclusão, prova final quando exigida, timestamps.
- `delivery_completed_event_id` nullable até a conclusão e UNIQUE quando preenchido; `completion_correlation_id` identifica a aplicação idempotente do fato.
- Uma Delivery por Order; não existem Route nem DeliveryStop no MVP.
- Na transição para `DISPATCHED`, consumo da reserva e baixa física ocorrem atomicamente.
- Ao concluir, `recipient_name` e `delivery_completed_event_id` são obrigatórios; o evento com esse ID atualiza o Order pai para `DELIVERED` uma única vez. Reentrega do mesmo evento é no-op idempotente.

### 8.3 `delivery_driver_assignments`

- PK `id`; FK `delivery_id → deliveries.id`, FK `driver_profile_id → profiles.id`.
- Início/fim de vigência, atribuidor, motivo e timestamps; append-only.
- No máximo uma atribuição ativa por Delivery; somente atribuição ativa autoriza DRIVER.

### 8.4 `delivery_status_history`, `delivery_occurrences`, `delivery_proofs`

- Cada tabela possui PK própria e FK obrigatória `delivery_id → deliveries.id`.
- Históricos/ocorrências/provas são append-only, com ator, instante e correlação.
- Proof referencia objeto Storage validado sem incorporar binário no banco.
- Índices por `(delivery_id, occurred_at)`; acesso do DRIVER depende da atribuição ativa.

## 9. Support, Notifications e Audit

### 9.1 `support_tickets`

PK `id`; FK `company_id → companies.id`, solicitante/assignee em `profiles`, referências opcionais a Order/Delivery validadas contra a mesma Company; estados `OPEN`, `IN_PROGRESS`, `WAITING_CUSTOMER`, `RESOLVED`, `CLOSED`; timestamps.

Integridade adicional: `requester_profile_id` usa FK composta `(requester_profile_id, company_id) → profiles(id, company_id)`; `order_id` usa `(order_id, company_id) → orders(id, company_id)`; `delivery_id` deve derivar a mesma Company pelo Order pai e é validado na transação. Assignee interno referencia `profiles.id` e exige role/permissão operacional. Nenhum ticket pode combinar referências de Companies diferentes.

### 9.2 `support_messages` e `support_status_history`

PK própria; FK `ticket_id → support_tickets.id`; autor, visibilidade, conteúdo/anexos, estado anterior/novo, motivo, timestamps. Ownership/RLS deriva do Ticket.

As duas entidades são tabelas distintas:

#### `support_messages`

- PK `id`, FK `ticket_id`, FK `author_profile_id`, `visibility`, `body`, referências de anexos, `created_at`; append-only; nunca contém `from_status`, `to_status` ou `reason` de transição.

#### `support_status_history`

- PK `id`, FK `ticket_id`, `from_status`, `to_status`, `actor_profile_id`, `reason`, `correlation_id`, `changed_at`; append-only; nunca contém o corpo de mensagem.
- Cada histórico é criado para uma transição de Ticket; cada mensagem é conteúdo conversacional independente. Ownership/RLS de ambas deriva do Ticket pai.

### 9.3 `notifications`

PK `id`; FK obrigatória `recipient_profile_id → profiles.id`; `company_id` somente quando o contexto referenciado for tenant-owned; tipo, payload mínimo, `read_at`, timestamps. Recipient nunca é implícito.

Adicionar `scope_kind` (`TENANT` ou `PLATFORM`). `recipient_profile_id` permanece obrigatório em ambos os escopos: no escopo PLATFORM, actor/sistema é representado por um Profile interno dedicado, com FK para `profiles.id`. Para `TENANT`, `company_id` é obrigatório e há FK composta `(recipient_profile_id, company_id) → profiles(id, company_id)`; para `PLATFORM`, `company_id` é NULL e o recipient deve ter role interno. Constraint de escopo impede Company incompatível; não existe recipient implícito nem `system_recipient` sem FK.

### 9.4 `audit_logs`

PK `id`; ator, role/contexto efetivo, `company_id` quando aplicável, ação, recurso, resultado, correlação, metadados mínimos, `occurred_at`. Append-only, sem secrets ou conteúdo sensível integral.

## 10. Idempotência

### `idempotency_records`

- PK `id`; `scope_kind` (`TENANT`/`PLATFORM`), `company_id` nullable, `actor_profile_id` nullable, `command_name`, `idempotency_key`, `payload_hash`, estado (`PROCESSING`, `SUCCEEDED`, `FAILED`), resultado seguro, `correlation_id`, `created_at`, `expires_at`.
- Retenção operacional: 90 dias; limpeza não pode ocorrer antes de `expires_at`.
- Chave lógica única: `(scope_kind, company_id, actor_profile_id, command_name, idempotency_key)`, com normalização de nulos para escopo platform/actor não aplicável.
- Mesma chave e hash retorna resultado anterior; hash diferente retorna conflito; concorrência tem um único vencedor.
- Índices por chave lógica e `expires_at`.
- Para `TENANT`, `company_id` e `actor_profile_id` são obrigatórios, com FK composta `(actor_profile_id, company_id) → profiles(id, company_id)`.
- Para `PLATFORM`, `company_id` é NULL; `actor_profile_id` pode ser NULL somente para execução de sistema, ou referenciar Profile interno com `company_id IS NULL`.
- Constraint de compatibilidade impede divergência entre `scope_kind`, Company e actor; NULL de Company/actor só ocorre no escopo PLATFORM.

## 11. Atomicidade e concorrência

1. `ConfirmOrder`: valida Membership/Company, preço, SKU, endereço e estoque; bloqueia a Balance; cria Order CONFIRMED, itens, reservas, movimentos e histórico na mesma transação.
2. `CancelOrder`: verifica estado autorizado por DH-06; libera reservas e grava movimentos/históricos/auditoria atomicamente.
3. `DispatchOrder`: verifica Picking completa e Delivery válida; consome reservas, baixa `on_hand`, registra movimentos e muda estados atomicamente.
4. Atualizações de Cart e transições usam `version`/lock para rejeitar escrita obsoleta.
5. Idempotency record deve ser adquirido antes dos efeitos e concluído na mesma Unit of Work.

## 12. Matriz de RLS (insumo; não são policies SQL)

| Recurso | CUSTOMER | INTERNAL_OPERATOR | DRIVER | PLATFORM_ADMIN | Ownership usado pela policy |
|---|---|---|---|---|---|
| `companies`, `establishments`, `addresses` | própria Company | permitido conforme permissão | somente dados de entrega atribuída | total auditado | Company; Address deriva de Establishment |
| catálogo e preços | leitura publicados da própria Company | CRUD autorizado | nenhum administrativo | CRUD/admin | catálogo platform-owned; Price Company+SKU |
| `company_memberships` | leitura de seus vínculos | administrar conforme permissão | próprio vínculo se aplicável | total auditado | Membership/Profile |
| `carts`, `cart_items` | Company + Establishment e Membership ativo | operação autorizada | nenhum | administração autorizada | Cart pai; filhos derivam Cart |
| `orders`, `order_items`, histories | própria Company | operação autorizada | somente contexto logístico mínimo | total auditado | Order pai; filhos derivam Order |
| inventory tables | nenhum acesso direto | operação autorizada | nenhum | administração autorizada | platform-owned; filhos derivam Location/causa |
| `deliveries`, assignments, occurrences, proofs | própria Company | operação autorizada | somente Delivery com assignment ativo | total auditado | Delivery deriva Order; histórico deriva Delivery |
| support tables | própria Company; somente mensagens visíveis | atendimento autorizado | nenhum | administração autorizada | Ticket pai; mensagens derivam Ticket |
| notifications | recipient próprio | recipient/escopo autorizado | recipient próprio | administração autorizada | recipient explícito + contexto |
| `audit_logs` | nenhum | consulta conforme permissão | nenhum | consulta privilegiada | actor/context/company |
| `idempotency_records` | próprias chaves/escopo | próprias operações autorizadas | próprias operações | administração técnica auditada | escopo tenant/platform + actor |

Regras comuns: sessão deve ser validada server-side; `company_id`, role, actor e assignment não vêm do browser; policies devem negar acesso por IDOR e cross-tenant; funções privilegiadas permanecem server-side.

## 13. Invariantes testáveis

- CUSTOMER só acessa dados da Company vinculada ao Profile/Membership ativo.
- `company_id` não pode ser escolhido pelo cliente nem mudar após criação de recursos tenant-owned.
- FKs compostas e constraints transacionais rejeitam Membership, Establishment, Cart, Order, Support ou Delivery que combinem IDs de Companies diferentes.
- Cart ACTIVE é único por Company + Establishment; CartItem é único por Cart + SKU.
- Order nasce CONFIRMED somente com ao menos um item, preço capturado, endereço válido, uma Location e reservas suficientes.
- Cart convertido não pode gerar segundo Order.
- `Order.order_number` é único globalmente e server-generated.
- As UNIQUE compostas `(id, company_id)`, `(id, inventory_location_id)`, `(id, company_id, inventory_location_id)`, `(id, order_id, sku_id)` e `(id, order_id, inventory_location_id, sku_id)` existem para todas as FKs lógicas correspondentes.
- OrderItem confirmado é imutável e não consulta preço corrente.
- Quantity de CartItem, OrderItem e Reservation é inteira e positiva na unidade do SKU.
- `on_hand >= 0`, `reserved >= 0`, `reserved <= on_hand`; `available` nunca é armazenado como fonte autoritativa.
- `reserved` é igual à soma de reservas ACTIVE do mesmo SKU/Location.
- Reservation sempre tem o mesmo `sku_id` do OrderItem e o mesmo `inventory_location_id` do Order; referências causais de InventoryMovement preservam a mesma coerência.
- Cada alteração de saldo gera um único movimento imutável com deltas conciliáveis.
- InventoryMovement preenche exatamente um caminho causal XOR (Reservation, Order ou Ajuste); suas colunas causais e FKs compostas permanecem coerentes com Reservation, OrderItem, Order, SKU e Location.
- Reserva usa a única Location do Order; não há rateio.
- Reservas não expiram; `ACTIVE` só vai para `CONSUMED` ou `RELEASED`.
- Cancelamento libera reservas e movimentos atomicamente conforme DH-06.
- Expedição consome reserva e baixa `on_hand` atomicamente.
- Existe no máximo uma Delivery por Order; não há Route/Stop no MVP.
- DRIVER só lê/muta Delivery com assignment ativo.
- Conclusão de Delivery exige `recipient_name` e `delivery_completed_event_id`; o mesmo evento/correlation só pode atualizar Order para `DELIVERED` uma vez.
- ProductImage preenche exatamente um owner (`product_id` ou `variant_id`) e permite no máximo uma imagem primária por owner.
- Toda Notification tem `recipient_profile_id` não nulo; TENANT referencia Profile da mesma Company e PLATFORM referencia Profile interno dedicado com `company_id NULL`.
- `support_messages` e `support_status_history` são entidades distintas: mensagens guardam conteúdo append-only; histórico guarda somente transições append-only.
- IdempotencyRecord TENANT exige Company e actor compatíveis; NULL de Company/actor só ocorre em execução PLATFORM autorizada.
- Históricos, auditoria, provas e mensagens internas não são apagados nem sobrescritos silenciosamente.
- Mesma idempotency key/hash não repete efeitos; hash diferente conflita; retenção mínima é 90 dias.
- Toda referência filha tenant-owned permite derivar o tenant por FK ao pai.

## 14. Gate de implementação

Este documento é a base lógica para DATA-001. A próxima etapa é revisão cruzada por PRODUCT-DOMAIN, SOFTWARE-ARCHITECT e SECURITY, seguida de migrations versionadas somente após aprovação. Este arquivo não cria schema executável, policies ou SQL.
