create or replace function public.admin_list_product_images(p_product_id uuid default null, p_variant_id uuid default null)
returns table (id uuid, product_id uuid, variant_id uuid, storage_object_path text, mime_type text, byte_size integer, alt_text text, sort_order integer, is_primary boolean)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if (p_product_id is null) = (p_variant_id is null) then raise exception 'INVALID_IMAGE_OWNER'; end if;
  return query select i.id, i.product_id, i.variant_id, i.storage_object_path, i.mime_type, i.byte_size, i.alt_text, i.sort_order, i.is_primary
  from public.product_images i where (p_product_id is not null and i.product_id = p_product_id) or (p_variant_id is not null and i.variant_id = p_variant_id) order by i.is_primary desc, i.sort_order, i.created_at;
end;
$$;

create or replace function public.admin_create_product_image(p_product_id uuid, p_variant_id uuid, p_storage_object_path text, p_mime_type text, p_byte_size integer, p_alt_text text, p_is_primary boolean default false, p_sort_order integer default 0)
returns public.product_images
language plpgsql security definer set search_path = public, auth
as $$
declare v_image public.product_images%rowtype;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if (p_product_id is null) = (p_variant_id is null) or p_storage_object_path !~ '^products/[0-9a-f-]+/[0-9a-f-]+\.(jpg|jpeg|png|webp)$' or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') or p_byte_size is null or p_byte_size < 1 or p_byte_size > 5242880 or nullif(btrim(p_alt_text), '') is null then raise exception 'INVALID_IMAGE'; end if;
  if p_product_id is not null and not exists (select 1 from public.products p where p.id = p_product_id) then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if p_variant_id is not null and not exists (select 1 from public.product_variants v where v.id = p_variant_id) then raise exception 'VARIANT_NOT_FOUND'; end if;
  if p_is_primary and p_product_id is not null then update public.product_images set is_primary = false where product_id = p_product_id and is_primary; end if;
  if p_is_primary and p_variant_id is not null then update public.product_images set is_primary = false where variant_id = p_variant_id and is_primary; end if;
  insert into public.product_images(product_id, variant_id, storage_object_path, mime_type, byte_size, alt_text, sort_order, is_primary)
  values(p_product_id, p_variant_id, p_storage_object_path, p_mime_type, p_byte_size, btrim(p_alt_text), greatest(p_sort_order, 0), p_is_primary) returning * into v_image;
  insert into public.audit_logs(actor_profile_id, actor_role, action, resource_type, resource_id, outcome, metadata)
  values(auth.uid(), 'PLATFORM_ADMIN', 'PRODUCT_IMAGE_CREATED', 'product_image', v_image.id, 'SUCCESS', jsonb_build_object('mime_type', p_mime_type, 'byte_size', p_byte_size));
  return v_image;
exception when unique_violation then raise exception 'IMAGE_ALREADY_EXISTS';
end;
$$;

create or replace function public.admin_delete_product_image(p_image_id uuid)
returns text language plpgsql security definer set search_path = public, auth
as $$
declare v_path text;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  delete from public.product_images where id = p_image_id returning storage_object_path into v_path;
  if v_path is null then raise exception 'IMAGE_NOT_FOUND'; end if;
  insert into public.audit_logs(actor_profile_id, actor_role, action, resource_type, resource_id, outcome, metadata)
  values(auth.uid(), 'PLATFORM_ADMIN', 'PRODUCT_IMAGE_DELETED', 'product_image', p_image_id, 'SUCCESS', '{}'::jsonb);
  return v_path;
end;
$$;

drop policy if exists catalog_images_read on storage.objects;
create policy catalog_images_read on storage.objects for select to authenticated using (
  bucket_id = 'catalog-product-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and (p.company_id is not null or p.role = 'PLATFORM_ADMIN'))
);

revoke all on function public.admin_list_product_images(uuid, uuid), public.admin_create_product_image(uuid, uuid, text, text, integer, text, boolean, integer), public.admin_delete_product_image(uuid) from public, anon;
grant execute on function public.admin_list_product_images(uuid, uuid), public.admin_create_product_image(uuid, uuid, text, text, integer, text, boolean, integer), public.admin_delete_product_image(uuid) to authenticated;
