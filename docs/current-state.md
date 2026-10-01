# Current State

**Task:** AUDIT-001  
**Status:** DONE  
**Audit date:** 2026-09-23  
**Scope:** repository audit only; no application behavior was changed

## Stack

| Area | Current state |
| --- | --- |
| Framework | Next.js 16.3.6 using the App Router |
| UI runtime | React 19.2.8 and React DOM 19.2.8 |
| Language | TypeScript 5 with `strict: true`, `noEmit: true`, `moduleResolution: bundler` |
| Styling | Global CSS, CSS Modules, and inline React styles on `/pedido` |
| Linting | ESLint 9 with `eslint-config-next` core web vitals and TypeScript presets |
| Package manager | npm with a committed lockfile |
| Runtime commands | `dev`, `build`, `start`, and `lint` |
| Backend | None |
| Persistence | None; all application data is local/mock data |
| Authentication | None |
| Tests | No test framework, test files, or test scripts |

No Tailwind, component library, ORM, Supabase package, HTTP client, schema validator, state-management library, or observability package is installed.

The local Next.js 16.3.6 documentation was consulted during this audit, especially the App Router project structure, layouts/pages, Server/Client Component boundaries, and data-security guidance.

## Repository Structure

```text
farta/
├── context/                         # Product, specification, visual, and prompt documents
└── prostock-web/
    ├── public/                      # Default create-next-app SVG assets
    ├── src/
    │   └── app/
    │       ├── layout.tsx           # Root layout and metadata
    │       ├── globals.css          # Reset and global body styles
    │       ├── page.tsx             # Customer dashboard
    │       ├── page.module.css
    │       ├── catalogo/
    │       │   ├── page.tsx         # Product catalog and local cart
    │       │   └── catalogo.module.css
    │       ├── pedido/
    │       │   └── page.tsx         # Static order review/confirmation
    │       └── pedidos/
    │           ├── page.tsx         # Local order listing
    │           └── pedidos.module.css
    ├── AGENTS.md
    ├── README.md
    ├── eslint.config.mjs
    ├── next.config.ts
    ├── package.json
    ├── package-lock.json
    └── tsconfig.json
```

The application has no `components`, `modules`, `lib`, `types`, `supabase`, or test directories. It also has no route handlers, Server Actions, proxy/middleware, loading boundaries, error boundaries, custom not-found page, environment example, CI configuration, or architecture documentation apart from this audit.

The worktree was already dirty when the audit began. Existing user changes were preserved. At audit time, `src/app/globals.css`, `layout.tsx`, `page.module.css`, and `page.tsx` were modified, while the `catalogo`, `pedido`, and `pedidos` route directories were untracked.

## Routes

| Route | File | Rendering boundary | Current purpose | Navigation status |
| --- | --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | Client Component | Customer operational dashboard | Public; only the Catalog navigation action changes route |
| `/catalogo` | `src/app/catalogo/page.tsx` | Client Component | Product search, catalog cards, and a local order summary | Public; links to `/` and `/pedido`; most module navigation is non-interactive text |
| `/pedido` | `src/app/pedido/page.tsx` | Client Component | Static order review and simulated confirmation | Public; not connected to the catalog cart state |
| `/pedidos` | `src/app/pedidos/page.tsx` | Client Component | Local order list with search and status filters | Public; links to `/`, `/catalogo`, and `/pedido` |

There are no dynamic routes for product, order, delivery, customer, or support identifiers. There are no API routes.

## Existing Screens

### Customer dashboard (`/`)

- Greeting, global-looking navigation, search input, and a repeat-order action.
- Mock order progress for `PED-1048`.
- Local metrics, stock alerts, frequently purchased products, and category chips.
- Quantity controls and a floating cart summary backed by component state.
- Responsive rules for desktop, tablet, and mobile widths.

### Catalog (`/catalogo`)

- Text search over four mock products.
- Category chips, filter labels, and sort affordance.
- Product cards with brand, packaging, availability, delivery estimate, and price.
- Local cart summary and link to `/pedido`.
- Responsive grid rules.

### Order creation (`/pedido`)

- Static item table, replacement suggestion, delivery address, delivery-window buttons, notes field, and summary.
- Simulated confirmation using a local boolean.
- Styling is almost entirely inline and the screen has no dedicated responsive behavior.

