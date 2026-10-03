# ORDER-REVIEW-001 — Security / QA Review

## Handoff

- **TASK_ID:** ORDER-REVIEW-001-SECURITY-QA
- **OWNER:** SECURITY / QA
- **STATUS:** REVIEW COMPLETE — BLOCKED FOR IMPLEMENTATION UNTIL STATE MODEL IS APPROVED
- **SCOPE:** Negative tests and security gates for analysis, final price, customer confirmation, late reservation, company ownership and replay/idempotency.
- **FILES_CHANGED:** This report only.
- **SCHEMA_CHANGED:** None.
- **MIGRATIONS:** None.
- **NEXT_DEPENDENCY:** Product-domain must approve the new order state machine and final-price ownership before backend changes.

## Current implementation baseline

The current `orders.status` check supports `CONFIRMED`, `PICKING`, `READY_FOR_DISPATCH`, `DISPATCHED`, `DELIVERED`, `RECEIPT_CONFIRMED` and `CANCELLED`. `confirm_active_cart` / `confirm_active_cart_with_address` currently create an order directly as `CONFIRMED`; the atomic implementation also reserves inventory and creates delivery records in the same operation. `advance_order_status` authorizes transitions by role/company and uses `FOR UPDATE`, status history and audit logs.

`company_get_order_details` authorizes platform admins, same-company internal operators and assigned drivers. It does not currently authorize a customer to view its order through the details RPC, and it returns current product names/brand alongside order snapshots. This must be reviewed before customer final-price/link UX.

The current model has no explicit analysis state, final-price snapshot, customer final-confirmation event or late-reservation command. Therefore the existing `CONFIRMED -> PICKING` transition is semantically unsafe for the proposed review flow until the state machine is expanded.

## Required state-machine security invariants

The approved implementation must represent, with explicit states or equivalent guarded commands:

1. Customer submitted approximate values for internal analysis.
2. Operator assigned/defined final prices while preserving approximate values.
3. Customer was notified and explicitly confirmed the final purchase.
4. Only after final confirmation may inventory be reserved and picking begin.
5. Cancellation/expiry paths release any reservation and cannot revive a cancelled order.

Recommended conceptual transitions to test (names are not final):

`SUBMITTED_FOR_REVIEW -> PRICED_AWAITING_CUSTOMER -> CONFIRMED -> PICKING`.

Do not reuse `CONFIRMED` for “submitted for analysis” unless the domain explicitly accepts the semantic mismatch and all callers are migrated. Existing historical orders must retain their meaning.

## Authorization requirements

### Customer

- May submit only its own active cart under the authenticated company/establishment.
- May read approximate/final values only for orders allowed by the approved customer ownership rule.
- May confirm final purchase only when the order is awaiting customer confirmation, final prices are complete and the order belongs to the permitted account/company.
- Cannot set final prices, status, company, creator, totals or reservation quantities.

### Internal operator

- May analyze and price orders only for an active membership in the order company and approved operator role.
- Must update final prices through a server-side command that locks the order and validates item membership, currency, non-negative amount and status.
- Cannot change customer/company/establishment/approximate snapshots or price an order from another company.
- Concurrent operators must receive a conflict or idempotent result, never silent overwrite.

### Driver

- Must not view or modify approximate/final commercial data beyond the minimum delivery DTO.
- Must not reserve, price, confirm or advance an unassigned/other-company order.

### Platform admin

- May perform explicitly approved operational actions, with audit trail and no bypass of invariants.

## Negative test matrix

### Transitions

1. Anonymous caller invokes every state command: `FORBIDDEN`/authentication failure.
2. Customer attempts `SUBMITTED_FOR_REVIEW -> PICKING`: rejected.
3. Operator attempts to skip analysis/final-price state: rejected.
4. Customer confirms before final prices exist or with one item unpriced: rejected atomically.
5. Customer confirms an already confirmed, cancelled, expired or delivered order: rejected or idempotent only where explicitly defined.
6. Operator retries a transition from a stale status: rejected with no new history row.
7. Invalid status strings, reverse transitions and jumps (`PICKING -> CONFIRMED`, `DELIVERED -> PICKING`) are rejected.
8. A cancelled order cannot be re-priced, re-confirmed or moved into picking.

### Final price

1. Customer attempts to write final price, currency, subtotal or total: denied.
2. Operator from company A prices company B’s order by changing order/item IDs: denied without B data.
3. Operator sends negative, null, fractional/invalid minor-unit, overflow or unsupported-currency value: rejected.
4. Payload omits an item, duplicates an item, adds an unknown item or prices an item not in the order: rejected atomically.
5. Final total inconsistent with final item subtotals: server recalculates/rejects; client total is never trusted.
6. Operator changes approximate price snapshot or item identity while setting final price: rejected.
7. Final price update while order is not in the pricing state: rejected.
8. Two operators price concurrently: one committed version; the other receives a conflict/idempotent response and cannot overwrite history.
9. Repeating an identical final-price command with the same idempotency key creates one result/history event.

### Confirmation

1. Customer A confirms company/customer B’s order: `FORBIDDEN`/`ORDER_NOT_FOUND`, no state change.
2. Customer confirms with manipulated order ID, company ID, cart ID or establishment ID: denied.
3. Customer confirms after final-price revision without seeing the current version: stale-version conflict; no reservation.
4. Customer sends duplicate confirmation concurrently: one state change and one audit/history event.
5. Customer confirms with an altered client total or price payload: server ignores/rejects tampered values and uses persisted final values.
6. Operator, driver or platform user calling the customer-confirmation command is denied unless explicitly authorized by domain.
7. Confirmation after order cancellation/expiry/delivery is rejected.

