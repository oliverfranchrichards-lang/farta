-- ORDER-REVIEW-001
-- Additive review/pricing flow. Legacy CONFIRMED orders keep their meaning.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'SUBMITTED_FOR_REVIEW', 'PRICED_AWAITING_CUSTOMER_CONFIRMATION', 'CUSTOMER_CONFIRMED',
  'CONFIRMED', 'PICKING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED',
  'RECEIPT_CONFIRMED', 'CANCELLED'
));

alter table public.orders
  add column if not exists approximate_subtotal_minor bigint,
  add column if not exists approximate_total_minor bigint,
  add column if not exists final_subtotal_minor bigint,
  add column if not exists final_total_minor bigint,
  add column if not exists submitted_for_review_at timestamptz,
  add column if not exists final_confirmed_at timestamptz;

update public.orders
set approximate_subtotal_minor = coalesce(approximate_subtotal_minor, subtotal_minor),
    approximate_total_minor = coalesce(approximate_total_minor, total_minor),
    final_subtotal_minor = coalesce(final_subtotal_minor, subtotal_minor),
    final_total_minor = coalesce(final_total_minor, total_minor)
where approximate_subtotal_minor is null
   or approximate_total_minor is null
   or final_subtotal_minor is null
   or final_total_minor is null;

alter table public.orders
  add constraint orders_approximate_total_check check (approximate_subtotal_minor is null or approximate_subtotal_minor >= 0),
  add constraint orders_approximate_total_delivery_check check (approximate_total_minor is null or approximate_total_minor = approximate_subtotal_minor + delivery_fee_minor),
  add constraint orders_final_total_check check (final_subtotal_minor is null or final_subtotal_minor >= 0),
  add constraint orders_final_total_delivery_check check (final_total_minor is null or final_total_minor = final_subtotal_minor + delivery_fee_minor);

alter table public.order_items
  add column if not exists approximate_unit_price_minor bigint,
  add column if not exists approximate_subtotal_minor bigint,
  add column if not exists final_unit_price_minor bigint,
  add column if not exists final_subtotal_minor bigint;

update public.order_items
set approximate_unit_price_minor = coalesce(approximate_unit_price_minor, unit_price_minor),
    approximate_subtotal_minor = coalesce(approximate_subtotal_minor, subtotal_minor),
    final_unit_price_minor = coalesce(final_unit_price_minor, unit_price_minor),
    final_subtotal_minor = coalesce(final_subtotal_minor, subtotal_minor)
where approximate_unit_price_minor is null
   or approximate_subtotal_minor is null
   or final_unit_price_minor is null
   or final_subtotal_minor is null;

alter table public.order_items
  add constraint order_items_approximate_price_check check (approximate_unit_price_minor is null or approximate_unit_price_minor >= 0),
  add constraint order_items_approximate_subtotal_check check (approximate_subtotal_minor is null or approximate_subtotal_minor = quantity * approximate_unit_price_minor),
  add constraint order_items_final_price_check check (final_unit_price_minor is null or final_unit_price_minor >= 0),
  add constraint order_items_final_subtotal_check check (final_subtotal_minor is null or final_subtotal_minor = quantity * final_unit_price_minor);

create table if not exists public.order_price_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  approximate_unit_price_minor bigint not null check (approximate_unit_price_minor >= 0),
  previous_final_unit_price_minor bigint,
  final_unit_price_minor bigint not null check (final_unit_price_minor >= 0),
  changed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  correlation_id uuid,
  changed_at timestamptz not null default now()
);
create index if not exists order_price_history_order_idx on public.order_price_history(order_id, changed_at desc);
alter table public.order_price_history enable row level security;
create policy order_price_history_member_read on public.order_price_history for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.has_active_membership(o.company_id))
);

create or replace function public.submit_order_for_review(
  p_cart_id uuid,
  p_address_id uuid,
  p_window_label text,
  p_idempotency_key text default null
)
returns table (order_id uuid, order_number bigint)
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype; v_cart public.carts%rowtype; v_address public.addresses%rowtype;
  v_snapshot jsonb; v_order_id uuid; v_order_number bigint; v_subtotal bigint := 0; v_item record;
