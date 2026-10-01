-- Company data and invitation-only CUSTOMER onboarding.
-- Existing active profiles and memberships are intentionally preserved.

alter table public.companies
  drop constraint if exists companies_status_check;

alter table public.companies
  add column if not exists tax_id text,
  add column if not exists state_registration text,
  add column if not exists corporate_email text,
  add column if not exists corporate_phone text,
  add column if not exists fiscal_address_line text,
  add column if not exists fiscal_address_number text,
  add column if not exists fiscal_address_complement text,
  add column if not exists fiscal_district text,
  add column if not exists fiscal_city text,
  add column if not exists fiscal_state text,
  add column if not exists fiscal_postal_code text,
  add column if not exists legal_representative_name text,
  add column if not exists legal_representative_email text,
  add column if not exists legal_representative_phone text,
  add column if not exists operational_contact_name text,
  add column if not exists operational_contact_email text,
  add column if not exists operational_contact_phone text,
  add column if not exists payment_terms_days integer,
  add column if not exists credit_limit_minor bigint;

alter table public.companies
  add constraint companies_status_check
    check (status in ('PENDING_SETUP', 'ACTIVE', 'INACTIVE', 'BLOCKED')),
  add constraint companies_tax_id_format_check
    check (tax_id is null or tax_id ~ '^[0-9]{14}$'),
  add constraint companies_state_format_check
    check (fiscal_state is null or fiscal_state ~ '^[A-Z]{2}$'),
  add constraint companies_postal_code_format_check
    check (fiscal_postal_code is null or fiscal_postal_code ~ '^[0-9]{5}-?[0-9]{3}$'),
  add constraint companies_payment_terms_check
    check (payment_terms_days is null or payment_terms_days >= 0),
  add constraint companies_credit_limit_check
    check (credit_limit_minor is null or credit_limit_minor >= 0);

create unique index if not exists companies_tax_id_unique
  on public.companies (tax_id)
  where tax_id is not null;

alter table public.profiles
  drop constraint if exists profiles_status_check,
  drop constraint if exists profiles_check;

alter table public.profiles
  add constraint profiles_status_check
    check (status in ('PENDING', 'ACTIVE', 'INACTIVE')),
  add constraint profiles_role_company_check
    check (
      (role = 'CUSTOMER' and (
        (company_id is null and status = 'PENDING')
        or company_id is not null
      ))
      or (role <> 'CUSTOMER' and company_id is null)
    );

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  invited_email text not null,
  token_hash text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  expires_at timestamptz not null,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  accepted_by_profile_id uuid references public.profiles(id) on delete restrict,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (invited_email = lower(btrim(invited_email))),
  check (expires_at > created_at),
  check ((status = 'ACCEPTED') = (accepted_at is not null)),
  check ((status = 'ACCEPTED') = (accepted_by_profile_id is not null)),
  check ((status = 'REVOKED') = (revoked_at is not null))
);

create unique index company_invitations_one_pending_email_idx
  on public.company_invitations (company_id, invited_email)
  where status = 'PENDING';
create index company_invitations_pending_expiry_idx
  on public.company_invitations (expires_at)
  where status = 'PENDING';

alter table public.company_invitations enable row level security;

-- A new Auth identity is deliberately unprovisioned. Auth metadata is not a
-- source of authorization and never determines Company or role.
create or replace function public.bootstrap_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, company_id, role, full_name, status)
  values (
    new.id,
    null,
    'CUSTOMER',
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1), 'Usuário ProStock'),
    'PENDING'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.bootstrap_profile_for_user() from public, anon, authenticated;

-- Pending accounts must not see the shared catalog before their invitation is
-- accepted. All tenant-sensitive policies already use has_active_membership.
drop policy if exists catalog_authenticated_read on public.categories;
drop policy if exists products_authenticated_read on public.products;
drop policy if exists variants_authenticated_read on public.product_variants;
drop policy if exists images_authenticated_read on public.product_images;
create policy catalog_member_read on public.categories for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.company_id is not null)
);
create policy products_member_read on public.products for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.company_id is not null)
);
create policy variants_member_read on public.product_variants for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.company_id is not null)
);
create policy images_member_read on public.product_images for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' and p.company_id is not null)
);