### Late reservation and inventory

1. Submitting approximate order for analysis creates no active inventory reservation or reserved stock increment.
2. Pricing an order creates no reservation by itself.
3. Customer confirmation reserves exactly once, for persisted order items and selected inventory location.
4. Duplicate confirmation/replay cannot increment `inventory_balances.reserved` twice.
5. Insufficient stock at final confirmation rejects the whole transaction; order remains awaiting confirmation or moves to an explicit failure state, with no partial reservation.
6. Two orders competing for the last units serialize on the inventory balance; at most one reserves available stock.
7. Cancellation before reservation creates no release movement; cancellation after reservation releases exactly once.
8. A caller cannot reserve another order’s SKU, location or item by altering IDs.
9. Reservation rows, movements and order status commit atomically; no order may enter picking without a valid active reservation policy.
10. Replaying a reservation command with the same idempotency key does not create duplicate movement/history rows.

### Ownership and cross-tenant access

1. Customer A lists/opens/confirm-links an order owned by customer/company B: zero data and no side effect.
2. Operator A reads/prices/confirms/reserves B’s order: denied at RPC and RLS layers.
3. Driver A reads order details or commercial fields for B/unassigned order: denied or minimum DTO only.
4. Changing only `company_id`, `created_by_profile_id`, `cart_id`, `establishment_id` or `p_order_id` in a request cannot cross tenant boundaries.
5. Direct table writes through the authenticated client cannot bypass command authorization.
6. Order item/history/reservation/movement reads for another company return no rows.
7. A revoked membership loses access immediately; old session claims do not preserve access.

### Replay/idempotency and concurrency

1. Double click on submit, final-price save, customer confirmation, reservation and picking is safe.
2. Same command/key with same payload returns the original result without side effects.
3. Same key with a different payload is rejected as a hash conflict.
4. Concurrent final-price writes use row/version locking and preserve an auditable winner/conflict.
5. Concurrent customer confirmation and cancellation serialize to one valid terminal outcome.
6. Network retry after committed transaction does not create a second order, status-history row, delivery or reservation.
7. Audit metadata contains actor, company, command/result and correlation/idempotency key, but no secrets or unnecessary PII.

## RLS and server-side gates

- Keep `orders`, `order_items`, history, reservations and movements RLS enabled.
- Derive company from `auth.uid()`/active membership, never from an untrusted client parameter.
- Use explicit role/status predicates in each security-definer command and fixed `search_path`.
- Revoke public/anonymous execution; grant only to `authenticated` where appropriate.
- Use explicit DTO columns; do not expose `select *` order payloads to drivers/customers.
- Add constraints for final-price completeness, non-negative values, snapshot consistency and reservation/status invariants where feasible.
- Keep approximate and final prices immutable as historical facts; do not overwrite cart/catalog values to represent final review.
- Add audit/status history for submit, pricing, customer confirmation, reservation, release, cancellation and conflicts.

## Blocking decisions

1. **State names and semantics:** approve explicit analysis, awaiting-final-confirmation and post-confirmation states; current `CONFIRMED` is already used for immediate checkout.
2. **Customer order ownership:** own profile only versus all orders in company/establishment. This controls confirmation and detail RLS.
3. **Reservation timing:** confirm that initial analysis never reserves and final customer confirmation reserves atomically before picking.
4. **Price conflict policy:** reject stale operator versions versus last-write-wins with explicit audit (reject stale version recommended).

## QA exit criteria

`ORDER-REVIEW-001` is not complete until the state machine is approved, commands implement the invariants above, cross-tenant negative tests pass on a disposable Supabase environment, and lint/typecheck/build plus migration/RLS verification pass. No implementation changes were made in this task.

## Implementation update — 2026-10-01

The approved decisions were implemented in migrations `20261001000200` through `20261001000700` and in the application actions/UI. The flow is now exercised end-to-end locally:

- customer submits a cart and receives `SUBMITTED_FOR_REVIEW` without reservation;
- company operator defines final prices per SKU;
- customer sees the exact product names and confirms final prices;
- confirmation creates the reservation and transitions to `CUSTOMER_CONFIRMED`;
- operator can start picking only after that confirmation.

Quality gates passed: Supabase push, `supabase db lint --linked`, typecheck, lint without errors, build, and authenticated browser smoke test for the complete flow. Cross-tenant negative tests and replay/idempotency stress tests remain before closing the slice.

Design QA follow-up: invalid final-price values are rejected before submission; operational drawer focus is trapped and restored after Escape/close; table headers expose `scope="col"`; the checkout explicitly labels the total as approximate. Responsive smoke test at 390px passed. Migration `20261001000800` now makes repeated submissions with the same idempotency key return the original order instead of creating a duplicate.

Negative checks executed against the linked Supabase project:

- customer from another company opening order `#12`: `FORBIDDEN`;
- customer from another company confirming order `#12`: `ORDER_NOT_FOUND`;
- customer attempting to define final prices: `FORBIDDEN`;
- unassigned driver opening order `#12`: `FORBIDDEN`;
- same customer confirming `#12` after it had already entered `PICKING`: idempotent `true` with no new reservation;
- migration `20261001000900` applied and schema lint remained clean.
