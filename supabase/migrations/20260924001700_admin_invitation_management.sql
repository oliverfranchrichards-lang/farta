create or replace function public.admin_list_company_invitations(p_company_id uuid)
returns table (invitation_id uuid, invited_email text, status text, expires_at timestamptz, created_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$ begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  return query select i.id, i.invited_email, i.status, i.expires_at, i.created_at from public.company_invitations i where i.company_id = p_company_id order by i.created_at desc;
end; $$;

create or replace function public.revoke_company_invitation(p_invitation_id uuid)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare v_updated integer;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  update public.company_invitations i set status = 'REVOKED', revoked_at = now(), updated_at = now() where i.id = p_invitation_id and i.status = 'PENDING';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'INVITATION_NOT_REVOCABLE'; end if;
  return true;
end; $$;

revoke all on function public.admin_list_company_invitations(uuid) from public, anon;
grant execute on function public.admin_list_company_invitations(uuid) to authenticated;
revoke all on function public.revoke_company_invitation(uuid) from public, anon;
grant execute on function public.revoke_company_invitation(uuid) to authenticated;
