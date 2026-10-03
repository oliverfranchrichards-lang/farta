-- ADMIN-PRODUCTS-001 forward-fix: category reassignment, SKU history and private images.

alter table public.order_items add column if not exists sku_code_snapshot text;

update public.order_items oi
set sku_code_snapshot = pv.sku_code
from public.product_variants pv
where pv.id = oi.sku_id and oi.sku_code_snapshot is null;

create or replace function public.set_order_item_sku_snapshot()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.sku_code_snapshot is null then
    select pv.sku_code into new.sku_code_snapshot from public.product_variants pv where pv.id = new.sku_id;
  end if;
  if new.sku_code_snapshot is null then raise exception 'SKU_NOT_FOUND'; end if;
  return new;
end;
$$;

drop trigger if exists order_items_sku_snapshot_before_insert on public.order_items;
create trigger order_items_sku_snapshot_before_insert before insert on public.order_items
for each row execute function public.set_order_item_sku_snapshot();

alter table public.order_items alter column sku_code_snapshot set not null;

create or replace function public.admin_get_or_create_other_category()
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  select c.id into v_id from public.categories c where lower(c.name) = lower('Outros') order by c.id limit 1 for update;
  if v_id is null then
    insert into public.categories (name, sort_order, status) values ('Outros', 9999, 'ACTIVE') returning id into v_id;
  else
    update public.categories set status = 'ACTIVE', updated_at = now() where id = v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.admin_get_or_create_other_category() from public, anon, authenticated;

create or replace function public.admin_update_category(p_category_id uuid, p_name text, p_sort_order integer, p_status text, p_confirm_reassign boolean default false)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_name text := nullif(btrim(coalesce(p_name, '')), ''); v_previous text; v_other_id uuid; v_product_count integer;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_category_id is null or v_name is null or char_length(v_name) > 160 or p_sort_order is null or p_status not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_CATEGORY'; end if;
  select c.status into v_previous from public.categories c where c.id = p_category_id for update;
  if v_previous is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if lower(v_name) = lower('Outros') and p_status = 'INACTIVE' then raise exception 'OTHER_CATEGORY_REQUIRED'; end if;
  select count(*)::integer into v_product_count from public.products p where p.category_id = p_category_id;
  if p_status = 'INACTIVE' and v_product_count > 0 then
    if not p_confirm_reassign then raise exception 'CATEGORY_REASSIGN_CONFIRMATION_REQUIRED'; end if;
    v_other_id := public.admin_get_or_create_other_category();
    if v_other_id = p_category_id then raise exception 'OTHER_CATEGORY_REQUIRED'; end if;
    update public.products set category_id = v_other_id, updated_at = now() where category_id = p_category_id;
  end if;
  update public.categories set name = v_name, sort_order = p_sort_order, status = p_status, updated_at = now() where id = p_category_id;
  insert into public.audit_logs(actor_profile_id, actor_role, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', 'CATEGORY_UPDATED', 'category', p_category_id, 'SUCCESS', jsonb_build_object('previous_status', v_previous, 'status', p_status, 'reassigned_products', v_product_count));
  return true;
exception when unique_violation then raise exception 'CATEGORY_ALREADY_EXISTS';
end;
$$;

create or replace function public.admin_delete_category(p_category_id uuid, p_confirm_reassign boolean default false)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_name text; v_other_id uuid; v_product_count integer;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  select c.name into v_name from public.categories c where c.id = p_category_id for update;
  if v_name is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if lower(v_name) = lower('Outros') then raise exception 'OTHER_CATEGORY_REQUIRED'; end if;
  select count(*)::integer into v_product_count from public.products p where p.category_id = p_category_id;
  if v_product_count > 0 and not p_confirm_reassign then raise exception 'CATEGORY_REASSIGN_CONFIRMATION_REQUIRED'; end if;
  if v_product_count > 0 then
    v_other_id := public.admin_get_or_create_other_category();
    update public.products set category_id = v_other_id, updated_at = now() where category_id = p_category_id;
  end if;
  delete from public.categories where id = p_category_id;
  insert into public.audit_logs(actor_profile_id, actor_role, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', 'CATEGORY_DELETED', 'category', p_category_id, 'SUCCESS', jsonb_build_object('reassigned_products', v_product_count));
  return true;
end;
$$;

create or replace function public.admin_update_variant(p_variant_id uuid, p_name text, p_sku_code text, p_sale_unit text, p_attributes jsonb, p_minimum_quantity integer, p_status text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_name text := nullif(btrim(coalesce(p_name, '')), ''); v_sku text := nullif(btrim(coalesce(p_sku_code, '')), ''); v_unit text := nullif(btrim(coalesce(p_sale_unit, '')), ''); v_old record;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_variant_id is null or v_name is null or v_sku is null or v_unit is null or p_minimum_quantity < 1 or p_status not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_VARIANT'; end if;
  select v.* into v_old from public.product_variants v where v.id = p_variant_id for update;
  if v_old.id is null then raise exception 'VARIANT_NOT_FOUND'; end if;
  update public.product_variants set name = v_name, sku_code = v_sku, sale_unit = v_unit, attributes = coalesce(p_attributes, '{}'::jsonb), minimum_quantity = p_minimum_quantity, status = p_status, updated_at = now() where id = p_variant_id;
  insert into public.audit_logs(actor_profile_id, actor_role, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', 'VARIANT_UPDATED', 'product_variant', p_variant_id, 'SUCCESS', jsonb_build_object('old_sku_code', v_old.sku_code, 'new_sku_code', v_sku, 'old_sale_unit', v_old.sale_unit, 'new_sale_unit', v_unit));
  return true;
exception when unique_violation then raise exception 'SKU_ALREADY_EXISTS';
end;
$$;

revoke all on function public.admin_update_category(uuid, text, integer, text, boolean), public.admin_delete_category(uuid, boolean), public.admin_update_variant(uuid, text, text, text, jsonb, integer, text) from public, anon;
grant execute on function public.admin_update_category(uuid, text, integer, text, boolean), public.admin_delete_category(uuid, boolean), public.admin_update_variant(uuid, text, text, text, jsonb, integer, text) to authenticated;

do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('catalog-product-images', 'catalog-product-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
exception when undefined_table then null;
end $$;

drop policy if exists catalog_images_read on storage.objects;
drop policy if exists catalog_images_insert on storage.objects;
drop policy if exists catalog_images_update on storage.objects;
drop policy if exists catalog_images_delete on storage.objects;
create policy catalog_images_read on storage.objects for select to authenticated using (
  bucket_id = 'catalog-product-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.company_id is not null)
);
create policy catalog_images_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'catalog-product-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.role = 'PLATFORM_ADMIN')
);
create policy catalog_images_update on storage.objects for update to authenticated using (
  bucket_id = 'catalog-product-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.role = 'PLATFORM_ADMIN')
) with check (bucket_id = 'catalog-product-images');
create policy catalog_images_delete on storage.objects for delete to authenticated using (
  bucket_id = 'catalog-product-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.role = 'PLATFORM_ADMIN')
);
