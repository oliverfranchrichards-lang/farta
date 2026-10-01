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
  if p_status = 'INACTIVE' and v_current_status = 'ACTIVE' then
    if not exists (select 1 from public.establishments e where e.company_id = v_company_id and e.id <> p_establishment_id and e.status = 'ACTIVE') then raise exception 'LAST_ACTIVE_ESTABLISHMENT'; end if;
    if exists (select 1 from public.carts c join public.cart_items ci on ci.cart_id = c.id where c.establishment_id = p_establishment_id and c.status = 'ACTIVE') then raise exception 'ACTIVE_CART_EXISTS'; end if;
  end if;
  update public.establishments e set status = p_status, updated_at = now() where e.id = p_establishment_id;
  return true;
end; $$;