begin
  if p_cart_id is null or p_address_id is null then raise exception 'ADDRESS_REQUIRED'; end if;
  if p_window_label is null or nullif(btrim(p_window_label), '') is null or length(btrim(p_window_label)) > 80 then raise exception 'INVALID_DELIVERY_WINDOW'; end if;
  select * into v_profile from public.profiles p where p.id = auth.uid() and p.role = 'CUSTOMER' and p.status = 'ACTIVE' for share;
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'ACTIVE_MEMBERSHIP_REQUIRED'; end if;
  select * into v_cart from public.carts c where c.id = p_cart_id and c.company_id = v_profile.company_id for update;
  if v_cart.id is null then raise exception 'ACTIVE_CART_NOT_FOUND'; end if;
  if v_cart.status = 'CONVERTED' then
    return query select o.id, o.order_number from public.orders o where o.cart_id = v_cart.id and o.company_id = v_profile.company_id; return;
  end if;
  if v_cart.status <> 'ACTIVE' then raise exception 'ACTIVE_CART_NOT_FOUND'; end if;
  select * into v_address from public.addresses a where a.id = p_address_id and a.establishment_id = v_cart.establishment_id and a.status = 'ACTIVE';
  if v_address.id is null then raise exception 'ADDRESS_NOT_AVAILABLE'; end if;
  v_snapshot := jsonb_build_object('address_id', v_address.id, 'label', v_address.label, 'address_line', v_address.address_line, 'address_number', v_address.address_number, 'address_complement', v_address.address_complement, 'district', v_address.district, 'city', v_address.city, 'state', v_address.state, 'postal_code', v_address.postal_code);
  if not exists (select 1 from public.cart_items ci where ci.cart_id = v_cart.id) then raise exception 'CART_EMPTY'; end if;
  for v_item in
    select ci.sku_id, ci.quantity, pv.name, pv.sale_unit, pv.minimum_quantity, pr.amount_minor as unit_price
    from public.cart_items ci join public.product_variants pv on pv.id = ci.sku_id and pv.status = 'ACTIVE'
    join public.products p on p.id = pv.product_id and p.status = 'ACTIVE'
    left join lateral (select p2.amount_minor from public.prices p2 where p2.company_id = v_cart.company_id and p2.sku_id = ci.sku_id and p2.status = 'ACTIVE' and p2.valid_from <= now() and (p2.valid_until is null or p2.valid_until > now()) order by p2.valid_from desc limit 1) pr on true
    where ci.cart_id = v_cart.id
  loop
    if v_item.unit_price is null then raise exception 'PRICE_UNAVAILABLE:%', v_item.sku_id; end if;
    if v_item.quantity < v_item.minimum_quantity then raise exception 'MINIMUM_QUANTITY_NOT_MET:%', v_item.minimum_quantity; end if;
    v_subtotal := v_subtotal + v_item.unit_price * v_item.quantity;
  end loop;
  insert into public.orders (company_id, establishment_id, created_by_profile_id, cart_id, inventory_location_id, status, requested_window, confirmed_window, address_snapshot, subtotal_minor, total_minor, approximate_subtotal_minor, approximate_total_minor, submitted_for_review_at)
  values (v_cart.company_id, v_cart.establishment_id, v_profile.id, v_cart.id, (select il.id from public.inventory_locations il where il.status = 'ACTIVE' order by il.created_at limit 1), 'SUBMITTED_FOR_REVIEW', jsonb_build_object('label', p_window_label), jsonb_build_object('label', p_window_label), v_snapshot, v_subtotal, v_subtotal, v_subtotal, v_subtotal, now())
  returning id, order_number into v_order_id, v_order_number;
  if v_order_id is null then raise exception 'INVENTORY_LOCATION_NOT_FOUND'; end if;
  for v_item in
    select ci.sku_id, ci.quantity, pv.name, pv.sale_unit, pv.minimum_quantity, pr.amount_minor as unit_price
    from public.cart_items ci join public.product_variants pv on pv.id = ci.sku_id
    left join lateral (select p2.amount_minor from public.prices p2 where p2.company_id = v_cart.company_id and p2.sku_id = ci.sku_id and p2.status = 'ACTIVE' and p2.valid_from <= now() and (p2.valid_until is null or p2.valid_until > now()) order by p2.valid_from desc limit 1) pr on true
    where ci.cart_id = v_cart.id
  loop
    insert into public.order_items (order_id, sku_id, quantity, sku_name_snapshot, sale_unit_snapshot, unit_price_minor, subtotal_minor, minimum_quantity_snapshot, approximate_unit_price_minor, approximate_subtotal_minor)
    values (v_order_id, v_item.sku_id, v_item.quantity, v_item.name, v_item.sale_unit, v_item.unit_price, v_item.unit_price * v_item.quantity, v_item.minimum_quantity, v_item.unit_price, v_item.unit_price * v_item.quantity);
  end loop;
  insert into public.order_status_history(order_id, to_status, changed_by_profile_id, reason) values (v_order_id, 'SUBMITTED_FOR_REVIEW', v_profile.id, 'Order submitted for price review');
  insert into public.audit_logs(actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (v_profile.id, v_profile.role, v_profile.company_id, 'ORDER_SUBMITTED_FOR_REVIEW', 'order', v_order_id, 'SUCCESS', jsonb_build_object('idempotency_key', p_idempotency_key));
  update public.carts set status = 'CONVERTED', version = version + 1, updated_at = now() where id = v_cart.id;
  return query select v_order_id, v_order_number;
end; $$;

create or replace function public.set_order_final_prices(
  p_order_id uuid,
  p_items jsonb,
  p_reason text default null,
  p_idempotency_key text default null
)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_actor public.profiles%rowtype; v_order public.orders%rowtype; v_item record; v_price bigint; v_subtotal bigint := 0; v_count integer := 0;
begin
  select * into v_actor from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' for share;
  if v_actor.id is null or v_actor.role not in ('INTERNAL_OPERATOR','PLATFORM_ADMIN') then raise exception 'FORBIDDEN'; end if;
  if v_actor.role <> 'PLATFORM_ADMIN' and (v_actor.company_id is null or not public.has_active_membership(v_actor.company_id)) then raise exception 'FORBIDDEN'; end if;
  select * into v_order from public.orders o where o.id = p_order_id for update;
  if v_order.id is null or (v_actor.role <> 'PLATFORM_ADMIN' and v_order.company_id <> v_actor.company_id) then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = 'PRICED_AWAITING_CUSTOMER_CONFIRMATION' then return true; end if;
  if v_order.status <> 'SUBMITTED_FOR_REVIEW' then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'INVALID_FINAL_PRICE'; end if;
  for v_item in select oi.* from public.order_items oi where oi.order_id = p_order_id for update loop
    select x.unit_price_minor into v_price from jsonb_to_recordset(p_items) x(sku_id uuid, unit_price_minor bigint) where x.sku_id = v_item.sku_id;
    if v_price is null or v_price < 0 then raise exception 'INVALID_FINAL_PRICE:%', v_item.sku_id; end if;
    update public.order_items set final_unit_price_minor = v_price, final_subtotal_minor = v_price * quantity where id = v_item.id;
    insert into public.order_price_history(order_id, order_item_id, approximate_unit_price_minor, previous_final_unit_price_minor, final_unit_price_minor, changed_by_profile_id, reason)
    values (p_order_id, v_item.id, coalesce(v_item.approximate_unit_price_minor, v_item.unit_price_minor), v_item.final_unit_price_minor, v_price, auth.uid(), nullif(trim(p_reason),''));
    v_subtotal := v_subtotal + v_price * v_item.quantity; v_count := v_count + 1;
  end loop;
  if v_count = 0 then raise exception 'CART_EMPTY'; end if;
  update public.orders set status = 'PRICED_AWAITING_CUSTOMER_CONFIRMATION', final_subtotal_minor = v_subtotal, final_total_minor = v_subtotal + delivery_fee_minor, updated_at = now() where id = p_order_id;
  insert into public.order_status_history(order_id, from_status, to_status, changed_by_profile_id, reason) values (p_order_id, 'SUBMITTED_FOR_REVIEW', 'PRICED_AWAITING_CUSTOMER_CONFIRMATION', auth.uid(), 'Final prices defined');
  insert into public.audit_logs(actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), v_actor.role, v_order.company_id, 'ORDER_FINAL_PRICES_DEFINED', 'order', p_order_id, 'SUCCESS', jsonb_build_object('idempotency_key', p_idempotency_key));
  return true;