### Orders (`/pedidos`)

- Summary indicators and five mock orders.
- Local search by order number and filter by status.
- Empty result state and simulated detail feedback.
- Responsive CSS is present, but the production build currently rejects parts of its CSS Module.

## Components

There is no shared component directory or reusable application shell.

- `Metric` and `Alert` are local helper components inside the dashboard page.
- Headers, brand marks, navigation, account controls, notices, buttons, status badges, and card patterns are duplicated across routes.
- The root layout only renders `children`; it does not provide shared navigation or authenticated layout boundaries.
- All pages declare `"use client"`, so static content and full page trees are included in client boundaries. There are no Server Components below the root layout and no small, isolated interactive client components.

## Domain Types

Only two page-local type definitions exist:

- `Product` in the dashboard: `name`, `detail`, `price`, `status`, and `quantity`.
- `Order` and `OrderStatus` in `/pedidos`: identifier, display date, unit count, total, status, and delivery text.

These are view models, not domain models. There are no shared identities, money types, SKU types, company ownership, address types, inventory movements, order items, status-transition rules, delivery types, support types, permissions, or repository contracts.

Status values are display strings in Portuguese. Prices are JavaScript `number` values. Dates and delivery estimates are display strings rather than typed timestamps or value objects.

## Mock Data

Mock data is embedded directly in Client Components:

- Dashboard: three products, one in-progress order, metrics, alerts, categories, and suggestion copy.
- Catalog: four products and an initial two-line cart.
- Order creation: three static item rows, fixed totals, fixed company/address, and fixed delivery windows.
- Orders: five static orders with local totals and statuses.

The same concepts are duplicated with no shared source of truth. Product names, prices, availability, quantities, order totals, and delivery information can diverge between screens. Cart state is isolated per page and is lost on navigation or refresh.

## Implemented Features

The following are implemented as frontend behavior only:

- App Router route rendering for four public routes.
- Basic responsive dashboard, catalog, and order-list layouts.
- Dashboard quantity changes, notices, repeat-order reset, and cart summary.
- Catalog text search and local add/clear-cart behavior.
- Orders search, status filtering, empty state, and detail notice.
- Order confirmation success feedback on `/pedido`.
- Basic Portuguese metadata and `lang="pt-BR"` on the root document.
- Currency formatting with the `pt-BR` locale in most calculated displays.

## Partial Features

| Feature | Current limitation |
| --- | --- |
| Navigation | Headers differ by route; several items are spans or simulated notices. The dashboard does not navigate to `/pedidos`. |
| Catalog search | Filters only local mock data and has no server query, pagination, category behavior, or error/loading state. |
| Category filter | Changes the selected chip but does not filter products. |
| Advanced filters and ordering | Visual affordances only. |
| Cart | Local state only, duplicated between pages, with no durable identifier or server validation. |
| Order creation | Static data is unrelated to the catalog cart; quantity, price, stock, address, and totals are not validated. |
| Order confirmation | Changes local text only; no order is created, stock reserved, status recorded, or audit event written. |
| Order tracking | Status and delivery estimates are mock display values with no state machine or history. |
| Stock alerts | Visual/simulated; there is no inventory balance or movement ledger. |
| Responsive behavior | Present on three screens, incomplete on `/pedido`, and not verified through automated or visual regression tests. |
| Accessibility | Some labels and semantic elements exist, but focus states, keyboard flows, form semantics, announcements, contrast, and table behavior have not been systematically validated. |

## Missing Features

- Supabase PostgreSQL, Auth, Storage, CLI configuration, migrations, seed data, generated database types, and local/remote environments.
- Authentication, logout, password recovery/reset, session validation, route protection, roles, permissions, and profiles.
- Company/customer ownership and multi-tenant isolation.
- Application services, domain modules, repository interfaces, and infrastructure adapters.
- Server Components for data reads, Server Actions/Route Handlers for mutations, and server-side validation.
- Categories, normalized products, variants/SKUs, product images, historical prices, and favorites.
- Inventory locations, balances, movement history, reservations, releases, sales, returns, adjustments, and concurrency controls.
- Persisted orders, order items with captured purchase prices, totals, status history, cancellation, and a transition state machine.
- Atomic order creation and stock-reservation behavior.
- Deliveries, stops, driver assignments, delivery histories, occurrences, and proof of delivery.
- Support tickets, messages, priorities, assignment, and closure.
- Internal operation and platform-administration experiences.
- Notifications, audit logs, analytics, logging, monitoring, and rate limiting.
- Unit, integration, RLS, authorization, security, end-to-end, accessibility, and visual tests.
- CI/CD, deployment documentation, migration workflow, rollback, backup strategy, and `.env.example`.

