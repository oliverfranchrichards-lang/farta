-- Allow company-scoped staff profiles and preserve invitation-only onboarding.
alter table public.profiles drop constraint if exists profiles_role_company_check;
alter table public.profiles add constraint profiles_role_company_check check (
  (role = 'PLATFORM_ADMIN' and company_id is null)
  or (role = 'CUSTOMER' and ((company_id is null and status = 'PENDING') or company_id is not null))
  or (role in ('INTERNAL_OPERATOR', 'DRIVER') and ((company_id is null and status = 'PENDING') or company_id is not null))
);

alter table public.company_invitations
  add column if not exists invited_role text not null default 'CUSTOMER';
alter table public.company_invitations drop constraint if exists company_invitations_invited_role_check;
alter table public.company_invitations add constraint company_invitations_invited_role_check
  check (invited_role in ('CUSTOMER', 'INTERNAL_OPERATOR', 'DRIVER'));

create or replace function public.create_company_invitation(
  p_company_id uuid,
  p_invited_email text,
  p_invited_role text,
  p_expires_in interval default interval '7 days'
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_actor public.profiles%rowtype;
  v_email text;
  v_token text;
  v_expires_at timestamptz;
  v_invitation_id uuid;
begin
  select * into v_actor from public.profiles where id = auth.uid() and status = 'ACTIVE';
  if v_actor.id is null or v_actor.role <> 'PLATFORM_ADMIN' then raise exception 'INVITATION_NOT_AUTHORIZED'; end if;
  if p_company_id is null or not exists (select 1 from public.companies where id = p_company_id and status = 'ACTIVE') then raise exception 'COMPANY_NOT_AVAILABLE'; end if;
  if p_invited_role is null or p_invited_role not in ('CUSTOMER', 'INTERNAL_OPERATOR', 'DRIVER') then raise exception 'INVALID_INVITED_ROLE'; end if;
  v_email := lower(btrim(coalesce(p_invited_email, '')));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
  if p_expires_in is null or p_expires_in < interval '1 hour' or p_expires_in > interval '30 days' then raise exception 'INVALID_EXPIRY'; end if;
  if exists (select 1 from public.company_invitations where company_id = p_company_id and invited_email = v_email and status = 'PENDING') then raise exception 'INVITATION_ALREADY_PENDING'; end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + p_expires_in;
  insert into public.company_invitations (company_id, invited_email, invited_role, token_hash, expires_at, created_by_profile_id)
  values (p_company_id, v_email, p_invited_role, encode(digest(v_token, 'sha256'), 'hex'), v_expires_at, v_actor.id)
  returning id into v_invitation_id;
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (v_actor.id, v_actor.role, p_company_id, 'COMPANY_INVITATION_CREATED', 'company_invitation', v_invitation_id, 'SUCCESS', jsonb_build_object('invited_email', v_email, 'invited_role', p_invited_role, 'expires_at', v_expires_at));
  return query select v_invitation_id, v_token, v_expires_at;
end;
$$;

create or replace function public.accept_company_invitation(
  p_invitation_token text,
  p_full_name text default null
)
returns table (company_id uuid, company_name text)
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare
  v_invitation public.company_invitations%rowtype;
  v_profile public.profiles%rowtype;
  v_email text;
  v_full_name text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if p_invitation_token is null or length(p_invitation_token) <> 64 or p_invitation_token !~ '^[0-9a-f]+$' then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_invitation from public.company_invitations where token_hash = encode(digest(p_invitation_token, 'sha256'), 'hex') for update;
  if v_invitation.id is null or v_invitation.status <> 'PENDING' or v_invitation.expires_at <= now() or v_invitation.invited_email <> v_email then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  if not exists (select 1 from public.companies where id = v_invitation.company_id and status = 'ACTIVE') then raise exception 'COMPANY_NOT_AVAILABLE'; end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if v_profile.id is null then
    v_full_name := coalesce(nullif(btrim(p_full_name), ''), split_part(v_email, '@', 1));
    if length(v_full_name) < 2 or length(v_full_name) > 160 then raise exception 'INVALID_FULL_NAME'; end if;
    insert into public.profiles (id, company_id, role, full_name, status) values (auth.uid(), null, v_invitation.invited_role, v_full_name, 'PENDING') returning * into v_profile;
  end if;
  if v_profile.status <> 'PENDING' or v_profile.company_id is not null then raise exception 'PROFILE_ALREADY_LINKED'; end if;
  update public.profiles set company_id = v_invitation.company_id, role = v_invitation.invited_role, status = 'ACTIVE', full_name = coalesce(nullif(btrim(p_full_name), ''), full_name), updated_at = now() where id = auth.uid();
  insert into public.company_memberships (profile_id, company_id, status, granted_by_profile_id, revoked_at)
  values (auth.uid(), v_invitation.company_id, 'ACTIVE', v_invitation.created_by_profile_id, null)
  on conflict (profile_id, company_id) do update set status = 'ACTIVE', revoked_at = null;
  update public.company_invitations set status = 'ACCEPTED', accepted_by_profile_id = auth.uid(), accepted_at = now(), updated_at = now() where id = v_invitation.id;
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), v_invitation.invited_role, v_invitation.company_id, 'COMPANY_INVITATION_ACCEPTED', 'company_invitation', v_invitation.id, 'SUCCESS', '{}'::jsonb);
  return query select c.id, c.display_name from public.companies c where c.id = v_invitation.company_id;
end;
$$;

revoke all on function public.create_company_invitation(uuid, text, interval) from public, anon;
grant execute on function public.create_company_invitation(uuid, text, interval) to authenticated;
revoke all on function public.create_company_invitation(uuid, text, text, interval) from public, anon;
grant execute on function public.create_company_invitation(uuid, text, text, interval) to authenticated;
revoke all on function public.accept_company_invitation(text, text) from public, anon;
grant execute on function public.accept_company_invitation(text, text) to authenticated;

-- Keep the old three-argument RPC available for existing callers.
create or replace function public.create_company_invitation(
  p_company_id uuid,
  p_invited_email text,
  p_expires_in interval default interval '7 days'
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language sql security definer set search_path = public, extensions
as $$ select * from public.create_company_invitation(p_company_id, p_invited_email, 'CUSTOMER'::text, p_expires_in) $$;

revoke all on function public.create_company_invitation(uuid, text, interval) from public, anon;
grant execute on function public.create_company_invitation(uuid, text, interval) to authenticated;
