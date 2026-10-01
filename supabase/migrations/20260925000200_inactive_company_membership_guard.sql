create or replace function public.has_active_membership(target_company_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    join public.company_memberships m on m.profile_id = p.id and m.company_id = target_company_id
    join public.companies c on c.id = m.company_id
    where p.id = auth.uid() and p.status = 'ACTIVE' and m.status = 'ACTIVE' and c.status = 'ACTIVE'
  );
$$;
