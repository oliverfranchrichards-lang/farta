-- Expired invitations are no longer considered pending when an administrator
-- creates a replacement for the same Company/e-mail pair.
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

  update public.company_invitations
  set status = 'EXPIRED', updated_at = now()
  where company_id = p_company_id and invited_email = v_email and status = 'PENDING' and expires_at <= now();
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

revoke all on function public.create_company_invitation(uuid, text, interval) from public, anon;
grant execute on function public.create_company_invitation(uuid, text, interval) to authenticated;
