-- Keep the legacy cart command compilable even though the newer
-- establishment-scoped command is the one exposed to the application.
create or replace function public.add_to_active_cart(p_sku_id uuid, p_quantity integer default 1)
returns table (cart_id uuid, quantity integer)
language plpgsql
security definer
set search_path = public
as $fn$
#variable_conflict use_column
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
  on conflict (cart_id, sku_id) do update set quantity = public.cart_items.quantity + excluded.quantity, displayed_unit_price_minor = excluded.displayed_unit_price_minor, updated_at = now();
  update public.carts set version = version + 1, updated_at = now() where id = v_cart.id;
  return query select ci.cart_id, ci.quantity from public.cart_items ci where ci.cart_id = v_cart.id and ci.sku_id = p_sku_id;
end;
$fn$;

-- The address row is intentionally inserted, but its full row does not need
-- to be materialized in a PL/pgSQL variable.
create or replace function public.create_establishment(p_company_id uuid, p_name text, p_address jsonb)
returns table (id uuid, name text)
language plpgsql security definer set search_path = public, auth, extensions
as $fn$
declare v_establishment public.establishments;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_company_id is null or not exists (select 1 from public.companies c where c.id = p_company_id and c.status = 'ACTIVE') or nullif(btrim(p_name), '') is null or nullif(btrim(p_address->>'label'), '') is null or nullif(btrim(p_address->>'address_line'), '') is null or nullif(btrim(p_address->>'address_number'), '') is null or nullif(btrim(p_address->>'district'), '') is null or nullif(btrim(p_address->>'city'), '') is null or upper(btrim(coalesce(p_address->>'state', ''))) !~ '^[A-Z]{2}$' or length(regexp_replace(coalesce(p_address->>'postal_code', ''), '\D', '', 'g')) <> 8 then raise exception 'INVALID_ESTABLISHMENT_DATA'; end if;
  insert into public.establishments (company_id, name, status) values (p_company_id, btrim(p_name), 'ACTIVE') returning * into v_establishment;
  insert into public.addresses (establishment_id, label, address_line, address_number, address_complement, district, city, state, postal_code, is_default)
  values (v_establishment.id, btrim(p_address->>'label'), btrim(p_address->>'address_line'), btrim(p_address->>'address_number'), nullif(btrim(p_address->>'address_complement'), ''), btrim(p_address->>'district'), btrim(p_address->>'city'), upper(btrim(p_address->>'state')), regexp_replace(p_address->>'postal_code', '\D', '', 'g'), true);
  return query select v_establishment.id, v_establishment.name;
exception when unique_violation then raise exception 'ESTABLISHMENT_ALREADY_EXISTS';
end;
$fn$;
