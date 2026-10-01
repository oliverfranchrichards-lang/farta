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
  v_subtotal bigint;
begin
  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then
    raise exception 'ACTIVE_PROFILE_REQUIRED';
  end if;

  select c.* into v_cart
  from public.carts c
  where c.status = 'ACTIVE'
    and c.company_id = v_profile.company_id
    and (p_cart_id is null or c.id = p_cart_id)
  order by c.updated_at desc
  limit 1;
  if v_cart.id is null then
    raise exception 'ACTIVE_CART_NOT_FOUND';
  end if;

  select il.id into v_inventory_location
  from public.inventory_locations il
  where il.status = 'ACTIVE'
  order by il.created_at
  limit 1;
  if v_inventory_location is null then
    raise exception 'INVENTORY_LOCATION_NOT_FOUND';
  end if;

  select coalesce(sum(coalesce(ci.displayed_unit_price_minor, price.amount_minor) * ci.quantity), 0)
    into v_subtotal
  from public.cart_items ci
  join public.product_variants pv on pv.id = ci.sku_id and pv.status = 'ACTIVE'
  left join lateral (
    select p.amount_minor
    from public.prices p
    where p.company_id = v_cart.company_id
      and p.sku_id = ci.sku_id
      and p.status = 'ACTIVE'
      and p.valid_from <= now()
      and (p.valid_until is null or p.valid_until > now())
    order by p.valid_from desc
    limit 1
  ) price on true
  where ci.cart_id = v_cart.id;

  if v_subtotal = 0 or not exists (select 1 from public.cart_items where cart_id = v_cart.id) then
    raise exception 'CART_EMPTY';
  end if;

  insert into public.orders (
    company_id, establishment_id, created_by_profile_id, cart_id,
    inventory_location_id, status, requested_window, confirmed_window,
    address_snapshot, subtotal_minor, total_minor
  ) values (
    v_cart.company_id, v_cart.establishment_id, v_profile.id, v_cart.id,
    v_inventory_location, 'CONFIRMED', p_confirmed_window, p_confirmed_window,
    p_address_snapshot, v_subtotal, v_subtotal
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id, sku_id, quantity, sku_name_snapshot, sale_unit_snapshot,
    unit_price_minor, subtotal_minor
  )
  select v_order_id, ci.sku_id, ci.quantity, pv.name, pv.sale_unit,
    coalesce(ci.displayed_unit_price_minor, price.amount_minor),
    coalesce(ci.displayed_unit_price_minor, price.amount_minor) * ci.quantity
  from public.cart_items ci
  join public.product_variants pv on pv.id = ci.sku_id and pv.status = 'ACTIVE'
  left join lateral (
    select p.amount_minor
    from public.prices p
    where p.company_id = v_cart.company_id
      and p.sku_id = ci.sku_id
      and p.status = 'ACTIVE'
      and p.valid_from <= now()
      and (p.valid_until is null or p.valid_until > now())
    order by p.valid_from desc
    limit 1
  ) price on true
  where ci.cart_id = v_cart.id;

  update public.carts set status = 'CONVERTED', version = version + 1, updated_at = now() where id = v_cart.id;

  return query select o.id, o.order_number from public.orders o where o.id = v_order_id;
end;
$$;

revoke all on function public.confirm_active_cart(uuid, jsonb, jsonb) from public;
grant execute on function public.confirm_active_cart(uuid, jsonb, jsonb) to authenticated;
