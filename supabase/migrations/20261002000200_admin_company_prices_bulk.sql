-- PRICE-ADMIN-001: atomic application of one SKU price to all companies.
create or replace function public.admin_upsert_company_sku_prices(
  p_company_ids uuid[],
  p_sku_id uuid,
  p_amount_minor bigint
)
returns integer
language plpgsql security definer set search_path = public, auth
as $$
declare v_company_id uuid; v_count integer := 0;
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_company_ids is null or cardinality(p_company_ids)=0 then raise exception 'COMPANY_NOT_FOUND'; end if;
  foreach v_company_id in array p_company_ids loop
    perform public.admin_upsert_company_sku_price(v_company_id, p_sku_id, p_amount_minor);
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

revoke all on function public.admin_upsert_company_sku_prices(uuid[],uuid,bigint) from public, anon;
grant execute on function public.admin_upsert_company_sku_prices(uuid[],uuid,bigint) to authenticated;
