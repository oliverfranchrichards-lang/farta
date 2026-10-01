create or replace function public.bootstrap_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_full_name text;
begin
  v_company_id := nullif(new.raw_user_meta_data->>'company_id', '')::uuid;
  if v_company_id is null then select id into v_company_id from public.companies where status = 'ACTIVE' order by created_at limit 1; end if;
  v_full_name := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1), 'Usuário ProStock');
  if v_company_id is not null then
    insert into public.profiles (id, company_id, role, full_name) values (new.id, v_company_id, 'CUSTOMER', v_full_name) on conflict (id) do update set full_name = excluded.full_name, company_id = excluded.company_id, updated_at = now();
    insert into public.company_memberships (profile_id, company_id, status) values (new.id, v_company_id, 'ACTIVE') on conflict (profile_id, company_id) do update set status = 'ACTIVE', revoked_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.bootstrap_profile_for_user();

insert into public.profiles (id, company_id, role, full_name)
select u.id, c.id, 'CUSTOMER', coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1), 'Usuário ProStock')
from auth.users u cross join lateral (select id from public.companies where status = 'ACTIVE' order by created_at limit 1) c
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

insert into public.company_memberships (profile_id, company_id, status)
select p.id, p.company_id, 'ACTIVE' from public.profiles p where p.company_id is not null
on conflict (profile_id, company_id) do update set status = 'ACTIVE', revoked_at = null;
