# Farta V1 — Domain Changes (Phase A)

**Task:** PHASE-A-DOMAIN-AUDIT  
**Status:** REVIEW  
**Scope:** Audit and domain proposal for products, catalog, prices, cart, order review, profiles/WhatsApp, global catalog, banners and chat. No code, SQL, migration, RLS or UI is implemented here.

## 1. Evidence and audit boundary

Inspected src/modules/orders/order.actions.ts, customer/auth/invitation/admin modules, catalog/order/operation/admin routes, all migrations through 20261001000100_product_price_contract.sql, supabase/seed.sql, docs/domain/domain-model.md, docs/data/relational-model.md, docs/security/security-model.md and changeset documents. maestri list was executed before the audit. No build or runtime mutation was performed.

The frontend is not the authority for tenant, price, stock or role decisions; server-side authenticated context, RPCs and constraints are authoritative.

## 2. Modelo atual observado

### Identity, Company and Establishment

- companies owns establishments; profiles use memberships and roles CUSTOMER, INTERNAL_OPERATOR, DRIVER and PLATFORM_ADMIN.
- Public signup does not select a tenant. Invitation acceptance creates/upgrades the profile and membership for the invitation Company. Browser company_id and role are not trusted.
- Customer context selects an Establishment and derives Company/membership server-side. Addresses are checked for the selected Establishment.
- Profiles have phone; no dedicated WhatsApp provider, consent, delivery status or outbox was found.

### Catalog and prices

- products, product_variants (SKU), categories and product_images are global catalog records; images use Storage paths and alt text.
- A price is scoped to company_id + sku_id, temporal/status-aware, and resolved for the authenticated Company. Establishment, segment and volume are not pricing dimensions.
- SKU has sale_unit and minimum_quantity; the catalog action type exposes minimumQuantity, but its current projection does not consistently return it. There is no explicit units-per-case conversion or approximate/final price concept.
- Catalog joins global product data with private Company pricing; customers must not see another Company's prices, costs, margins or suppliers.

### Cart

- carts/cart_items are scoped to Company + Establishment. Approved domain rule: one ACTIVE cart per pair, shared by authorized memberships, with optimistic versioning and idempotent conversion.
- add_to_establishment_cart and set_active_cart_item_quantity enforce membership, price availability, SKU availability and minimum quantity. Quantities are integer counts of the SKU commercial unit.
- A legacy add_to_active_cart path can choose the first active Establishment when none is supplied. This is a context/IDOR risk and must not be used by the new flow.
- Cart stores displayed unit price and quantity, but has no review revision or price-analysis state.

### Order and inventory

- confirm_active_cart_with_address currently converts the active cart directly into an order, captures name/unit/price snapshots, assigns an inventory location, creates reservations/movements and writes history atomically.
- Current operational status path is CONFIRMED -> PICKING -> READY_FOR_DISPATCH -> DISPATCHED -> DELIVERED -> RECEIPT_CONFIRMED; cancellation is guarded and historical.
- orders has Company/Establishment/address snapshot, totals and a server-generated order number; order_items has SKU name, sale unit, quantity, unit price and subtotal snapshots.
- Inventory is separate from Product. Reservations, immutable movements and stock deltas are location/SKU/tenant scoped. Delivery assignment and dispatch integrity are hardened; driver access is assignment/tenant constrained.
- There is no separate approximate-price review or final customer price confirmation. Direct confirmation therefore conflicts with the requested commercial flow.

### Notifications, banners and chat

- Current order notifications are projections of order_status_history; no generic recipient-addressed WhatsApp notification model was found.
- No Banner entity, admin banner route or carousel persistence was found.
- No conversation, participant, message, read-state or chat retention model was found. Support remains distinct and requires append-only status history.

## 3. Mudanças por task ID

### PROD-PRICE-001 — unidade, mínimo e preço aproximado

Preserve the global Product/SKU and Company+SKU price model. Add a commercial presentation that can show approximate unit/case pricing and minimum sale without changing physical stock semantics. The approved MVP interpretation is integer quantity in the SKU commercial unit; no automatic case-to-unit conversion; Establishment, segment and volume do not alter price unless newly approved. Final price is captured on OrderItem; approximate price is informational and never reserves stock. Persistence shape remains for DATA review.

### ORDER-REVIEW-001 — análise antes da confirmação

Add a review phase: customer submits the cart, operator sets final prices/feasibility, customer explicitly confirms the final quote, then picking/reservation may begin. Existing historical CONFIRMED orders keep their meaning. The current direct confirmation RPC must be versioned or complemented; it cannot be the only command for new orders.

### PROFILE-WHATSAPP-001 / NOTIFY-WHATSAPP-001

