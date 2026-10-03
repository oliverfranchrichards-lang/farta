create table public.banners (
  id uuid primary key default gen_random_uuid(),
  storage_object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 5242880),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 240),
  title text check (title is null or char_length(btrim(title)) between 1 and 160),
  status text not null default 'INACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index banners_public_order_idx on public.banners (status, sort_order, created_at);
alter table public.banners enable row level security;

create policy banners_customer_active_read on public.banners for select to authenticated using (
  status = 'ACTIVE' and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'ACTIVE' and p.role in ('CUSTOMER', 'PLATFORM_ADMIN')
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-banners', 'catalog-banners', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

create policy banners_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'catalog-banners' and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'ACTIVE' and p.role in ('CUSTOMER', 'PLATFORM_ADMIN')
  )
);

create policy banners_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'catalog-banners' and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.role = 'PLATFORM_ADMIN'
  )
);

create policy banners_storage_update on storage.objects for update to authenticated using (
  bucket_id = 'catalog-banners' and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.role = 'PLATFORM_ADMIN'
  )
) with check (
  bucket_id = 'catalog-banners' and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.role = 'PLATFORM_ADMIN'
  )
);

create policy banners_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'catalog-banners' and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.role = 'PLATFORM_ADMIN'
  )
);

create or replace function public.admin_list_banners()
returns setof public.banners
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  return query select b from public.banners b order by b.sort_order, b.created_at;
end;
$$;

create or replace function public.admin_create_banner(p_storage_object_path text, p_mime_type text, p_byte_size integer, p_alt_text text, p_title text default null, p_sort_order integer default 0, p_status text default 'INACTIVE')
returns public.banners
language plpgsql security definer set search_path = public, auth
as $$
declare v_banner public.banners%rowtype;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_storage_object_path !~ '^banners/[0-9a-f-]+/[0-9a-f-]+\.(jpg|jpeg|png|webp)$' or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp') or p_byte_size is null or p_byte_size < 1 or p_byte_size > 5242880 or nullif(btrim(p_alt_text), '') is null or p_sort_order < 0 or p_status not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_BANNER'; end if;
  if p_title is not null and (nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 160) then raise exception 'INVALID_BANNER'; end if;
  insert into public.banners(storage_object_path, mime_type, byte_size, alt_text, title, status, sort_order)
  values (p_storage_object_path, p_mime_type, p_byte_size, btrim(p_alt_text), nullif(btrim(p_title), ''), p_status, p_sort_order)
  returning * into v_banner;
  insert into public.audit_logs(actor_profile_id, actor_role, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', 'BANNER_CREATED', 'banner', v_banner.id, 'SUCCESS', jsonb_build_object('mime_type', p_mime_type, 'byte_size', p_byte_size));
  return v_banner;
exception when unique_violation then raise exception 'BANNER_ALREADY_EXISTS';
end;
$$;

create or replace function public.admin_update_banner(p_banner_id uuid, p_alt_text text, p_title text default null, p_sort_order integer default 0, p_status text default 'INACTIVE')
returns public.banners
language plpgsql security definer set search_path = public, auth
as $$
declare v_banner public.banners%rowtype;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_banner_id is null or nullif(btrim(p_alt_text), '') is null or char_length(btrim(p_alt_text)) > 240 or p_sort_order < 0 or p_status not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_BANNER'; end if;
  if p_title is not null and (nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 160) then raise exception 'INVALID_BANNER'; end if;
  update public.banners set alt_text = btrim(p_alt_text), title = nullif(btrim(p_title), ''), sort_order = p_sort_order, status = p_status, updated_at = now() where id = p_banner_id returning * into v_banner;
  if v_banner.id is null then raise exception 'BANNER_NOT_FOUND'; end if;
  insert into public.audit_logs(actor_profile_id, actor_role, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', 'BANNER_UPDATED', 'banner', v_banner.id, 'SUCCESS', jsonb_build_object('status', p_status, 'sort_order', p_sort_order));
  return v_banner;
end;
$$;

revoke all on function public.admin_list_banners(), public.admin_create_banner(text, text, integer, text, text, integer, text), public.admin_update_banner(uuid, text, text, integer, text) from public, anon;
grant execute on function public.admin_list_banners(), public.admin_create_banner(text, text, integer, text, text, integer, text), public.admin_update_banner(uuid, text, text, integer, text) to authenticated;
