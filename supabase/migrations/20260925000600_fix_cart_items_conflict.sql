create or replace function public.add_to_establishment_cart(p_establishment_id uuid, p_sku_id uuid, p_quantity integer default 1)
returns table (cart_id uuid, quantity integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_cart public.carts%rowtype;
  v_price bigint;
  v_sku_id uuid := p_sku_id;
begin
  if p_establishment_id is null or v_sku_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 9999 then raise exception 'INVALID_QUANTITY'; end if;
  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'ACTIVE_MEMBERSHIP_REQUIRED'; end if;
  if not exists (select 1 from public.establishments e where e.id = p_establishment_id and e.company_id = v_profile.company_id and e.status = 'ACTIVE') then raise exception 'ESTABLISHMENT_NOT_AVAILABLE'; end if;
  if not exists (select 1 from public.product_variants pv where pv.id = v_sku_id and pv.status = 'ACTIVE') then raise exception 'SKU_NOT_AVAILABLE'; end if;
  select pr.amount_minor into v_price from public.prices pr
  where pr.company_id = v_profile.company_id and pr.sku_id = v_sku_id and pr.status = 'ACTIVE'
    and pr.valid_from <= now() and (pr.valid_until is null or pr.valid_until > now())
  order by pr.valid_from desc limit 1;
  if v_price is null then raise exception 'PRICE_UNAVAILABLE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_establishment_id::text, 0));
  select c.* into v_cart from public.carts c where c.company_id = v_profile.company_id and c.establishment_id = p_establishment_id and c.status = 'ACTIVE' for update;
  if v_cart.id is null then insert into public.carts (company_id, establishment_id, created_by_profile_id) values (v_profile.company_id, p_establishment_id, v_profile.id) returning * into v_cart; end if;
  if exists (select 1 from public.cart_items ci where ci.cart_id = v_cart.id and ci.sku_id = v_sku_id and ci.quantity + p_quantity > 9999) then raise exception 'INVALID_QUANTITY'; end if;
  insert into public.cart_items (cart_id, sku_id, quantity, displayed_unit_price_minor) values (v_cart.id, v_sku_id, p_quantity, v_price)
  on conflict on constraint cart_items_cart_id_sku_id_key do update set quantity = cart_items.quantity + excluded.quantity, displayed_unit_price_minor = excluded.displayed_unit_price_minor, updated_at = now();
  update public.carts set version = version + 1, updated_at = now() where id = v_cart.id;
  return query select ci.cart_id, ci.quantity from public.cart_items ci where ci.cart_id = v_cart.id and ci.sku_id = v_sku_id;
end; $$;
revoke all on function public.add_to_establishment_cart(uuid, uuid, integer) from public;
grant execute on function public.add_to_establishment_cart(uuid, uuid, integer) to authenticated;