Keep phone data private and server-controlled. The approved V1 baseline is manual WhatsApp contact/no provider integration, so no provider, webhook or delivery guarantee is invented. Future automation requires recipient, tenant, consent and idempotency safeguards and must exclude internal cost/margin data.

### CATALOG-GLOBAL-001

Keep Products, SKUs, Categories and Images globally readable to authenticated users. Company-specific prices, carts, orders, inventory, support and delivery remain tenant-private. Global catalog never means global price or stock.

### ADMIN-PRODUCTS-001 / ADMIN-CATEGORIES-001

Platform/admin commands may create, activate, deactivate and update global products, SKUs, categories and image metadata. Company operators may not mutate global catalog unless separately authorized. Expose sale unit/minimum and price applicability; preserve immutable order snapshots. Prefer category archival over destructive deletion when referenced.

### ORDER-DETAILS-001

Retain order/address/item/status snapshots as the source of truth. Extend projections to show approximate/final price and commercial mode for reviewed orders; do not reprice historical orders from the current catalog. Customer and driver views remain least-privilege.

### BANNERS-001

No Banner model exists. If delivered, use the approved baseline of active/inactive publication, ordered carousel and approximately eight-second rotation as UI behavior. Do not assume scheduling, targeting, click-through or tenant-specific rules.

### CHAT-001

No chat model exists. Introduce conversations/messages only after participant, role, lifecycle and retention rules are approved. Chat is tenant-scoped, auditable and distinct from notifications and SupportTicket history.

## 4. DECISION_REQUIRED — bloqueadores

### DECISION_REQUIRED: revisão de pedido e compatibilidade de status

**CONTEXT:** Current RPC creates CONFIRMED, reserves stock and writes history atomically; the new flow needs operator pricing and customer confirmation.  
**CURRENT_BEHAVIOR:** ACTIVE_CART -> CONFIRMED -> PICKING...; no review state.  
**OPTION_A:** Add SUBMITTED_FOR_REVIEW, PRICED_AWAITING_CUSTOMER_CONFIRMATION and CUSTOMER_CONFIRMED, preserving legacy statuses.  
**OPTION_B:** Keep operational orders.status and add a separate review aggregate/phase.  
**IMPACT:** A changes status enums/RPC guards; B adds coordination and query complexity. Both change reservation timing.  
**RECOMMENDATION:** Option A with versioned commands and no rewriting of historical status meaning. Blocks DATA-001.

### DECISION_REQUIRED: representação de unidade/caso

**CONTEXT:** SKU has text sale_unit and integer minimum quantity; requirements mention unit and case prices.  
**CURRENT_BEHAVIOR:** One Company price per SKU; no conversion factor or approximate/final fields.  
**OPTION_A:** Each sellable commercial mode is a distinct SKU/variant with its own Company price/minimum.  
**OPTION_B:** Child commercial modes under one SKU with conversion/pricing rules.  
**IMPACT:** A is simpler and preserves inventory invariants; B adds rounding, stock and precedence rules.  
**RECOMMENDATION:** Option A; no implicit physical conversion. Blocks final data design if rejected.

### DECISION_REQUIRED: snapshot de preço e revisões

**CONTEXT:** OrderItem has one unit-price snapshot; review needs approximate and final values.  
**CURRENT_BEHAVIOR:** unit_price_minor is captured at direct confirmation.  
**OPTION_A:** Add approximate/final fields plus review status to item/order snapshots.  
**OPTION_B:** Add append-only pricing revisions and reference the accepted revision.  
**IMPACT:** A is simpler; B is more expressive but adds aggregation and idempotency complexity.  
**RECOMMENDATION:** Option A for MVP, with immutable accepted values and history event; DATA-001 must validate constraints.

### DECISION_REQUIRED: WhatsApp delivery

**CONTEXT:** Requirement asks confirmations/updates, but repository has phone only and no provider. Prior V1 baseline says manual.  
**CURRENT_BEHAVIOR:** In-app status-history projection; no outbound delivery guarantee.  
**OPTION_A:** Manual WhatsApp V1 with a safe contact action.  
**OPTION_B:** Approved provider with opt-in, outbox, retry, webhook and delivery audit.  
**IMPACT:** B introduces secrets, LGPD/consent, provider failure and retention obligations.  
**RECOMMENDATION:** Option A for this changeset; automated delivery is a separate dependency.

### DECISION_REQUIRED: chat participants, lifecycle and retention

**CONTEXT:** No chat model exists; Support and order notifications are separate domains.  
**CURRENT_BEHAVIOR:** No customer/operator/driver conversation persistence.  
**OPTION_A:** 1:1 customer-to-company-operator conversation tied to membership/order, append-only messages and explicit close.  
**OPTION_B:** Multi-party conversations with driver/platform admin, attachments, reopening and unrestricted retention.  
**IMPACT:** B materially expands authorization, privacy, storage and moderation.  
**RECOMMENDATION:** Option A if CHAT-001 is MVP; otherwise defer. Blocks chat policy/schema review.

