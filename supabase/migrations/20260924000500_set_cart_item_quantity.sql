create or replace function public.set_active_cart_item_quantity(
  p_cart_id uuid,
  p_sku_id uuid,
  p_quantity integer
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
  if p_cart_id is null or p_sku_id is null or p_quantity is null or p_quantity < 0 or p_quantity > 9999 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then
    raise exception 'ACTIVE_PROFILE_REQUIRED';
  end if;
  if not public.has_active_membership(v_profile.company_id) then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED';
  end if;

  select c.* into v_cart
  from public.carts c
  where c.id = p_cart_id and c.company_id = v_profile.company_id and c.status = 'ACTIVE'
  for update;
  if v_cart.id is null then raise exception 'ACTIVE_CART_NOT_FOUND'; end if;
  if not exists (select 1 from public.cart_items ci where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id) then
    raise exception 'CART_ITEM_NOT_FOUND';
  end if;

  if p_quantity = 0 then
    delete from public.cart_items ci where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
  else
    select p.amount_minor into v_price
    from public.prices p
    where p.company_id = v_cart.company_id and p.sku_id = p_sku_id and p.status = 'ACTIVE'
      and p.valid_from <= now() and (p.valid_until is null or p.valid_until > now())
    order by p.valid_from desc limit 1;
    if v_price is null then raise exception 'PRICE_UNAVAILABLE'; end if;
    update public.cart_items ci
    set quantity = p_quantity, displayed_unit_price_minor = v_price, updated_at = now()
    where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
  end if;

  update public.carts c set version = version + 1, updated_at = now() where c.id = v_cart.id;
  return query select v_cart.id, p_quantity;
end;
$$;

revoke all on function public.set_active_cart_item_quantity(uuid, uuid, integer) from public;
grant execute on function public.set_active_cart_item_quantity(uuid, uuid, integer) to authenticated;
