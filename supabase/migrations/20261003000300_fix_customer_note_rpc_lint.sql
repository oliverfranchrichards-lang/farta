-- Replace the first note implementation with a small compatibility wrapper.
-- The hardened legacy implementation remains the authority for all order
-- validation; this wrapper only adds note normalization and idempotency.
create or replace function public.submit_order_for_review_with_note(
  p_cart_id uuid,
  p_address_id uuid,
  p_window_label text,
  p_customer_note text default null,
  p_idempotency_key text default null
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_customer_note text := nullif(btrim(coalesce(p_customer_note, '')), '');
  v_request_hash text;
  v_existing_hash text;
  v_existing_body jsonb;
  v_order_id uuid;
  v_order_number bigint;
begin
  if v_customer_note is not null and char_length(v_customer_note) > 500 then
    raise exception 'INVALID_CUSTOMER_NOTE';
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'CUSTOMER'
    and p.status = 'ACTIVE';
  if v_profile.id is null or v_profile.company_id is null then
    raise exception 'ACTIVE_PROFILE_REQUIRED';
  end if;
  if not public.has_active_membership(v_profile.company_id) then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED';
  end if;

  v_request_hash := md5(concat_ws(
    '|', p_cart_id::text, p_address_id::text, btrim(p_window_label),
    coalesce(v_customer_note, '')
  ));

  if nullif(trim(p_idempotency_key), '') is not null then
    if length(trim(p_idempotency_key)) > 200 then
      raise exception 'INVALID_IDEMPOTENCY_KEY';
    end if;
    insert into public.idempotency_records(
      scope_key, actor_profile_id, command, idempotency_key, request_hash, expires_at
    ) values (
      v_profile.company_id::text, v_profile.id,
      'SUBMIT_ORDER_FOR_REVIEW_WITH_NOTE', trim(p_idempotency_key),
      v_request_hash, now() + interval '24 hours'
    ) on conflict (scope_key, actor_profile_id, command, idempotency_key) do nothing;

    select r.request_hash, r.response_body
      into v_existing_hash, v_existing_body
    from public.idempotency_records r
    where r.scope_key = v_profile.company_id::text
      and r.actor_profile_id = v_profile.id
      and r.command = 'SUBMIT_ORDER_FOR_REVIEW_WITH_NOTE'
      and r.idempotency_key = trim(p_idempotency_key)
    for update;
    if v_existing_hash <> v_request_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    if v_existing_body is not null and v_existing_body ? 'order_id' then
      return query select
        (v_existing_body->>'order_id')::uuid,
        (v_existing_body->>'order_number')::bigint;
      return;
    end if;
  end if;

  -- Passing NULL prevents the legacy wrapper from creating a second
  -- idempotency record with the old hash/command.
  select result.order_id, result.order_number
    into v_order_id, v_order_number
  from public.submit_order_for_review(
    p_cart_id, p_address_id, p_window_label, null
  ) result;

  update public.orders
  set customer_note = v_customer_note
  where id = v_order_id
    and created_by_profile_id = v_profile.id
    and company_id = v_profile.company_id;

  if nullif(trim(p_idempotency_key), '') is not null then
    update public.idempotency_records
    set response_status = 200,
        response_body = jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number)
    where scope_key = v_profile.company_id::text
      and actor_profile_id = v_profile.id
      and command = 'SUBMIT_ORDER_FOR_REVIEW_WITH_NOTE'
      and idempotency_key = trim(p_idempotency_key);
  end if;

  return query select v_order_id, v_order_number;
end;
$$;

revoke all on function public.submit_order_for_review_with_note(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.submit_order_for_review_with_note(uuid, uuid, text, text, text) to authenticated;