## 5. Máquina de estados proposta (não implementar)

```text
ACTIVE_CART -> SUBMITTED_FOR_REVIEW -> PRICED_AWAITING_CUSTOMER_CONFIRMATION
-> CUSTOMER_CONFIRMED -> PICKING -> READY_FOR_DISPATCH -> DISPATCHED
-> DELIVERED -> RECEIPT_CONFIRMED

SUBMITTED_FOR_REVIEW -> CANCELLED
PRICED_AWAITING_CUSTOMER_CONFIRMATION -> CANCELLED
CUSTOMER_CONFIRMED -> CANCELLED (approved cancellation window only)
```

Approximate price cannot reserve or guarantee supply. Final values/totals must exist before CUSTOMER_CONFIRMED. Reservation and stock movement are atomic with final confirmation according to the accepted inventory timing. No picking precedes final confirmation. Every transition is server-authorized, idempotent and append-only. Legacy CONFIRMED records retain old semantics.

## 6. Invariantes e critérios de aceitação

1. Company price resolution is unique by Company+SKU+valid instant; no hidden Establishment/segment/volume precedence.
2. One ACTIVE cart exists per Company+Establishment; authorized members share it; stale versions fail safely; conversion is idempotent.
3. Browser input never chooses tenant, role, price, stock location or driver authorization.
4. OrderItem snapshots preserve SKU/commercial mode, approximate value (when present), accepted final value, quantity and subtotal.
5. Approximate review cannot reserve/consume stock; final confirmation is atomic with reservation/history under the accepted design.
6. Inventory is not a Product field; every delta has immutable causal movement and maintains on-hand/reserved invariants.
7. Delivery remains logistical authority; completion updates Order idempotently and records recipient/proof as allowed.
8. Customer sees only own Company data; Driver sees assigned deliveries; internal cost/margin/supplier data is never customer data.
9. Global catalog reads expose no private prices, inventory or orders.
10. Notifications have explicit recipient and tenant; Support history is append-only; chat requires participant authorization.

### Acceptance

- Customer sees the global catalog but only authenticated Company price, valid unit/minimum and shared Establishment cart.
- Authorized members see the same ACTIVE cart; optimistic conflicts reload instead of silently overwriting.
- Submission creates a reviewable order without presenting approximate values as final or reserving stock.
- Operator sets final prices/feasibility with history; customer explicitly confirms.
- Final confirmation is idempotent, captures immutable values/totals, reserves atomically and unlocks picking.
- Existing orders/history remain readable and unchanged in meaning.
- Catalog/admin operations enforce roles and tenant boundaries; no customer access to costs/margins/suppliers.
- Delivery assignment/completion/receipt confirmation stay least-privilege and idempotent.
- Manual WhatsApp UI makes no automated-delivery claim; future provider work tests consent/outbox/recipient.
- Banners/chat are implemented only under approved policy or explicitly deferred.

## 7. Riscos

- Status migration can break transition RPCs, queues, reports and notifications.
- Legacy cart RPC selecting the first Establishment can put items in the wrong context.
- Display-only case/unit modeling can mismatch price, minimum and inventory.
- Operator repricing needs optimistic version/idempotency protection.
- Global catalog plus private prices requires continued RLS/IDOR tests on child tables/RPCs.
- WhatsApp automation adds consent, provider outage, secrets and retention risk.
- Banners add asset trust, ordering and destination-validation risk.
- Chat without participant/lifecycle/retention policy risks cross-tenant disclosure and unbounded retention.

## 8. Handoff

**STATUS:** REVIEW — audit complete; implementation remains blocked by the explicit decisions above.  
**FILES_CHANGED:** prostock-web/docs/changesets/farta-v1-commercial-flow/domain-changes.md only.  
**SCHEMA_CHANGED:** No.  
**TESTS_EXECUTED:** maestri list; static inspection of migrations, server actions, routes, UI modules, domain/data/security docs; consistency review of states, ownership, pricing and inventory invariants. No build, migration or runtime test.  
**TEST_RESULTS:** Evidence captured; no implementation behavior changed.  
**OPEN_ISSUES:** Resolve review-state compatibility; confirm unit/case and price-snapshot persistence; confirm WhatsApp remains manual; approve CHAT-001 participant/lifecycle/retention policy.  
**NEXT_DEPENDENCY:** Product/data/security review, then DATA-001 impact and migration design; implementation phases B–J follow only after those approvals.

