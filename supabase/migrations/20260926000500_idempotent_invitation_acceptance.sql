create or replace function public.accept_company_invitation(p_invitation_token text, p_full_name text default null)
returns table (company_id uuid, company_name text)
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare v_invitation public.company_invitations%rowtype; v_profile public.profiles%rowtype; v_email text; v_full_name text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if p_invitation_token is null or length(p_invitation_token) <> 64 or p_invitation_token !~ '^[0-9a-f]+$' then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_invitation from public.company_invitations where token_hash = encode(digest(p_invitation_token, 'sha256'), 'hex') for update;
  if v_invitation.id is null then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  if v_invitation.status = 'ACCEPTED' and v_invitation.accepted_by_profile_id = auth.uid() then
    return query select c.id, c.display_name from public.companies c where c.id = v_invitation.company_id;
    return;
  end if;
  if v_invitation.status <> 'PENDING' or v_invitation.expires_at <= now() or v_invitation.invited_email <> v_email then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  if not exists (select 1 from public.companies where id = v_invitation.company_id and status = 'ACTIVE') then raise exception 'COMPANY_NOT_AVAILABLE'; end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if v_profile.id is null then
    v_full_name := coalesce(nullif(btrim(p_full_name), ''), split_part(v_email, '@', 1));
    if length(v_full_name) < 2 or length(v_full_name) > 160 then raise exception 'INVALID_FULL_NAME'; end if;
    insert into public.profiles (id, company_id, role, full_name, status) values (auth.uid(), null, v_invitation.invited_role, v_full_name, 'PENDING') returning * into v_profile;
  end if;
  if v_profile.status <> 'PENDING' or v_profile.company_id is not null then raise exception 'PROFILE_ALREADY_LINKED'; end if;
  update public.profiles set company_id = v_invitation.company_id, role = v_invitation.invited_role, status = 'ACTIVE', full_name = coalesce(nullif(btrim(p_full_name), ''), full_name), updated_at = now() where id = auth.uid();
  insert into public.company_memberships (profile_id, company_id, status, granted_by_profile_id, revoked_at) values (auth.uid(), v_invitation.company_id, 'ACTIVE', v_invitation.created_by_profile_id, null) on conflict (profile_id, company_id) do update set status = 'ACTIVE', revoked_at = null;
  update public.company_invitations set status = 'ACCEPTED', accepted_by_profile_id = auth.uid(), accepted_at = now(), updated_at = now() where id = v_invitation.id;
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), v_invitation.invited_role, v_invitation.company_id, 'COMPANY_INVITATION_ACCEPTED', 'company_invitation', v_invitation.id, 'SUCCESS', '{}'::jsonb);
  return query select c.id, c.display_name from public.companies c where c.id = v_invitation.company_id;
end; $$;