## Technical Debt

### Critical

- `npm.cmd run build` fails. `src/app/pedidos/pedidos.module.css` uses global selectors such as `table`, `th`, `td`, `td strong`, `td small`, and `td b`; Next.js 16 rejects them as impure CSS Module selectors.
- Business actions are UI simulations with no persistence, server validation, transactions, or authorization.

### High

- Domain data and calculations are duplicated across pages.
- Every page is a Client Component, producing unnecessarily broad client boundaries and no safe server data-access layer.
- Cart and order state are disconnected; `/pedido` cannot represent the actual selections made in `/catalogo`.
- The application has no automated test baseline.

### Medium

- Navigation and headers are duplicated and inconsistent.
- `/pedido` is a single dense JSX line with inline styles, limiting maintainability, reuse, and responsive control.
- CSS Modules are minified into single lines, making review and maintenance harder.
- There are no route-level loading, error, or not-found states.
- The existing UI uses a green visual system (`#007b52` and related tones), while the approved visual guide and master prompt specify blue/cyan tokens and Inter. This decision must be reconciled before a design-system refactor.
- The UI frequently uses text glyphs/emoji as icons rather than a consistent accessible icon strategy.

### Low

- `README.md` is still the create-next-app template and references files/fonts no longer used.
- Default `public` assets appear unused.
- There is no dedicated `typecheck` script.
- `allowJs: true` and `skipLibCheck: true` should be consciously reviewed once the foundation is stable; they are not current blockers.
- `next.config.ts` contains no application configuration.

## UX Issues

- Users can encounter controls that look operational but only show a notice or do nothing.
- Main navigation structure and active states vary among screens.
- There is no authenticated/profile-aware navigation for CUSTOMER, INTERNAL_OPERATOR, DRIVER, or PLATFORM_ADMIN.
- Catalog filtering does not match the visible controls, and no-result feedback exists only on `/pedidos`.
- Loading, failure, disabled, retry, optimistic, and durable success states are absent.
- The catalog-to-cart-to-order journey is not continuous.
- Order details do not have a dedicated view; the current detail action only displays a notice.
- `/pedido` lacks a mobile layout and uses buttons without implemented selection/state behavior for address, delivery window, or substitution.
- Color is sometimes paired with text, but status semantics and focus/keyboard behavior have not been consistently designed or tested.
- The current font is Arial/Helvetica rather than the approved Inter direction.

## Security Status

Security is effectively unimplemented because the application has no real users, backend, or protected data yet.

- All four routes are public.
- There is no authentication, session handling, RBAC, server-side authorization, tenant context, RLS, audit trail, or protected mutation.
- There is no defense to test against IDOR, cross-tenant access, privilege escalation, or unauthorized administrative actions because no resource endpoints exist.
- Client-side UI state must not be treated as an authorization boundary when backend work starts.
- There is no server-side validation. Current inputs only affect local display state.
- No secrets, environment files, `process.env` access, HTTP calls, tokens, service-role keys, or obvious credentials were found in application code.
- No uploads exist, so MIME, size, ownership, bucket, and Storage-policy controls are also absent.

The future implementation must derive `company_id` and role from a verified server-side session, authorize every mutation, keep privileged credentials server-only, minimize data returned to Client Components, and enforce tenant isolation with tested RLS policies.

## Backend Integration Points

| UI area | Required boundary | Initial contracts to define |
| --- | --- | --- |
| Session and profile | Server-side auth/session service | Current user, role, company, status, logout |
| Dashboard | Query application services | Active orders, alerts, metrics, frequent products, notifications |
| Catalog | Catalog query service and repository | Search, filters, pagination, category, SKU, price, availability, image |
| Cart | Cart/order-draft application service | Add, remove, set quantity, recalculate, validate current price |
| Order confirmation | Transactional order service | Validate tenant/address/price/stock, create order/items, reserve stock, append histories |
| Orders list/detail | Order query repository | Tenant-scoped list, filters, pagination, details, immutable captured prices, status history |
| Inventory | Inventory service and repository | Balances, movements, reservations, atomic adjustment/release/sale operations |
| Delivery | Delivery service and repository | Assignment, authorized driver view, status transitions, occurrences, proof |
| Support | Support service and repository | Ticket creation, tenant-scoped messages, assignment, priority, closure |

