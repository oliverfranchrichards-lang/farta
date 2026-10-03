-- PRICE-ADMIN-001: company-scoped approximate prices.
-- No price is copied between companies and order snapshots are untouched.

create or replace function public.admin_list_company_prices(p_company_id uuid)
returns table (
  company_id uuid, company_name text, company_status text, sku_id uuid, product_id uuid,
  product_name text, brand text, variant_name text, sku_code text, sale_unit text,
  sku_status text, product_status text, minimum_quantity integer, price_id uuid, amount_minor bigint,
  currency_code text, price_status text, valid_from timestamptz, valid_until timestamptz
)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_company_id is null or not exists (select 1 from public.companies c where c.id=p_company_id) then raise exception 'COMPANY_NOT_FOUND'; end if;
  return query
  select c.id,c.display_name,c.status,v.id,p.id,p.name,p.brand,v.name,v.sku_code,v.sale_unit,v.status,p.status,
         v.minimum_quantity,pr.id,pr.amount_minor,pr.currency_code::text,pr.status,pr.valid_from,pr.valid_until
  from public.companies c cross join public.product_variants v join public.products p on p.id=v.product_id
  left join lateral (select pr1.* from public.prices pr1 where pr1.company_id=c.id and pr1.sku_id=v.id and pr1.status='ACTIVE' and pr1.valid_from<=now() and (pr1.valid_until is null or pr1.valid_until>now()) order by pr1.valid_from desc limit 1) pr on true
  where c.id=p_company_id order by p.name,v.name,v.sku_code;
end; $$;

create or replace function public.admin_upsert_company_sku_price(p_company_id uuid,p_sku_id uuid,p_amount_minor bigint)
returns table (price_id uuid, company_id uuid, sku_id uuid, amount_minor bigint, currency_code text, status text, valid_from timestamptz, valid_until timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
declare v_price_id uuid;
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_company_id is null or not exists (select 1 from public.companies c where c.id=p_company_id and c.status='ACTIVE') then raise exception 'COMPANY_NOT_FOUND'; end if;
  if p_sku_id is null or not exists (select 1 from public.product_variants v join public.products p on p.id=v.product_id join public.categories c on c.id=p.category_id where v.id=p_sku_id and v.status='ACTIVE' and p.status='ACTIVE' and c.status='ACTIVE') then raise exception 'SKU_NOT_FOUND'; end if;
  if p_amount_minor is null or p_amount_minor<0 then raise exception 'INVALID_PRICE'; end if;
  select pr.id into v_price_id from public.prices pr where pr.company_id=p_company_id and pr.sku_id=p_sku_id and pr.status='ACTIVE' and pr.valid_from<=now() and (pr.valid_until is null or pr.valid_until>now()) order by pr.valid_from desc limit 1 for update;
  if v_price_id is null then
    insert into public.prices(company_id,sku_id,amount_minor,currency_code,valid_from,status,source) values(p_company_id,p_sku_id,p_amount_minor,'BRL',now(),'ACTIVE','MANUAL') returning id into v_price_id;
  else
    update public.prices set amount_minor=p_amount_minor,updated_at=now() where id=v_price_id;
  end if;
  insert into public.audit_logs(actor_profile_id,actor_role,company_id,action,resource_type,resource_id,outcome,metadata) values(auth.uid(),'PLATFORM_ADMIN',p_company_id,'COMPANY_PRICE_UPDATED','price',v_price_id,'SUCCESS',jsonb_build_object('sku_id',p_sku_id,'amount_minor',p_amount_minor));
  return query select pr.id,pr.company_id,pr.sku_id,pr.amount_minor,pr.currency_code::text,pr.status,pr.valid_from,pr.valid_until from public.prices pr where pr.id=v_price_id;
exception when exclusion_violation then raise exception 'PRICE_PERIOD_OVERLAP';
end; $$;

revoke all on function public.admin_list_company_prices(uuid),public.admin_upsert_company_sku_price(uuid,uuid,bigint) from public, anon;
grant execute on function public.admin_list_company_prices(uuid),public.admin_upsert_company_sku_price(uuid,uuid,bigint) to authenticated;
