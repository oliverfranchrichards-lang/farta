-- PROD-PRICE-001: minimum quantity per commercial SKU.
-- Additive migration; old order snapshots remain readable.
alter table public.product_variants
  add column if not exists minimum_quantity integer;

update public.product_variants
set minimum_quantity = 1
where minimum_quantity is null;

alter table public.product_variants
  alter column minimum_quantity set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_variants_minimum_quantity_check'
      and conrelid = 'public.product_variants'::regclass
  ) then
    alter table public.product_variants
      add constraint product_variants_minimum_quantity_check
      check (minimum_quantity > 0);
  end if;
end;
$$;

alter table public.order_items
  add column if not exists minimum_quantity_snapshot integer;

update public.order_items oi
set minimum_quantity_snapshot = coalesce(pv.minimum_quantity, 1)
from public.product_variants pv
where pv.id = oi.sku_id
  and oi.minimum_quantity_snapshot is null;

alter table public.order_items
  alter column minimum_quantity_snapshot set default 1;

alter table public.order_items
  alter column minimum_quantity_snapshot set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'order_items_minimum_quantity_snapshot_check'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_minimum_quantity_snapshot_check
      check (minimum_quantity_snapshot > 0);
  end if;
end;
$$;

-- Enforce the approved minimum on the establishment-scoped cart command.
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
  v_minimum integer;
  v_result_quantity integer;
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
  select pv.minimum_quantity into v_minimum
  from public.product_variants pv
  join public.products p on p.id = pv.product_id and p.status = 'ACTIVE'
  where pv.id = p_sku_id and pv.status = 'ACTIVE';
  if v_minimum is null then raise exception 'SKU_NOT_AVAILABLE'; end if;
  select pr.amount_minor into v_price
  from public.prices pr
  where pr.company_id = v_profile.company_id and pr.sku_id = p_sku_id and pr.status = 'ACTIVE'
    and pr.valid_from <= now() and (pr.valid_until is null or pr.valid_until > now())
  order by pr.valid_from desc limit 1;
  if v_price is null then raise exception 'PRICE_UNAVAILABLE'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_establishment_id::text, 0));
  select c.* into v_cart from public.carts c
  where c.company_id = v_profile.company_id and c.establishment_id = p_establishment_id and c.status = 'ACTIVE'
  for update;
  if v_cart.id is null then
    insert into public.carts (company_id, establishment_id, created_by_profile_id)
    values (v_profile.company_id, p_establishment_id, v_profile.id) returning * into v_cart;
  end if;
  select coalesce(ci.quantity, 0) + p_quantity into v_result_quantity
  from (select 1) seed
  left join public.cart_items ci on ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
  if v_result_quantity > 9999 then raise exception 'INVALID_QUANTITY'; end if;
  if v_result_quantity < v_minimum then raise exception 'MINIMUM_QUANTITY_NOT_MET:%', v_minimum; end if;
  insert into public.cart_items (cart_id, sku_id, quantity, displayed_unit_price_minor)
  values (v_cart.id, p_sku_id, p_quantity, v_price)
  on conflict (cart_id, sku_id) do update
    set quantity = public.cart_items.quantity + excluded.quantity,
        displayed_unit_price_minor = excluded.displayed_unit_price_minor,
        updated_at = now();
  update public.carts set version = version + 1, updated_at = now() where id = v_cart.id;
  return query select ci.cart_id, ci.quantity from public.cart_items ci
    where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
end;
$$;

revoke all on function public.add_to_establishment_cart(uuid, uuid, integer) from public, anon;
grant execute on function public.add_to_establishment_cart(uuid, uuid, integer) to authenticated;

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
  v_minimum integer;
begin
  if p_cart_id is null or p_sku_id is null or p_quantity is null or p_quantity < 0 or p_quantity > 9999 then
    raise exception 'INVALID_QUANTITY';
  end if;
  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'ACTIVE_MEMBERSHIP_REQUIRED'; end if;
  select c.* into v_cart from public.carts c
  where c.id = p_cart_id and c.company_id = v_profile.company_id and c.status = 'ACTIVE'
  for update;
  if v_cart.id is null then raise exception 'ACTIVE_CART_NOT_FOUND'; end if;
  if not exists (select 1 from public.cart_items ci where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id) then
    raise exception 'CART_ITEM_NOT_FOUND';
  end if;
  if p_quantity = 0 then
    delete from public.cart_items ci where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
  else
    select pv.minimum_quantity into v_minimum
    from public.product_variants pv join public.products p on p.id = pv.product_id and p.status = 'ACTIVE'
    where pv.id = p_sku_id and pv.status = 'ACTIVE';
    if v_minimum is null then raise exception 'SKU_NOT_AVAILABLE'; end if;
    if p_quantity < v_minimum then raise exception 'MINIMUM_QUANTITY_NOT_MET:%', v_minimum; end if;
    select pr.amount_minor into v_price from public.prices pr
    where pr.company_id = v_cart.company_id and pr.sku_id = p_sku_id and pr.status = 'ACTIVE'
      and pr.valid_from <= now() and (pr.valid_until is null or pr.valid_until > now())
    order by pr.valid_from desc limit 1;
    if v_price is null then raise exception 'PRICE_UNAVAILABLE'; end if;
    update public.cart_items ci
    set quantity = p_quantity, displayed_unit_price_minor = v_price, updated_at = now()
    where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
  end if;
  update public.carts c set version = version + 1, updated_at = now() where c.id = v_cart.id;
  return query select v_cart.id, p_quantity;
end;
$$;

revoke all on function public.set_active_cart_item_quantity(uuid, uuid, integer) from public, anon;
grant execute on function public.set_active_cart_item_quantity(uuid, uuid, integer) to authenticated;