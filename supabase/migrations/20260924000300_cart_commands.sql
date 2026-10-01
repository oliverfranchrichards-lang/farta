create or replace function public.add_to_active_cart(p_sku_id uuid, p_quantity integer default 1)
returns table (cart_id uuid, quantity integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_cart public.carts%rowtype;
  v_establishment uuid;
  v_price bigint;
begin
  if p_quantity is null or p_quantity < 1 then raise exception 'INVALID_QUANTITY'; end if;
  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;
  if not exists (select 1 from public.product_variants where id = p_sku_id and status = 'ACTIVE') then raise exception 'SKU_NOT_AVAILABLE'; end if;
  select p.amount_minor into v_price from public.prices p where p.company_id = v_profile.company_id and p.sku_id = p_sku_id and p.status = 'ACTIVE' and p.valid_from <= now() and (p.valid_until is null or p.valid_until > now()) order by p.valid_from desc limit 1;
  if v_price is null then raise exception 'PRICE_UNAVAILABLE'; end if;
  select e.id into v_establishment from public.establishments e where e.company_id = v_profile.company_id and e.status = 'ACTIVE' order by e.created_at limit 1;
  if v_establishment is null then raise exception 'ESTABLISHMENT_REQUIRED'; end if;
  select c.* into v_cart from public.carts c where c.company_id = v_profile.company_id and c.establishment_id = v_establishment and c.status = 'ACTIVE' for update;
  if v_cart.id is null then
    insert into public.carts (company_id, establishment_id, created_by_profile_id) values (v_profile.company_id, v_establishment, v_profile.id) returning * into v_cart;
  end if;
  insert into public.cart_items (cart_id, sku_id, quantity, displayed_unit_price_minor)
  values (v_cart.id, p_sku_id, p_quantity, v_price)
  on conflict (cart_id, sku_id) do update set quantity = cart_items.quantity + excluded.quantity, displayed_unit_price_minor = excluded.displayed_unit_price_minor, updated_at = now();
  update public.carts set version = version + 1, updated_at = now() where id = v_cart.id;
  return query select ci.cart_id, ci.quantity from public.cart_items ci where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
end;
$$;

revoke all on function public.add_to_active_cart(uuid, integer) from public;
grant execute on function public.add_to_active_cart(uuid, integer) to authenticated;