end; $$;

create or replace function public.confirm_final_order_price(p_order_id uuid, p_idempotency_key text default null)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_customer public.profiles%rowtype; v_order public.orders%rowtype; v_item record; v_balance public.inventory_balances%rowtype; v_reservation_id uuid; v_reserved_before integer;
begin
  select * into v_customer from public.profiles p where p.id = auth.uid() and p.role = 'CUSTOMER' and p.status = 'ACTIVE' for share;
  if v_customer.id is null or v_customer.company_id is null or not public.has_active_membership(v_customer.company_id) then raise exception 'FORBIDDEN'; end if;
  select * into v_order from public.orders o where o.id = p_order_id and o.company_id = v_customer.company_id for update;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = 'CUSTOMER_CONFIRMED' then return true; end if;
  if v_order.status <> 'PRICED_AWAITING_CUSTOMER_CONFIRMATION' then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  if exists (select 1 from public.order_items oi where oi.order_id = p_order_id and oi.final_unit_price_minor is null) then raise exception 'FINAL_PRICE_REQUIRED'; end if;
  for v_item in select oi.* from public.order_items oi where oi.order_id = p_order_id order by oi.sku_id for update loop
    select * into v_balance from public.inventory_balances b where b.inventory_location_id = v_order.inventory_location_id and b.sku_id = v_item.sku_id for update;
    if v_balance.sku_id is null or v_balance.on_hand - v_balance.reserved < v_item.quantity then raise exception 'INSUFFICIENT_STOCK:%', v_item.sku_id; end if;
    v_reserved_before := v_balance.reserved;
    update public.inventory_balances set reserved = reserved + v_item.quantity, updated_at = now() where inventory_location_id = v_order.inventory_location_id and sku_id = v_item.sku_id;
    insert into public.inventory_reservations(order_id, order_item_id, inventory_location_id, sku_id, quantity) values (p_order_id, v_item.id, v_order.inventory_location_id, v_item.sku_id, v_item.quantity) returning id into v_reservation_id;
    insert into public.inventory_movements(inventory_location_id, sku_id, order_id, order_item_id, reservation_id, movement_type, on_hand_delta, reserved_delta, on_hand_before, on_hand_after, reserved_before, reserved_after, reason)
    values (v_order.inventory_location_id, v_item.sku_id, p_order_id, v_item.id, v_reservation_id, 'RESERVATION', 0, v_item.quantity, v_balance.on_hand, v_balance.on_hand, v_reserved_before, v_reserved_before + v_item.quantity, 'Customer confirmed final price');
  end loop;
  update public.orders set status = 'CUSTOMER_CONFIRMED', subtotal_minor = coalesce(final_subtotal_minor, subtotal_minor), total_minor = coalesce(final_total_minor, total_minor), final_confirmed_at = now(), updated_at = now() where id = p_order_id;
  insert into public.deliveries(order_id, recipient_name, address_snapshot, delivery_window) values (p_order_id, v_customer.full_name, v_order.address_snapshot, v_order.confirmed_window);
  insert into public.order_status_history(order_id, from_status, to_status, changed_by_profile_id, reason) values (p_order_id, 'PRICED_AWAITING_CUSTOMER_CONFIRMATION', 'CUSTOMER_CONFIRMED', auth.uid(), 'Customer confirmed final price');
  insert into public.audit_logs(actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), v_customer.role, v_order.company_id, 'ORDER_CUSTOMER_CONFIRMED', 'order', p_order_id, 'SUCCESS', jsonb_build_object('idempotency_key', p_idempotency_key));
  return true;
