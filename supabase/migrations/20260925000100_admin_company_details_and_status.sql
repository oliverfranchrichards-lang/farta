create or replace function public.admin_get_company(p_company_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare v_company public.companies;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  select c.* into v_company from public.companies c where c.id = p_company_id;
  if v_company.id is null then raise exception 'COMPANY_NOT_FOUND'; end if;
  return to_jsonb(v_company);
end; $$;

create or replace function public.admin_update_company(p_company_id uuid, p_data jsonb)
returns table (id uuid, display_name text, status text)
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare
  v_company public.companies;
  v_tax text := regexp_replace(coalesce(p_data->>'tax_id', ''), '\D', '', 'g');
  v_state text := upper(btrim(coalesce(p_data->>'fiscal_state', '')));
  v_postal text := regexp_replace(coalesce(p_data->>'fiscal_postal_code', ''), '\D', '', 'g');
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if not exists (select 1 from public.companies c where c.id = p_company_id) then raise exception 'COMPANY_NOT_FOUND'; end if;
  if nullif(btrim(p_data->>'legal_name'), '') is null or nullif(btrim(p_data->>'display_name'), '') is null
    or length(v_tax) <> 14 or v_state !~ '^[A-Z]{2}$' or length(v_postal) <> 8
    or nullif(btrim(p_data->>'corporate_email'), '') is null or nullif(btrim(p_data->>'fiscal_address_line'), '') is null
    or nullif(btrim(p_data->>'fiscal_address_number'), '') is null or nullif(btrim(p_data->>'fiscal_district'), '') is null
    or nullif(btrim(p_data->>'fiscal_city'), '') is null or nullif(btrim(p_data->>'legal_representative_name'), '') is null
    or nullif(btrim(p_data->>'legal_representative_email'), '') is null or nullif(btrim(p_data->>'operational_contact_name'), '') is null
    or nullif(btrim(p_data->>'operational_contact_email'), '') is null
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
  return query select v_company.id, v_company.display_name, v_company.status;
exception when unique_violation then raise exception 'COMPANY_ALREADY_EXISTS';
end; $$;

create or replace function public.admin_set_company_status(p_company_id uuid, p_status text)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare v_updated integer;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_status is null or p_status not in ('ACTIVE', 'INACTIVE') then raise exception 'INVALID_STATUS'; end if;
  update public.companies c set status = p_status, updated_at = now() where c.id = p_company_id;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'COMPANY_NOT_FOUND'; end if;
  return true;
end; $$;

revoke all on function public.admin_get_company(uuid) from public, anon;
grant execute on function public.admin_get_company(uuid) to authenticated;
revoke all on function public.admin_update_company(uuid, jsonb) from public, anon;
grant execute on function public.admin_update_company(uuid, jsonb) to authenticated;
revoke all on function public.admin_set_company_status(uuid, text) from public, anon;
grant execute on function public.admin_set_company_status(uuid, text) to authenticated;
