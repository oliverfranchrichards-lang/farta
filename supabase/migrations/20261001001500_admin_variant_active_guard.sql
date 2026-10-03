create or replace function public.admin_update_variant(p_variant_id uuid, p_name text, p_sku_code text, p_sale_unit text, p_attributes jsonb, p_minimum_quantity integer, p_status text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_name text := nullif(btrim(coalesce(p_name, '')), ''); v_sku text := nullif(btrim(coalesce(p_sku_code, '')), ''); v_unit text := nullif(btrim(coalesce(p_sale_unit, '')), ''); v_old record;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_variant_id is null or v_name is null or v_sku is null or v_unit is null or p_minimum_quantity < 1 or p_status not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_VARIANT'; end if;
  select v.* into v_old from public.product_variants v where v.id = p_variant_id for update;
  if v_old.id is null then raise exception 'VARIANT_NOT_FOUND'; end if;
  if p_status = 'ACTIVE' and not exists (select 1 from public.products p join public.categories c on c.id = p.category_id where p.id = v_old.product_id and p.status = 'ACTIVE' and c.status = 'ACTIVE') then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
  update public.product_variants set name = v_name, sku_code = v_sku, sale_unit = v_unit, attributes = coalesce(p_attributes, '{}'::jsonb), minimum_quantity = p_minimum_quantity, status = p_status, updated_at = now() where id = p_variant_id;
  insert into public.audit_logs(actor_profile_id, actor_role, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', 'VARIANT_UPDATED', 'product_variant', p_variant_id, 'SUCCESS', jsonb_build_object('old_sku_code', v_old.sku_code, 'new_sku_code', v_sku, 'old_sale_unit', v_old.sale_unit, 'new_sale_unit', v_unit));
  return true;
exception when unique_violation then raise exception 'SKU_ALREADY_EXISTS';
end;
$$;
