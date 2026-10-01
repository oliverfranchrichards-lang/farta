create or replace function public.create_establishment(p_company_id uuid, p_name text, p_address jsonb)
returns table (id uuid, name text)
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare v_establishment public.establishments; v_address public.addresses;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_company_id is null or not exists (select 1 from public.companies c where c.id = p_company_id and c.status = 'ACTIVE') or nullif(btrim(p_name), '') is null or nullif(btrim(p_address->>'label'), '') is null or nullif(btrim(p_address->>'address_line'), '') is null or nullif(btrim(p_address->>'address_number'), '') is null or nullif(btrim(p_address->>'district'), '') is null or nullif(btrim(p_address->>'city'), '') is null or upper(btrim(coalesce(p_address->>'state', ''))) !~ '^[A-Z]{2}$' or length(regexp_replace(coalesce(p_address->>'postal_code', ''), '\D', '', 'g')) <> 8 then raise exception 'INVALID_ESTABLISHMENT_DATA'; end if;
  insert into public.establishments (company_id, name, status) values (p_company_id, btrim(p_name), 'ACTIVE') returning * into v_establishment;
  insert into public.addresses (establishment_id, label, address_line, address_number, address_complement, district, city, state, postal_code, is_default)
  values (v_establishment.id, btrim(p_address->>'label'), btrim(p_address->>'address_line'), btrim(p_address->>'address_number'), nullif(btrim(p_address->>'address_complement'), ''), btrim(p_address->>'district'), btrim(p_address->>'city'), upper(btrim(p_address->>'state')), regexp_replace(p_address->>'postal_code', '\D', '', 'g'), true) returning * into v_address;
  return query select v_establishment.id, v_establishment.name;
exception when unique_violation then raise exception 'ESTABLISHMENT_ALREADY_EXISTS';
end; $$;