create or replace function public.create_company_invitation(
  p_company_id uuid,
  p_invited_email text,
  p_expires_in interval default interval '7 days'
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
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
  v_email := lower(btrim(coalesce(p_invited_email, '')));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
  if p_expires_in is null or p_expires_in < interval '1 hour' or p_expires_in > interval '30 days' then raise exception 'INVALID_EXPIRY'; end if;
  if exists (select 1 from public.company_invitations where company_id = p_company_id and invited_email = v_email and status = 'PENDING') then raise exception 'INVITATION_ALREADY_PENDING'; end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + p_expires_in;
  insert into public.company_invitations (company_id, invited_email, token_hash, expires_at, created_by_profile_id)
  values (p_company_id, v_email, encode(digest(v_token, 'sha256'), 'hex'), v_expires_at, v_actor.id)
  returning id into v_invitation_id;
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (v_actor.id, v_actor.role, p_company_id, 'COMPANY_INVITATION_CREATED', 'company_invitation', v_invitation_id, 'SUCCESS', jsonb_build_object('invited_email', v_email, 'expires_at', v_expires_at));
  return query select v_invitation_id, v_token, v_expires_at;
end;
$$;

create or replace function public.accept_company_invitation(
  p_invitation_token text,
  p_full_name text default null
)
returns table (company_id uuid, company_name text)
language plpgsql
security definer
set search_path = public, auth, extensions
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
  if v_email is null then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  select * into v_invitation from public.company_invitations
  where token_hash = encode(digest(p_invitation_token, 'sha256'), 'hex')
  for update;
  if v_invitation.id is null then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  if v_invitation.status = 'ACCEPTED' then
    if v_invitation.accepted_by_profile_id = auth.uid() then
      return query select c.id, c.display_name from public.companies c where c.id = v_invitation.company_id;
      return;
    end if;
    raise exception 'INVITATION_NOT_AVAILABLE';
  end if;
  if v_invitation.status <> 'PENDING' or v_invitation.expires_at <= now() or v_invitation.invited_email <> v_email then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  if not exists (select 1 from public.companies where id = v_invitation.company_id and status = 'ACTIVE') then raise exception 'COMPANY_NOT_AVAILABLE'; end if;

  select * into v_profile from public.profiles where id = auth.uid() for update;
  if v_profile.id is null then
    v_full_name := coalesce(nullif(btrim(p_full_name), ''), split_part(v_email, '@', 1));
    if length(v_full_name) < 2 or length(v_full_name) > 160 then raise exception 'INVALID_FULL_NAME'; end if;
    insert into public.profiles (id, company_id, role, full_name, status)
    values (auth.uid(), null, 'CUSTOMER', v_full_name, 'PENDING') returning * into v_profile;
  end if;
  if v_profile.role <> 'CUSTOMER' then raise exception 'INVITATION_NOT_AVAILABLE'; end if;
  if v_profile.company_id is not null and v_profile.company_id <> v_invitation.company_id then raise exception 'PROFILE_ALREADY_LINKED'; end if;

  update public.profiles set company_id = v_invitation.company_id, status = 'ACTIVE',
    full_name = coalesce(nullif(btrim(p_full_name), ''), full_name), updated_at = now()
  where id = auth.uid();
  insert into public.company_memberships (profile_id, company_id, status, granted_by_profile_id, revoked_at)
  values (auth.uid(), v_invitation.company_id, 'ACTIVE', v_invitation.created_by_profile_id, null)
  on conflict (profile_id, company_id) do update set status = 'ACTIVE', revoked_at = null;
  update public.company_invitations set status = 'ACCEPTED', accepted_by_profile_id = auth.uid(), accepted_at = now(), updated_at = now()
  where id = v_invitation.id;
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), 'CUSTOMER', v_invitation.company_id, 'COMPANY_INVITATION_ACCEPTED', 'company_invitation', v_invitation.id, 'SUCCESS', '{}'::jsonb);
  return query select c.id, c.display_name from public.companies c where c.id = v_invitation.company_id;
end;
$$;

revoke all on function public.create_company_invitation(uuid, text, interval) from public, anon;
grant execute on function public.create_company_invitation(uuid, text, interval) to authenticated;
revoke all on function public.accept_company_invitation(text, text) from public, anon;
grant execute on function public.accept_company_invitation(text, text) to authenticated;
