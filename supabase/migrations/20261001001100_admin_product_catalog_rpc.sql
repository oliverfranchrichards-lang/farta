-- ADMIN-PRODUCTS-001: PLATFORM_ADMIN-only catalog mutations.
-- Storage/image upload is intentionally excluded until bucket and policy are approved.

create or replace function public.admin_list_categories(p_status text default null)
returns table (id uuid, name text, sort_order integer, status text, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_status is not null and p_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_STATUS'; end if;
  return query select c.id,c.name,c.sort_order,c.status,c.created_at,c.updated_at from public.categories c where p_status is null or c.status=p_status order by c.sort_order,c.name;
end; $$;

create or replace function public.admin_create_category(p_name text, p_sort_order integer default 0)
returns table (id uuid, name text, sort_order integer, status text)
language plpgsql security definer set search_path = public, auth
as $$
declare v_id uuid; v_name text := nullif(btrim(coalesce(p_name,'')), '');
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if v_name is null or char_length(v_name)>160 or p_sort_order is null then raise exception 'INVALID_CATEGORY'; end if;
  insert into public.categories(name,sort_order,status) values(v_name,p_sort_order,'ACTIVE') returning public.categories.id into v_id;
  insert into public.audit_logs(actor_profile_id,actor_role,action,resource_type,resource_id,outcome,metadata) values(auth.uid(),'PLATFORM_ADMIN','CATEGORY_CREATED','category',v_id,'SUCCESS',jsonb_build_object('name',v_name));
  return query select c.id,c.name,c.sort_order,c.status from public.categories c where c.id=v_id;
exception when unique_violation then raise exception 'CATEGORY_ALREADY_EXISTS';
end; $$;

create or replace function public.admin_update_category(p_category_id uuid, p_name text, p_sort_order integer, p_status text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_name text := nullif(btrim(coalesce(p_name,'')), ''); v_previous text;
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_category_id is null or v_name is null or char_length(v_name)>160 or p_sort_order is null or p_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_CATEGORY'; end if;
  select c.status into v_previous from public.categories c where c.id=p_category_id for update;
  if v_previous is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if p_status='INACTIVE' and exists(select 1 from public.products p where p.category_id=p_category_id and p.status='ACTIVE') then raise exception 'CATEGORY_HAS_ACTIVE_PRODUCTS'; end if;
  update public.categories set name=v_name,sort_order=p_sort_order,status=p_status,updated_at=now() where id=p_category_id;
  insert into public.audit_logs(actor_profile_id,actor_role,action,resource_type,resource_id,outcome,metadata) values(auth.uid(),'PLATFORM_ADMIN','CATEGORY_UPDATED','category',p_category_id,'SUCCESS',jsonb_build_object('previous_status',v_previous,'status',p_status));
  return true;
exception when unique_violation then raise exception 'CATEGORY_ALREADY_EXISTS';
end; $$;

create or replace function public.admin_list_products(p_status text default null)
returns table (id uuid, category_id uuid, category_name text, name text, brand text, description text, status text, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_status is not null and p_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_STATUS'; end if;
  return query select p.id,p.category_id,c.name,p.name,p.brand,p.description,p.status,p.created_at,p.updated_at from public.products p join public.categories c on c.id=p.category_id where p_status is null or p.status=p_status order by p.name;
end; $$;

create or replace function public.admin_create_product(p_category_id uuid,p_name text,p_brand text default null,p_description text default null,p_status text default 'ACTIVE')
returns table (id uuid, category_id uuid, name text, brand text, description text, status text)
language plpgsql security definer set search_path = public, auth
as $$
declare v_id uuid; v_name text := nullif(btrim(coalesce(p_name,'')), ''); v_category_status text;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_category_id is null or v_name is null or char_length(v_name)>240 or p_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_PRODUCT'; end if;
  select c.status into v_category_status from public.categories c where c.id=p_category_id;
  if v_category_status is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if p_status='ACTIVE' and v_category_status<>'ACTIVE' then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  insert into public.products(category_id,name,brand,description,status) values(p_category_id,v_name,nullif(btrim(p_brand),''),nullif(btrim(p_description),''),p_status) returning public.products.id into v_id;
  insert into public.audit_logs(actor_profile_id,actor_role,action,resource_type,resource_id,outcome,metadata) values(auth.uid(),'PLATFORM_ADMIN','PRODUCT_CREATED','product',v_id,'SUCCESS','{}');
  return query select p.id,p.category_id,p.name,p.brand,p.description,p.status from public.products p where p.id=v_id;
end; $$;

create or replace function public.admin_update_product(p_product_id uuid,p_category_id uuid,p_name text,p_brand text,p_description text,p_status text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_name text := nullif(btrim(coalesce(p_name,'')), ''); v_category_status text; v_previous text;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_product_id is null or p_category_id is null or v_name is null or p_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_PRODUCT'; end if;
  select p.status into v_previous from public.products p where p.id=p_product_id for update;
  if v_previous is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  select c.status into v_category_status from public.categories c where c.id=p_category_id;
  if v_category_status is null then raise exception 'CATEGORY_NOT_FOUND'; end if;
  if p_status='ACTIVE' and v_category_status<>'ACTIVE' then raise exception 'CATEGORY_NOT_AVAILABLE'; end if;
  update public.products set category_id=p_category_id,name=v_name,brand=nullif(btrim(p_brand),''),description=nullif(btrim(p_description),''),status=p_status,updated_at=now() where id=p_product_id;
  insert into public.audit_logs(actor_profile_id,actor_role,action,resource_type,resource_id,outcome,metadata) values(auth.uid(),'PLATFORM_ADMIN','PRODUCT_UPDATED','product',p_product_id,'SUCCESS',jsonb_build_object('previous_status',v_previous,'status',p_status));
  return true;
end; $$;

create or replace function public.admin_list_variants(p_product_id uuid)
returns table (id uuid, product_id uuid, sku_code text, name text, attributes jsonb, sale_unit text, minimum_quantity integer, status text, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  return query select v.id,v.product_id,v.sku_code,v.name,v.attributes,v.sale_unit,v.minimum_quantity,v.status,v.created_at,v.updated_at from public.product_variants v where v.product_id=p_product_id order by v.name;
end; $$;

create or replace function public.admin_create_variant(p_product_id uuid,p_sku_code text,p_name text,p_sale_unit text,p_attributes jsonb default '{}'::jsonb,p_minimum_quantity integer default 1,p_status text default 'ACTIVE')
returns table (id uuid, product_id uuid, sku_code text, name text, sale_unit text, minimum_quantity integer, status text)
language plpgsql security definer set search_path = public, auth
as $$
declare v_id uuid; v_sku text:=nullif(btrim(coalesce(p_sku_code,'')), ''); v_name text:=nullif(btrim(coalesce(p_name,'')), ''); v_unit text:=nullif(btrim(coalesce(p_sale_unit,'')), '');
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_product_id is null or v_sku is null or v_name is null or v_unit is null or p_minimum_quantity<1 or p_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_VARIANT'; end if;
  if not exists(select 1 from public.products p join public.categories c on c.id=p.category_id where p.id=p_product_id and (p.status='ACTIVE' and c.status='ACTIVE' or p_status='INACTIVE')) then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
  insert into public.product_variants(product_id,sku_code,name,sale_unit,attributes,minimum_quantity,status) values(p_product_id,v_sku,v_name,v_unit,coalesce(p_attributes,'{}'),p_minimum_quantity,p_status) returning public.product_variants.id into v_id;
  insert into public.audit_logs(actor_profile_id,actor_role,action,resource_type,resource_id,outcome,metadata) values(auth.uid(),'PLATFORM_ADMIN','VARIANT_CREATED','product_variant',v_id,'SUCCESS',jsonb_build_object('sku_code',v_sku));
  return query select v.id,v.product_id,v.sku_code,v.name,v.sale_unit,v.minimum_quantity,v.status from public.product_variants v where v.id=v_id;
exception when unique_violation then raise exception 'SKU_ALREADY_EXISTS';
end; $$;

create or replace function public.admin_update_variant(p_variant_id uuid,p_name text,p_sku_code text,p_sale_unit text,p_attributes jsonb,p_minimum_quantity integer,p_status text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_name text:=nullif(btrim(coalesce(p_name,'')), ''); v_sku text:=nullif(btrim(coalesce(p_sku_code,'')), ''); v_unit text:=nullif(btrim(coalesce(p_sale_unit,'')), ''); v_old record;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_variant_id is null or v_name is null or v_sku is null or v_unit is null or p_minimum_quantity<1 or p_status not in ('ACTIVE','INACTIVE') then raise exception 'INVALID_VARIANT'; end if;
  select v.* into v_old from public.product_variants v where v.id=p_variant_id for update;
  if v_old.id is null then raise exception 'VARIANT_NOT_FOUND'; end if;
  if exists(select 1 from public.order_items oi where oi.sku_id=p_variant_id) and (v_old.sku_code<>v_sku or v_old.sale_unit<>v_unit) then raise exception 'VARIANT_COMMERCIAL_FIELDS_IMMUTABLE'; end if;
  update public.product_variants set name=v_name,sku_code=v_sku,sale_unit=v_unit,attributes=coalesce(p_attributes,'{}'),minimum_quantity=p_minimum_quantity,status=p_status,updated_at=now() where id=p_variant_id;
  insert into public.audit_logs(actor_profile_id,actor_role,action,resource_type,resource_id,outcome,metadata) values(auth.uid(),'PLATFORM_ADMIN','VARIANT_UPDATED','product_variant',p_variant_id,'SUCCESS',jsonb_build_object('sku_code',v_sku));
  return true;
exception when unique_violation then raise exception 'SKU_ALREADY_EXISTS';
end; $$;

revoke all on function public.admin_list_categories(text),public.admin_create_category(text,integer),public.admin_update_category(uuid,text,integer,text),public.admin_list_products(text),public.admin_create_product(uuid,text,text,text,text),public.admin_update_product(uuid,uuid,text,text,text,text),public.admin_list_variants(uuid),public.admin_create_variant(uuid,text,text,text,jsonb,integer,text),public.admin_update_variant(uuid,text,text,text,jsonb,integer,text) from public, anon;
grant execute on function public.admin_list_categories(text),public.admin_create_category(text,integer),public.admin_update_category(uuid,text,integer,text),public.admin_list_products(text),public.admin_create_product(uuid,text,text,text,text),public.admin_update_product(uuid,uuid,text,text,text,text),public.admin_list_variants(uuid),public.admin_create_variant(uuid,text,text,text,jsonb,integer,text),public.admin_update_variant(uuid,text,text,text,jsonb,integer,text) to authenticated;
