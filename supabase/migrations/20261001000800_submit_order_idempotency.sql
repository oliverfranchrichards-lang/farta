-- Make retries of the same customer submission return the original order.
-- The implementation is kept private behind a small idempotency boundary.
alter function public.submit_order_for_review(uuid, uuid, text, text)
  rename to submit_order_for_review_impl;

create or replace function public.submit_order_for_review(
  p_cart_id uuid,
  p_address_id uuid,
  p_window_label text,
  p_idempotency_key text default null
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_request_hash text := md5(concat_ws('|', p_cart_id::text, p_address_id::text, p_window_label));
  v_existing_hash text;
  v_existing_body jsonb;
  v_order_id uuid;
  v_order_number bigint;
begin
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid() and p.role = 'CUSTOMER' and p.status = 'ACTIVE';
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;

  if nullif(trim(p_idempotency_key), '') is not null then
    if length(trim(p_idempotency_key)) > 200 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
    insert into public.idempotency_records(scope_key, actor_profile_id, command, idempotency_key, request_hash, expires_at)
    values (v_profile.company_id::text, v_profile.id, 'SUBMIT_ORDER_FOR_REVIEW', trim(p_idempotency_key), v_request_hash, now() + interval '24 hours')
    on conflict (scope_key, actor_profile_id, command, idempotency_key) do nothing;

    select r.request_hash, r.response_body into v_existing_hash, v_existing_body
    from public.idempotency_records r
    where r.scope_key = v_profile.company_id::text
      and r.actor_profile_id = v_profile.id
      and r.command = 'SUBMIT_ORDER_FOR_REVIEW'
      and r.idempotency_key = trim(p_idempotency_key)
    for update;
    if v_existing_hash <> v_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if;
    if v_existing_body is not null and v_existing_body ? 'order_id' then
      return query select (v_existing_body->>'order_id')::uuid, (v_existing_body->>'order_number')::bigint;
      return;
    end if;
  end if;

  select result.order_id, result.order_number into v_order_id, v_order_number
  from public.submit_order_for_review_impl(p_cart_id, p_address_id, p_window_label, p_idempotency_key) result;

  if nullif(trim(p_idempotency_key), '') is not null then
    update public.idempotency_records
    set response_status = 200,
        response_body = jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number)
    where scope_key = v_profile.company_id::text
      and actor_profile_id = v_profile.id
      and command = 'SUBMIT_ORDER_FOR_REVIEW'
      and idempotency_key = trim(p_idempotency_key);
  end if;

  return query select v_order_id, v_order_number;
end;
$$;

revoke all on function public.submit_order_for_review_impl(uuid, uuid, text, text) from public, anon;
revoke all on function public.submit_order_for_review(uuid, uuid, text, text) from public, anon;
grant execute on function public.submit_order_for_review(uuid, uuid, text, text) to authenticated;
