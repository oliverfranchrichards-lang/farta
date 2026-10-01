create or replace function public.admin_update_company(p_company_id uuid, p_data jsonb)
returns table (id uuid, display_name text, status text)
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare
  v_company public.companies;
  v_previous jsonb;
  v_tax text := regexp_replace(coalesce(p_data->>'tax_id', ''), '\D', '', 'g');
  v_state text := upper(btrim(coalesce(p_data->>'fiscal_state', '')));
  v_postal text := regexp_replace(coalesce(p_data->>'fiscal_postal_code', ''), '\D', '', 'g');
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  select to_jsonb(c) into v_previous from public.companies c where c.id = p_company_id for update;
  if v_previous is null then raise exception 'COMPANY_NOT_FOUND'; end if;
  if nullif(btrim(p_data->>'legal_name'), '') is null or nullif(btrim(p_data->>'display_name'), '') is null
    or length(v_tax) <> 14 or v_state !~ '^[A-Z]{2}$' or length(v_postal) <> 8
    or (p_data->>'corporate_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or nullif(btrim(p_data->>'fiscal_address_line'), '') is null
    or nullif(btrim(p_data->>'fiscal_address_number'), '') is null or nullif(btrim(p_data->>'fiscal_district'), '') is null
    or nullif(btrim(p_data->>'fiscal_city'), '') is null or nullif(btrim(p_data->>'legal_representative_name'), '') is null
    or (p_data->>'legal_representative_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or nullif(btrim(p_data->>'operational_contact_name'), '') is null
    or (p_data->>'operational_contact_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce((p_data->>'payment_terms_days')::integer, 0) < 0
    or coalesce((p_data->>'credit_limit_minor')::bigint, 0) < 0 then raise exception 'INVALID_COMPANY_DATA'; end if;
  update public.companies c set
    legal_name = btrim(p_data->>'legal_name'), display_name = btrim(p_data->>'display_name'), tax_id = v_tax,
    state_registration = nullif(btrim(p_data->>'state_registration'), ''),
    corporate_email = lower(btrim(p_data->>'corporate_email')), corporate_phone = nullif(btrim(p_data->>'corporate_phone'), ''),
    fiscal_address_line = btrim(p_data->>'fiscal_address_line'), fiscal_address_number = btrim(p_data->>'fiscal_address_number'),
    fiscal_address_complement = nullif(btrim(p_data->>'fiscal_address_complement'), ''), fiscal_district = btrim(p_data->>'fiscal_district'),
    fiscal_city = btrim(p_data->>'fiscal_city'), fiscal_state = v_state, fiscal_postal_code = v_postal,
    legal_representative_name = btrim(p_data->>'legal_representative_name'),
    legal_representative_email = lower(btrim(p_data->>'legal_representative_email')),
    legal_representative_phone = nullif(btrim(p_data->>'legal_representative_phone'), ''),
    operational_contact_name = btrim(p_data->>'operational_contact_name'),
    operational_contact_email = lower(btrim(p_data->>'operational_contact_email')),
    operational_contact_phone = nullif(btrim(p_data->>'operational_contact_phone'), ''),
    payment_terms_days = coalesce((p_data->>'payment_terms_days')::integer, 0),
    credit_limit_minor = coalesce((p_data->>'credit_limit_minor')::bigint, 0), updated_at = now()
  where c.id = p_company_id returning * into v_company;
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', p_company_id, 'COMPANY_UPDATED', 'company', p_company_id, 'SUCCESS',
    jsonb_build_object('before', v_previous, 'after', to_jsonb(v_company)));
  return query select v_company.id, v_company.display_name, v_company.status;
exception when unique_violation then raise exception 'COMPANY_ALREADY_EXISTS';
end; $$;

create or replace function public.admin_set_company_status(p_company_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_previous text;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_status is null or p_status not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_STATUS'; end if;
  select c.status into v_previous from public.companies c where c.id = p_company_id for update;
  if v_previous is null then raise exception 'COMPANY_NOT_FOUND'; end if;
  if v_previous not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  if v_previous = p_status then return true; end if;
  update public.companies c set status = p_status, updated_at = now() where c.id = p_company_id;
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', p_company_id, 'COMPANY_STATUS_CHANGED', 'company', p_company_id, 'SUCCESS',
    jsonb_build_object('from', v_previous, 'to', p_status));
  return true;
end; $$;

create or replace function public.admin_set_establishment_status(p_establishment_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_company_id uuid; v_current_status text;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_status is null or p_status not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_STATUS'; end if;
  select e.company_id, e.status into v_company_id, v_current_status from public.establishments e where e.id = p_establishment_id;
  if v_company_id is null then raise exception 'ESTABLISHMENT_NOT_FOUND'; end if;
  perform 1 from public.companies c where c.id = v_company_id for update;
  if p_status = v_current_status then return true; end if;
  if p_status = 'INACTIVE' and v_current_status = 'ACTIVE' then
    if not exists (select 1 from public.establishments e where e.company_id = v_company_id and e.id <> p_establishment_id and e.status = 'ACTIVE') then raise exception 'LAST_ACTIVE_ESTABLISHMENT'; end if;
    if exists (select 1 from public.carts c join public.cart_items ci on ci.cart_id = c.id where c.establishment_id = p_establishment_id and c.status = 'ACTIVE') then raise exception 'ACTIVE_CART_EXISTS'; end if;
  end if;
  update public.establishments e set status = p_status, updated_at = now() where e.id = p_establishment_id;
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'PLATFORM_ADMIN', v_company_id, 'ESTABLISHMENT_STATUS_CHANGED', 'establishment', p_establishment_id, 'SUCCESS',
    jsonb_build_object('from', v_current_status, 'to', p_status));
  return true;
end; $$;

revoke all on function public.has_active_membership(uuid) from public, anon;
grant execute on function public.has_active_membership(uuid) to authenticated;
