create or replace function public.create_company_invitation(p_company_id uuid, p_invited_email text, p_expires_in interval default '7 days')
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare v_email text; v_token text; v_invitation public.company_invitations; v_profile public.profiles; v_expiry timestamptz;
begin
  select * into v_profile from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE';
  if v_profile.id is null then raise exception 'INVITATION_NOT_AUTHORIZED'; end if;
  v_email := lower(btrim(coalesce(p_invited_email, '')));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_EMAIL'; end if;
  if p_expires_in < interval '1 day' or p_expires_in > interval '30 days' then raise exception 'INVALID_EXPIRY'; end if;
  update public.company_invitations set status = 'EXPIRED', updated_at = now() where company_id = p_company_id and invited_email = v_email and status = 'PENDING' and expires_at <= now();
  if not exists (select 1 from public.companies c where c.id = p_company_id and c.status = 'ACTIVE') then raise exception 'COMPANY_NOT_AVAILABLE'; end if;
  if exists (select 1 from public.company_invitations i where i.company_id = p_company_id and i.invited_email = v_email and i.status = 'PENDING') then raise exception 'INVITATION_ALREADY_PENDING'; end if;
  v_token := encode(gen_random_bytes(32), 'hex'); v_expiry := now() + p_expires_in;
  insert into public.company_invitations (company_id, invited_email, token_hash, status, expires_at, created_by_profile_id)
    values (p_company_id, v_email, encode(digest(v_token, 'sha256'), 'hex'), 'PENDING', v_expiry, auth.uid()) returning * into v_invitation;
  return query select v_invitation.id, v_token, v_invitation.expires_at;
end; $$;
