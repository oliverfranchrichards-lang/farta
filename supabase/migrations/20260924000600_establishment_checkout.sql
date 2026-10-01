create policy addresses_member_insert on public.addresses
for insert to authenticated
with check (
  exists (
    select 1 from public.establishments e
    where e.id = establishment_id and e.status = 'ACTIVE'
      and public.has_active_membership(e.company_id)
  )
);

create or replace function public.add_to_establishment_cart(
  p_establishment_id uuid,
  p_sku_id uuid,
  p_quantity integer default 1
)
returns table (cart_id uuid, quantity integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_cart public.carts%rowtype;
  v_price bigint;
begin
  if p_establishment_id is null or p_sku_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 9999 then
    raise exception 'INVALID_QUANTITY';
  end if;
  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'ACTIVE_MEMBERSHIP_REQUIRED'; end if;
  if not exists (
    select 1 from public.establishments e
    where e.id = p_establishment_id and e.company_id = v_profile.company_id and e.status = 'ACTIVE'
  ) then raise exception 'ESTABLISHMENT_NOT_AVAILABLE'; end if;
  if not exists (
    select 1 from public.product_variants pv where pv.id = p_sku_id and pv.status = 'ACTIVE'
  ) then raise exception 'SKU_NOT_AVAILABLE'; end if;
  select p.amount_minor into v_price from public.prices p
  where p.company_id = v_profile.company_id and p.sku_id = p_sku_id and p.status = 'ACTIVE'
    and p.valid_from <= now() and (p.valid_until is null or p.valid_until > now())
  order by p.valid_from desc limit 1;
  if v_price is null then raise exception 'PRICE_UNAVAILABLE'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_establishment_id::text, 0));
  select c.* into v_cart from public.carts c
  where c.company_id = v_profile.company_id and c.establishment_id = p_establishment_id and c.status = 'ACTIVE'
  for update;
  if v_cart.id is null then
    insert into public.carts (company_id, establishment_id, created_by_profile_id)
    values (v_profile.company_id, p_establishment_id, v_profile.id) returning * into v_cart;
  end if;
  if exists (
    select 1 from public.cart_items ci
    where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id and ci.quantity + p_quantity > 9999
  ) then raise exception 'INVALID_QUANTITY'; end if;
  insert into public.cart_items (cart_id, sku_id, quantity, displayed_unit_price_minor)
  values (v_cart.id, p_sku_id, p_quantity, v_price)
  on conflict (cart_id, sku_id) do update
    set quantity = cart_items.quantity + excluded.quantity,
        displayed_unit_price_minor = excluded.displayed_unit_price_minor,
        updated_at = now();
  update public.carts set version = version + 1, updated_at = now() where id = v_cart.id;
  return query select ci.cart_id, ci.quantity from public.cart_items ci
    where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
end;
$$;

revoke all on function public.add_to_establishment_cart(uuid, uuid, integer) from public;
grant execute on function public.add_to_establishment_cart(uuid, uuid, integer) to authenticated;
revoke execute on function public.add_to_active_cart(uuid, integer) from authenticated;

create or replace function public.confirm_active_cart_with_address(
  p_cart_id uuid,
  p_address_id uuid,
  p_window_label text
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_cart public.carts%rowtype;
  v_address public.addresses%rowtype;
  v_snapshot jsonb;
begin
  if p_cart_id is null or p_address_id is null then raise exception 'ADDRESS_REQUIRED'; end if;
  if p_window_label is null or p_window_label not in ('Hoje', 'Amanhã') then raise exception 'INVALID_DELIVERY_WINDOW'; end if;
  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'ACTIVE_MEMBERSHIP_REQUIRED'; end if;

  select c.* into v_cart from public.carts c
  where c.id = p_cart_id and c.company_id = v_profile.company_id;
  if v_cart.id is null then raise exception 'ACTIVE_CART_NOT_FOUND'; end if;
  if v_cart.status = 'CONVERTED' then
    return query select o.id, o.order_number from public.orders o
      where o.cart_id = v_cart.id and o.company_id = v_profile.company_id;
    return;
  end if;
  if v_cart.status <> 'ACTIVE' then raise exception 'ACTIVE_CART_NOT_FOUND'; end if;

  select a.* into v_address from public.addresses a
  where a.id = p_address_id and a.establishment_id = v_cart.establishment_id and a.status = 'ACTIVE';
  if v_address.id is null then raise exception 'ADDRESS_NOT_AVAILABLE'; end if;
  v_snapshot := jsonb_build_object(
    'address_id', v_address.id, 'label', v_address.label,
    'address_line', v_address.address_line, 'address_number', v_address.address_number,
    'address_complement', v_address.address_complement, 'district', v_address.district,
    'city', v_address.city, 'state', v_address.state, 'postal_code', v_address.postal_code
  );
  return query select result.order_id, result.order_number
    from public.confirm_active_cart(
      p_cart_id, v_snapshot, jsonb_build_object('label', p_window_label)
    ) result;
end;
$$;

revoke all on function public.confirm_active_cart_with_address(uuid, uuid, text) from public;
grant execute on function public.confirm_active_cart_with_address(uuid, uuid, text) to authenticated;
revoke execute on function public.confirm_active_cart(uuid, jsonb, jsonb) from authenticated;
