# ORDER-REVIEW-001 - Order Analysis and Final Confirmation Data Plan

**Role:** SOFTWARE-ARCHITECT  
**Status:** REVIEW / NO IMPLEMENTATION  
**Date:** 2026-10-01

## Audit result

The current `confirm_active_cart`/`confirm_active_cart_with_address` path creates an order directly in `CONFIRMED`, snapshots the current catalog price into `order_items.unit_price_minor`, reserves inventory, creates a delivery and converts the cart in one transaction. The current status set is `CONFIRMED`, `PICKING`, `READY_FOR_DISPATCH`, `DISPATCHED`, `DELIVERED`, `RECEIPT_CONFIRMED`, `CANCELLED`.

`order_status_history`, `audit_logs`, inventory reservations/movements and `idempotency_records` already exist. Operator RPCs lock orders before transition; latest delivery integrity functions protect company/membership/assignment boundaries.

The `PROD-PRICE-001` migration currently adds `product_variants.minimum_quantity` and `order_items.minimum_quantity_snapshot`, but the existing confirm RPC does not yet validate the minimum or explicitly write the snapshot. This is a required fix in the next implementation slice, not a reason to silently reinterpret existing orders.

## Approved domain decisions

- Minimum sale quantity is per SKU.
- UNIT and CASE are separate SKUs; no physical conversion.
- Stock is reserved only after the customer confirms the final price.
- CUSTOMER may list all orders in the customer's company, but not another company.
- WhatsApp is manual in this release; no provider/API/webhook is part of this slice.

## Proposed additive state machine

Use explicit states rather than reusing `CONFIRMED`:

```text
SUBMITTED_FOR_ANALYSIS
  -> PRICE_ANALYSIS
  -> AWAITING_CUSTOMER_CONFIRMATION
  -> CONFIRMED (final price accepted; reservation occurs here)
  -> PICKING -> READY_FOR_DISPATCH -> DISPATCHED -> DELIVERED -> RECEIPT_CONFIRMED
```

Allowed cancellation rules must be confirmed by Product Domain, but cancellation must be possible before reservation without inventing a stock-release event. Existing orders in current states retain their meaning and remain readable.

## Minimal data evolution

1. Add the new status values to the order status constraint, preserving all legacy values.
2. Add explicit approximate-price and final-price snapshots to order items (recommended `approximate_unit_price_minor`, `final_unit_price_minor`, `approximate_subtotal_minor`, `final_subtotal_minor`, with final fields nullable until customer confirmation). Do not overwrite the current approximate snapshot.
3. Add order-level approximate/final totals only if required by the UI; otherwise derive them from item snapshots and validate transactionally.
4. Add an append-only `order_price_history` table or equivalent history record containing order item, previous/new value, actor, role, reason, correlation and timestamp. Do not put sensitive detail in `audit_logs`.
5. Add `analysis_version`/`version` or use an optimistic `updated_at` predicate so stale operator edits fail. Existing `orders.updated_at` is available but needs conditional update semantics.
6. Keep `order_status_history` for every state transition. Existing `order_items.unit_price_minor` remains readable for legacy orders during rollout; dual-read compatibility is required.

## Transactional commands / RPCs

### `submit_order_for_analysis`

- Authenticate CUSTOMER and derive profile/company/establishment from session and cart.
- Lock the active cart and item rows.
- Validate active SKU, current company price, positive quantity and `quantity >= minimum_quantity` per SKU.
- Write `SUBMITTED_FOR_ANALYSIS`, approximate item snapshots and address/window snapshots.
- Do not reserve inventory.
- Convert or freeze the cart using a reviewed policy; duplicate submit must return the existing request/order by cart + idempotency key.
- Append status history and audit event atomically.

### `set_order_final_price`

- Authenticate active `INTERNAL_OPERATOR` with active membership for the order company.
- Lock the order and require `PRICE_ANALYSIS` (or the approved equivalent).
- Require a valid non-negative final price per item and validate total calculation.
- Conditional update on order/version prevents two operators overwriting silently.
- Append price history, audit, and status history; transition to `AWAITING_CUSTOMER_CONFIRMATION` atomically.
- No stock reservation yet.

### `confirm_final_order_price`

- Authenticate CUSTOMER and require order ownership/company membership according to the approved customer model.
- Lock order and require `AWAITING_CUSTOMER_CONFIRMATION`.
- Verify final item prices/totals still exist and are valid.
- Lock inventory balances in deterministic SKU/location order, verify availability, create reservations/movements and transition to `CONFIRMED` in one transaction.
- Repeated confirmation with the same idempotency key is a no-op returning the prior result; a different key after confirmation returns the current order state.

