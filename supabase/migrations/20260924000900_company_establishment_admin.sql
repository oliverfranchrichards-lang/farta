create or replace function public.create_company(p_company jsonb)
returns table (id uuid, display_name text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_company public.companies;
  v_tax_id text := regexp_replace(coalesce(p_company->>'tax_id', ''), '\D', '', 'g');
  v_state text := upper(btrim(coalesce(p_company->>'fiscal_state', '')));
  v_postal text := regexp_replace(coalesce(p_company->>'fiscal_postal_code', ''), '\D', '', 'g');
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'PLATFORM_ADMIN' and status = 'ACTIVE') then
    raise exception 'FORBIDDEN';
  end if;
  if nullif(btrim(p_company->>'legal_name'), '') is null or nullif(btrim(p_company->>'display_name'), '') is null
    or length(v_tax_id) <> 14 or v_state !~ '^[A-Z]{2}$' or length(v_postal) <> 8
    or nullif(btrim(p_company->>'corporate_email'), '') is null
    or nullif(btrim(p_company->>'fiscal_address_line'), '') is null
    or nullif(btrim(p_company->>'fiscal_address_number'), '') is null
    or nullif(btrim(p_company->>'fiscal_district'), '') is null
    or nullif(btrim(p_company->>'fiscal_city'), '') is null
    or nullif(btrim(p_company->>'legal_representative_name'), '') is null
    or nullif(btrim(p_company->>'legal_representative_email'), '') is null
    or nullif(btrim(p_company->>'operational_contact_name'), '') is null
    or nullif(btrim(p_company->>'operational_contact_email'), '') is null then
    raise exception 'INVALID_COMPANY_DATA';
  end if;
  insert into public.companies (
    legal_name, display_name, status, tax_id, state_registration, corporate_email, corporate_phone,
    fiscal_address_line, fiscal_address_number, fiscal_address_complement, fiscal_district, fiscal_city,
    fiscal_state, fiscal_postal_code, legal_representative_name, legal_representative_email,
    legal_representative_phone, operational_contact_name, operational_contact_email, operational_contact_phone,
    payment_terms_days, credit_limit_minor
  ) values (
    btrim(p_company->>'legal_name'), btrim(p_company->>'display_name'), 'ACTIVE', v_tax_id,
    nullif(btrim(p_company->>'state_registration'), ''), lower(btrim(p_company->>'corporate_email')),
    nullif(btrim(p_company->>'corporate_phone'), ''), btrim(p_company->>'fiscal_address_line'),
    btrim(p_company->>'fiscal_address_number'), nullif(btrim(p_company->>'fiscal_address_complement'), ''),
    btrim(p_company->>'fiscal_district'), btrim(p_company->>'fiscal_city'), v_state, v_postal,
    btrim(p_company->>'legal_representative_name'), lower(btrim(p_company->>'legal_representative_email')),
    nullif(btrim(p_company->>'legal_representative_phone'), ''), btrim(p_company->>'operational_contact_name'),
    lower(btrim(p_company->>'operational_contact_email')), nullif(btrim(p_company->>'operational_contact_phone'), ''),
    greatest(coalesce((p_company->>'payment_terms_days')::integer, 0), 0),
    greatest(coalesce((p_company->>'credit_limit_minor')::bigint, 0), 0)
  ) returning * into v_company;
  return query select v_company.id, v_company.display_name;
exception when unique_violation then
  raise exception 'COMPANY_ALREADY_EXISTS';
end;
$$;

create or replace function public.create_establishment(p_company_id uuid, p_name text, p_address jsonb)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_establishment public.establishments;
  v_address public.addresses;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'PLATFORM_ADMIN' and status = 'ACTIVE') then
    raise exception 'FORBIDDEN';
  end if;
  if p_company_id is null or not exists (select 1 from public.companies where id = p_company_id and status = 'ACTIVE')
    or nullif(btrim(p_name), '') is null
    or nullif(btrim(p_address->>'label'), '') is null
    or nullif(btrim(p_address->>'address_line'), '') is null
    or nullif(btrim(p_address->>'address_number'), '') is null
    or nullif(btrim(p_address->>'district'), '') is null
    or nullif(btrim(p_address->>'city'), '') is null
    or upper(btrim(coalesce(p_address->>'state', ''))) !~ '^[A-Z]{2}$'
    or length(regexp_replace(coalesce(p_address->>'postal_code', ''), '\D', '', 'g')) <> 8 then
    raise exception 'INVALID_ESTABLISHMENT_DATA';
  end if;
  insert into public.establishments (company_id, name, status)
  values (p_company_id, btrim(p_name), 'ACTIVE') returning * into v_establishment;
  insert into public.addresses (establishment_id, label, address_line, address_number, address_complement, district, city, state, postal_code, is_default)
  values (v_establishment.id, btrim(p_address->>'label'), btrim(p_address->>'address_line'), btrim(p_address->>'address_number'),
    nullif(btrim(p_address->>'address_complement'), ''), btrim(p_address->>'district'), btrim(p_address->>'city'),
    upper(btrim(p_address->>'state')), regexp_replace(p_address->>'postal_code', '\D', '', 'g'), true)
  returning * into v_address;
  return query select v_establishment.id, v_establishment.name;
exception when unique_violation then
  raise exception 'ESTABLISHMENT_ALREADY_EXISTS';
end;
$$;

revoke all on function public.create_company(jsonb) from public, anon;
grant execute on function public.create_company(jsonb) to authenticated;
revoke all on function public.create_establishment(uuid, text, jsonb) from public, anon;
grant execute on function public.create_establishment(uuid, text, jsonb) to authenticated;