end; $$;

-- Allow operational picking only after the new explicit customer confirmation;
-- legacy CONFIRMED remains supported for backward compatibility.
create or replace function public.advance_order_status(p_order_id uuid, p_to_status text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles%rowtype; v_from text; v_company_id uuid; v_delivery public.deliveries%rowtype; v_allowed boolean := false;
begin
  select * into v_profile from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' for share;
  if v_profile.id is null then raise exception 'FORBIDDEN'; end if;
  if v_profile.role <> 'PLATFORM_ADMIN' and (v_profile.company_id is null or not public.has_active_membership(v_profile.company_id)) then raise exception 'FORBIDDEN'; end if;
  select o.status, o.company_id into v_from, v_company_id from public.orders o where o.id = p_order_id for update;
  if v_from is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_to_status not in ('PICKING','READY_FOR_DISPATCH','DISPATCHED','DELIVERED','RECEIPT_CONFIRMED') then raise exception 'INVALID_ORDER_STATUS'; end if;
  select d.* into v_delivery from public.deliveries d where d.order_id = p_order_id for update;
  if v_profile.role = 'PLATFORM_ADMIN' then
    v_allowed := (v_from, p_to_status) in (('CONFIRMED','PICKING'), ('CUSTOMER_CONFIRMED','PICKING'), ('PICKING','READY_FOR_DISPATCH'), ('READY_FOR_DISPATCH','DISPATCHED'), ('DISPATCHED','DELIVERED'), ('DELIVERED','RECEIPT_CONFIRMED'));
  elsif v_profile.role = 'INTERNAL_OPERATOR' and v_profile.company_id = v_company_id then
    v_allowed := (v_from, p_to_status) in (('CONFIRMED','PICKING'), ('CUSTOMER_CONFIRMED','PICKING'), ('PICKING','READY_FOR_DISPATCH'), ('READY_FOR_DISPATCH','DISPATCHED'));
  elsif v_profile.role = 'DRIVER' and v_profile.company_id = v_company_id then
    v_allowed := v_from = 'DISPATCHED' and p_to_status = 'DELIVERED' and exists (select 1 from public.delivery_driver_assignments a where a.delivery_id = v_delivery.id and a.driver_profile_id = auth.uid() and a.unassigned_at is null);
  elsif v_profile.role = 'CUSTOMER' and v_profile.company_id = v_company_id then
    v_allowed := v_from = 'DELIVERED' and p_to_status = 'RECEIPT_CONFIRMED';
  end if;
  if p_to_status = 'DISPATCHED' and not exists (select 1 from public.delivery_driver_assignments a where a.delivery_id = v_delivery.id and a.unassigned_at is null) then raise exception 'DRIVER_ASSIGNMENT_REQUIRED'; end if;
  if not v_allowed then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  update public.orders set status = p_to_status, updated_at = now() where id = p_order_id;
  insert into public.order_status_history(order_id, from_status, to_status, changed_by_profile_id, reason) values (p_order_id, v_from, p_to_status, auth.uid(), 'Status advanced by authorized workflow actor');
  if p_to_status = 'DISPATCHED' and v_delivery.id is not null then update public.deliveries set status = 'IN_TRANSIT', updated_at = now() where id = v_delivery.id; end if;
  if p_to_status = 'DELIVERED' and v_delivery.id is not null then update public.deliveries set status = 'DELIVERED', delivered_at = now(), updated_at = now() where id = v_delivery.id; end if;
  insert into public.audit_logs(actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), v_profile.role, v_company_id, 'ORDER_STATUS_ADVANCED', 'order', p_order_id, 'SUCCESS', jsonb_build_object('from', v_from, 'to', p_to_status));
  return true;
end; $$;

revoke all on function public.submit_order_for_review(uuid, uuid, text, text) from public, anon;
grant execute on function public.submit_order_for_review(uuid, uuid, text, text) to authenticated;
revoke all on function public.set_order_final_prices(uuid, jsonb, text, text) from public, anon;
grant execute on function public.set_order_final_prices(uuid, jsonb, text, text) to authenticated;
revoke all on function public.confirm_final_order_price(uuid, text) from public, anon;
grant execute on function public.confirm_final_order_price(uuid, text) to authenticated;
revoke all on function public.advance_order_status(uuid, text) from public, anon;
grant execute on function public.advance_order_status(uuid, text) to authenticated;
