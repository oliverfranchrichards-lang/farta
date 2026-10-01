create or replace function public.confirm_active_cart(
  p_cart_id uuid default null,
  p_address_snapshot jsonb default '{}'::jsonb,
  p_confirmed_window jsonb default '{}'::jsonb
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_cart public.carts%rowtype;
  v_inventory_location uuid;
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal bigint := 0;
  v_item record;
  v_balance public.inventory_balances%rowtype;
  v_reserved_before integer;
begin
  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;

  if p_cart_id is not null then
    select o.id, o.order_number into v_order_id, v_order_number from public.orders o
    where o.cart_id = p_cart_id and o.company_id = v_profile.company_id;
    if v_order_id is not null then return query select v_order_id, v_order_number; return; end if;
  end if;

  select c.* into v_cart from public.carts c
  where c.status = 'ACTIVE' and c.company_id = v_profile.company_id
    and (p_cart_id is null or c.id = p_cart_id)
  order by c.updated_at desc limit 1;
  if v_cart.id is null then raise exception 'ACTIVE_CART_NOT_FOUND'; end if;

  select il.id into v_inventory_location from public.inventory_locations il
  where il.status = 'ACTIVE' order by il.created_at limit 1;
  if v_inventory_location is null then raise exception 'INVENTORY_LOCATION_NOT_FOUND'; end if;

  if not exists (select 1 from public.cart_items where cart_id = v_cart.id) then raise exception 'CART_EMPTY'; end if;

  for v_item in
    select ci.sku_id, ci.quantity, pv.name, pv.sale_unit,
      coalesce(ci.displayed_unit_price_minor, price.amount_minor) as unit_price
    from public.cart_items ci
    join public.product_variants pv on pv.id = ci.sku_id and pv.status = 'ACTIVE'
    left join lateral (
      select p.amount_minor from public.prices p
      where p.company_id = v_cart.company_id and p.sku_id = ci.sku_id and p.status = 'ACTIVE'
        and p.valid_from <= now() and (p.valid_until is null or p.valid_until > now())
      order by p.valid_from desc limit 1
    ) price on true
    where ci.cart_id = v_cart.id
  loop
    if v_item.unit_price is null then raise exception 'PRICE_UNAVAILABLE:%', v_item.sku_id; end if;
    v_subtotal := v_subtotal + v_item.unit_price * v_item.quantity;
    select * into v_balance from public.inventory_balances b
    where b.inventory_location_id = v_inventory_location and b.sku_id = v_item.sku_id for update;
    if v_balance.sku_id is null or v_balance.on_hand - v_balance.reserved < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_item.sku_id;
    end if;
  end loop;

  insert into public.orders (company_id, establishment_id, created_by_profile_id, cart_id, inventory_location_id, status, requested_window, confirmed_window, address_snapshot, subtotal_minor, total_minor)
  values (v_cart.company_id, v_cart.establishment_id, v_profile.id, v_cart.id, v_inventory_location, 'CONFIRMED', p_confirmed_window, p_confirmed_window, p_address_snapshot, v_subtotal, v_subtotal)
  returning public.orders.id, public.orders.order_number into v_order_id, v_order_number;

  for v_item in
    select ci.sku_id, ci.quantity, pv.name, pv.sale_unit,
      coalesce(ci.displayed_unit_price_minor, price.amount_minor) as unit_price
    from public.cart_items ci
    join public.product_variants pv on pv.id = ci.sku_id and pv.status = 'ACTIVE'
    left join lateral (
      select p.amount_minor from public.prices p where p.company_id = v_cart.company_id and p.sku_id = ci.sku_id and p.status = 'ACTIVE' and p.valid_from <= now() and (p.valid_until is null or p.valid_until > now()) order by p.valid_from desc limit 1
    ) price on true where ci.cart_id = v_cart.id
  loop
    insert into public.order_items (order_id, sku_id, quantity, sku_name_snapshot, sale_unit_snapshot, unit_price_minor, subtotal_minor)
    values (v_order_id, v_item.sku_id, v_item.quantity, v_item.name, v_item.sale_unit, v_item.unit_price, v_item.unit_price * v_item.quantity);
    select reserved into v_reserved_before from public.inventory_balances where inventory_location_id = v_inventory_location and sku_id = v_item.sku_id for update;
    update public.inventory_balances set reserved = reserved + v_item.quantity, updated_at = now() where inventory_location_id = v_inventory_location and sku_id = v_item.sku_id;
    insert into public.inventory_reservations (order_id, order_item_id, inventory_location_id, sku_id, quantity)
    select v_order_id, oi.id, v_inventory_location, v_item.sku_id, v_item.quantity from public.order_items oi where oi.order_id = v_order_id and oi.sku_id = v_item.sku_id;
    insert into public.inventory_movements (inventory_location_id, sku_id, order_id, order_item_id, reservation_id, movement_type, on_hand_delta, reserved_delta, on_hand_before, on_hand_after, reserved_before, reserved_after, reason)
    select v_inventory_location, v_item.sku_id, v_order_id, r.order_item_id, r.id, 'RESERVATION', 0, v_item.quantity, b.on_hand, b.on_hand, v_reserved_before, v_reserved_before + v_item.quantity, 'Order confirmation'
    from public.inventory_reservations r join public.inventory_balances b on b.inventory_location_id = v_inventory_location and b.sku_id = v_item.sku_id
    where r.order_id = v_order_id and r.sku_id = v_item.sku_id;
  end loop;

  insert into public.order_status_history (order_id, to_status, changed_by_profile_id, reason) values (v_order_id, 'CONFIRMED', v_profile.id, 'Order confirmed');
  insert into public.deliveries (order_id, recipient_name, address_snapshot, delivery_window) values (v_order_id, v_profile.full_name, p_address_snapshot, p_confirmed_window);
  update public.carts set status = 'CONVERTED', version = version + 1, updated_at = now() where id = v_cart.id;
  return query select v_order_id, v_order_number;
end;
$$;