### Picking and later operations

Existing `CONFIRMED -> PICKING` commands must remain, but reject any analyzed order that lacks final customer confirmation and active reservations. Internal operator only; DRIVER never starts picking.

## Idempotency and concurrency

- Require a client-generated idempotency key for submit, final-price definition and final customer confirmation; validate length/format and bind it to actor/company/command/request hash.
- Use the existing `idempotency_records` with unique scope/actor/command/key. Same hash returns stored result; different hash returns conflict.
- Lock cart/order rows for state transitions. Lock inventory balances in deterministic order to reduce deadlocks.
- Operator pricing uses optimistic version/updated-at compare-and-set while holding the order lock. A second operator receives a stale/conflict response and must reload.
- Never issue multiple status histories, reservations or audit success records for a duplicate command.

## RLS and authorization

- Keep order/order-item/history reads derived from order company membership.
- CUSTOMER detail/list query must filter by the authenticated profile's company; the browser-supplied order ID is only a lookup key.
- Operator pricing and analysis queue must require `INTERNAL_OPERATOR`, active profile, active membership and same order company.
- DRIVER has no price-analysis access and sees only assigned delivery data.
- PLATFORM_ADMIN may audit/manage according to existing admin boundary, but must not bypass item/total invariants.
- Final customer confirmation must not accept a company/profile ID from the request.

## Rollout and rollback

1. Deploy compatible reads and new nullable columns/history table first.
2. Add status values and RPCs while old confirm RPC remains available only for legacy compatibility/testing; do not silently route old clients into a new meaning.
3. Backfill only metadata that is mechanically derivable; never invent final prices or customer confirmations.
4. Enable new flow behind a server-side feature/config gate after E2E and RLS tests.
5. Roll back by disabling new commands/UI while retaining new columns/history. Existing legacy orders continue through their existing statuses.
6. Do not drop `unit_price_minor`, existing statuses, reservations or historical rows.

## Acceptance tests

### State and data

- Submit creates one analysis request with approximate snapshots and no inventory reservation.
- Operator can set valid final prices once; history records approximate/final relationship.
- Customer sees final values and explicitly confirms.
- Only after confirmation are reservations created and order eligible for picking.
- Minimum per SKU is enforced by direct RPC, including manual requests.
- Duplicate submit/price/confirm commands are idempotent.
- Stale operator update is rejected without overwriting another operator.
- Legacy CONFIRMED orders remain readable and operational.

### Security

- Customer A cannot view or confirm company B's order by ID.
- Customer sees all own-company orders, not cross-company orders.
- Operator A cannot price company B's order.
- Driver cannot price, confirm or start picking.
- A customer cannot bypass final confirmation by calling picking RPC.

### Inventory and regression

- No reservation exists after submit-for-analysis.
- Stock is locked and reserved once on final confirmation.
- Insufficient stock rejects final confirmation atomically without partial history/reservation.
- Existing cancellation, dispatch, delivery and receipt flows continue.
- TypeScript, ESLint, build, migration lint/list and browser E2E pass.

## Open decisions

- Exact final status names and whether cancellation is allowed in each analysis state.
- Whether cart remains ACTIVE, becomes a distinct submitted draft, or converts at analysis submission.
- Whether final price may be edited after customer rejection and what state/reason records that action.
- Whether totals are stored at order level or always derived from item snapshots.

## Handoff

**TASK_ID:** `ORDER-REVIEW-001`  
**STATUS:** READY_FOR_PRODUCT-DOMAIN/DATABASE/SECURITY_REVIEW  
**FILES_CHANGED:** this document only  
**SCHEMA_CHANGED:** none  
**MIGRATIONS:** none  
**SECURITY_IMPACT:** new operator/customer commands require tenant, role, ownership, RLS and IDOR tests  
**TESTS_EXECUTED:** read-only migration/action/route audit  
**TEST_RESULTS:** audit only; no implementation tests run  
**RISKS:** current confirm RPC reserves before pricing and does not populate minimum snapshot; do not enable new semantics until replaced/versioned  
**OPEN_ISSUES:** exact state names, cart lifecycle, cancellation/repricing semantics and total persistence  
**NEXT_DEPENDENCY:** approve exact state machine, then implement `ORDER-REVIEW-001` after `PROD-PRICE-001`.
