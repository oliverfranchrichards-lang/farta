create sequence public.order_number_seq;

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_type text not null default 'DISTRIBUTION_CENTER',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null default nextval('public.order_number_seq') unique,
  company_id uuid not null references public.companies(id) on delete restrict,
  establishment_id uuid not null,
  created_by_profile_id uuid not null,
  cart_id uuid not null,
  inventory_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'PICKING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'RECEIPT_CONFIRMED', 'CANCELLED')),
  requested_window jsonb,
  confirmed_window jsonb,
  address_snapshot jsonb not null,
  currency_code char(3) not null default 'BRL',
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  delivery_fee_minor bigint not null default 0 check (delivery_fee_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (id, company_id),
  unique (id, inventory_location_id),
  unique (id, company_id, inventory_location_id),
  unique (cart_id),
  foreign key (establishment_id, company_id) references public.establishments(id, company_id) on delete restrict,
  foreign key (created_by_profile_id, company_id) references public.profiles(id, company_id) on delete restrict,
  foreign key (cart_id, company_id) references public.carts(id, company_id) on delete restrict,
  check (total_minor = subtotal_minor + delivery_fee_minor)
);
create index orders_company_created_idx on public.orders (company_id, created_at desc);
create index orders_company_status_created_idx on public.orders (company_id, status, created_at desc);
create index orders_location_status_idx on public.orders (inventory_location_id, status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  sku_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  sku_name_snapshot text not null,
  sale_unit_snapshot text not null,
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  currency_code char(3) not null default 'BRL',
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, sku_id),
  unique (id, order_id, sku_id),
  check (subtotal_minor = quantity * unit_price_minor)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  from_status text,
  to_status text not null,
  changed_by_profile_id uuid references public.profiles(id) on delete restrict,
  reason text,
  correlation_id uuid,
  changed_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, changed_at);

create table public.inventory_balances (
  inventory_location_id uuid not null references public.inventory_locations(id) on delete restrict,
  sku_id uuid not null references public.product_variants(id) on delete restrict,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= on_hand),
  updated_at timestamptz not null default now(),
  primary key (inventory_location_id, sku_id)
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  order_item_id uuid not null,
  inventory_location_id uuid not null,
  sku_id uuid not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CONSUMED', 'RELEASED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id),
  unique (id, order_id, inventory_location_id, sku_id),
  foreign key (order_id, inventory_location_id) references public.orders(id, inventory_location_id) on delete restrict,
  foreign key (order_item_id, order_id, sku_id) references public.order_items(id, order_id, sku_id) on delete restrict,
  foreign key (inventory_location_id, sku_id) references public.inventory_balances(inventory_location_id, sku_id) on delete restrict
);
create index inventory_reservations_status_idx on public.inventory_reservations (inventory_location_id, sku_id, status);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_location_id uuid not null,
  sku_id uuid not null,
  order_id uuid,
  order_item_id uuid,
  reservation_id uuid,
  movement_type text not null check (movement_type in ('RECEIPT', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'CONSUMPTION', 'RETURN', 'SALE')),
  on_hand_delta integer not null,
  reserved_delta integer not null,
  on_hand_before integer not null check (on_hand_before >= 0),
  on_hand_after integer not null check (on_hand_after >= 0),
  reserved_before integer not null check (reserved_before >= 0),
  reserved_after integer not null check (reserved_after >= 0),
  adjustment_reference text,
  reason text,
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  idempotency_key text,
  occurred_at timestamptz not null default now(),
  foreign key (inventory_location_id, sku_id) references public.inventory_balances(inventory_location_id, sku_id) on delete restrict,
  foreign key (order_id, inventory_location_id) references public.orders(id, inventory_location_id) on delete restrict,
  foreign key (order_item_id, order_id, sku_id) references public.order_items(id, order_id, sku_id) on delete restrict,
  foreign key (reservation_id) references public.inventory_reservations(id) on delete restrict,
  check (on_hand_after = on_hand_before + on_hand_delta),
  check (reserved_after = reserved_before + reserved_delta),
  check (
    (reservation_id is not null and order_id is not null and order_item_id is not null and adjustment_reference is null)
    or (reservation_id is null and order_id is not null and adjustment_reference is null)
    or (reservation_id is null and order_id is null and order_item_id is null and adjustment_reference is not null)
  )
);
create index inventory_movements_sku_idx on public.inventory_movements (inventory_location_id, sku_id, occurred_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);
create index inventory_movements_reservation_idx on public.inventory_movements (reservation_id);

alter table public.inventory_locations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.inventory_movements enable row level security;

create policy inventory_locations_authenticated_read on public.inventory_locations for select using (auth.uid() is not null and status = 'ACTIVE');
create policy orders_member_read on public.orders for select using (public.has_active_membership(company_id));
create policy order_items_member_read on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.has_active_membership(o.company_id))
);
create policy order_history_member_read on public.order_status_history for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.has_active_membership(o.company_id))
);
create policy inventory_balances_authenticated_read on public.inventory_balances for select using (auth.uid() is not null);
create policy reservations_member_read on public.inventory_reservations for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.has_active_membership(o.company_id))
);
create policy movements_member_read on public.inventory_movements for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.has_active_membership(o.company_id))
  or (order_id is null and auth.uid() is not null)
);
