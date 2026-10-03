-- PRICE-ADMIN-001: allow administrators to prepare prices for inactive SKUs.
-- Inactive products/variants remain unavailable in the customer catalog and cart.
create or replace function public.admin_upsert_company_sku_price(p_company_id uuid,p_sku_id uuid,p_amount_minor bigint)
returns table (price_id uuid, company_id uuid, sku_id uuid, amount_minor bigint, currency_code text, status text, valid_from timestamptz, valid_until timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
declare v_price_id uuid;
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_company_id is null or not exists (select 1 from public.companies c where c.id=p_company_id and c.status='ACTIVE') then raise exception 'COMPANY_NOT_FOUND'; end if;
  if p_sku_id is null or not exists (select 1 from public.product_variants v join public.products p on p.id=v.product_id where v.id=p_sku_id) then raise exception 'SKU_NOT_FOUND'; end if;
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