React components must consume DTOs and application actions rather than Supabase clients or database records directly. Repository interfaces belong outside infrastructure; Supabase implementations should satisfy those contracts so a future HTTP repository can replace them without rewriting domain/application code.

## Recommended Migration Sequence

1. **DOMAIN-001 — Domain model.** Define bounded modules, shared language, entities, value objects, invariants, use cases, status/state machines, and repository contracts. Prioritize Company/Profile, Catalog/SKU/Price, Inventory/Movement/Reservation, Order/Item/History, Delivery, and Support.
2. **DATA-001 — Data architecture.** Translate the approved domain model into a PostgreSQL/Supabase model with PKs, FKs, cardinalities, constraints, unique rules, indexes, timestamps, histories, tenant ownership, and explicit deletion policy. Do not create migrations until this review is complete.
3. **SECURITY-001 — Security model.** Define authentication, roles/permissions, trusted tenant derivation, RLS matrix, Storage policies, secrets, privileged operations, sessions, and audit requirements. Include negative cross-tenant and IDOR scenarios.
4. **ADR-001 — Supabase backend decision.** Record Supabase PostgreSQL/Auth/Storage, Next.js application layer, rejected separate-backend alternative, consequences, and future extraction criteria.
5. **SUPABASE-001 — Foundation.** Only after the preceding documents are approved: add CLI/configuration, browser/server clients, environment contract, versioned migrations, seed, initial RLS, generated types, and local validation.
6. **AUTH-001 and Customer/Company vertical slice.** Establish verified sessions and tenant context before exposing real business data.
7. **CATALOG-001 vertical slice.** Introduce real categories/products/variants/prices/images behind repository and application-service contracts, connect the existing UI, verify equivalence, then remove only the superseded catalog mocks.
8. Continue in dependency order: Inventory → Orders → Order/Stock consistency → Delivery → Support → Administration → Hardening.

Each vertical slice should preserve working mocks until its real path passes relevant unit, integration, RLS, authorization, and end-to-end checks.

## Quality Baseline

| Check | Result |
| --- | --- |
| `npm.cmd run lint` | PASS — exit code 0, no warnings or errors reported |
| `npm.cmd run build` | FAIL — exit code 1, six CSS Module purity errors in `src/app/pedidos/pedidos.module.css` |
| Typecheck | No separate script exists; the production build did not reach a successful completion |
| Automated tests | Not available |
| Git inspection | Completed; pre-existing modifications and untracked routes were preserved |

The application must not be treated as releasable while the production build is failing.

## Proposed Next Tasks

### DOMAIN-001

- **Owner:** PRODUCT-DOMAIN
- **Reviewers:** SOFTWARE-ARCHITECT, DATABASE-ARCHITECT
- **Output:** `docs/domain/domain-model.md`
- **Scope:** real entities, ownership, invariants, states, transitions, and use cases for the priority Catalog → Product → Cart → Order → Price/Stock validation → Reservation → Confirmation → Picking → Dispatch → Delivery flow.
- **Key constraint:** distinguish customer-side stock visibility from the distributor's authoritative inventory and do not invent unresolved commercial rules.

### DATA-001

- **Owner:** DATABASE-ARCHITECT
- **Reviewers:** PRODUCT-DOMAIN, SOFTWARE-ARCHITECT, SECURITY
- **Output:** `docs/architecture/data-model.md`
- **Dependency:** starts from the reviewed DOMAIN-001 model; migrations remain blocked until the model is approved.
- **Scope:** tenant-aware relational model, constraints, histories, indexes, concurrency boundaries, RLS ownership inputs, and reproducible seed strategy.

Potential human decisions discovered by the audit should be raised during DOMAIN-001, especially the authoritative meaning of stock shown to customers, the order-confirmation/reservation moment, reservation expiry, cancellation rules, delivery-window commitment, and whether the newly approved blue/cyan visual direction supersedes the current green implementation.
