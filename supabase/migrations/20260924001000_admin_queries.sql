create or replace function public.admin_list_companies()
returns table (id uuid, legal_name text, display_name text, tax_id text, status text, establishments_count bigint)
language plpgsql security definer set search_path = public, auth
as $$ begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'PLATFORM_ADMIN' and status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  return query select c.id, c.legal_name, c.display_name, c.tax_id, c.status, count(e.id)::bigint
    from public.companies c left join public.establishments e on e.company_id = c.id group by c.id order by c.display_name;
end; $$;

create or replace function public.admin_list_establishments(p_company_id uuid)
returns table (id uuid, name text, status text, address_label text, city text, state text)
language plpgsql security definer set search_path = public, auth
as $$ begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'PLATFORM_ADMIN' and status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  return query select e.id, e.name, e.status, a.label, a.city, a.state from public.establishments e
    left join lateral (select x.label, x.city, x.state from public.addresses x where x.establishment_id = e.id and x.status = 'ACTIVE' order by x.is_default desc, x.created_at limit 1) a on true
    where e.company_id = p_company_id order by e.name;
end; $$;

revoke all on function public.admin_list_companies() from public, anon;
grant execute on function public.admin_list_companies() to authenticated;
revoke all on function public.admin_list_establishments(uuid) from public, anon;
grant execute on function public.admin_list_establishments(uuid) to authenticated;
