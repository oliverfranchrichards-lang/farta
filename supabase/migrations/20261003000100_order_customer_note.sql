-- REDESIGN-02: customer order note.
-- Additive migration: the legacy submit_order_for_review(uuid, uuid, text, text)
-- remains available for existing consumers. New clients use the versioned RPC
-- below so the note participates in the idempotency request hash.

alter table public.orders
  add column if not exists customer_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_customer_note_length_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_customer_note_length_check
      check (customer_note is null or char_length(customer_note) <= 500);
  end if;
end;
$$;

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
  v_cart public.carts%rowtype;
  v_address public.addresses%rowtype;
  v_snapshot jsonb;
  v_order_id uuid;
  v_order_number bigint;
  v_inventory_location uuid;
  v_subtotal bigint := 0;
  v_item record;
  v_customer_note text := nullif(btrim(coalesce(p_customer_note, '')), '');
  v_request_hash text;
  v_existing_hash text;
  v_existing_body jsonb;
begin
  if p_cart_id is null or p_address_id is null then
    raise exception 'ADDRESS_REQUIRED';
  end if;

  if p_window_label is null
    or nullif(btrim(p_window_label), '') is null
    or length(btrim(p_window_label)) > 80 then
    raise exception 'INVALID_DELIVERY_WINDOW';
  end if;

  if v_customer_note is not null and char_length(v_customer_note) > 500 then
    raise exception 'INVALID_CUSTOMER_NOTE';
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'CUSTOMER'
    and p.status = 'ACTIVE'
  for share;

  if v_profile.id is null or v_profile.company_id is null then
    raise exception 'ACTIVE_PROFILE_REQUIRED';
  end if;

  if not public.has_active_membership(v_profile.company_id) then
    raise exception 'ACTIVE_MEMBERSHIP_REQUIRED';
  end if;

  v_request_hash := md5(concat_ws(
    '|',
    p_cart_id::text,
    p_address_id::text,
    btrim(p_window_label),
    coalesce(v_customer_note, '')
  ));

  if nullif(trim(p_idempotency_key), '') is not null then
    if length(trim(p_idempotency_key)) > 200 then
      raise exception 'INVALID_IDEMPOTENCY_KEY';
    end if;

    insert into public.idempotency_records(
      scope_key, actor_profile_id, command, idempotency_key, request_hash, expires_at
    ) values (
      v_profile.company_id::text,
      v_profile.id,
      'SUBMIT_ORDER_FOR_REVIEW_WITH_NOTE',
      trim(p_idempotency_key),
      v_request_hash,
      now() + interval '24 hours'
    )
    on conflict (scope_key, actor_profile_id, command, idempotency_key) do nothing;

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
      return query
        select (v_existing_body->>'order_id')::uuid,
               (v_existing_body->>'order_number')::bigint;
      return;
    end if;
  end if;

  select c.* into v_cart
  from public.carts c
  where c.id = p_cart_id
    and c.company_id = v_profile.company_id
  for update;

  if v_cart.id is null then
    raise exception 'ACTIVE_CART_NOT_FOUND';
  end if;

  if v_cart.status = 'CONVERTED' then
    return query
      select o.id, o.order_number
      from public.orders o
      where o.cart_id = v_cart.id
        and o.company_id = v_profile.company_id;
    return;
  end if;

  if v_cart.status <> 'ACTIVE' then
    raise exception 'ACTIVE_CART_NOT_FOUND';
  end if;

  select a.* into v_address
  from public.addresses a
  where a.id = p_address_id
    and a.establishment_id = v_cart.establishment_id
    and a.status = 'ACTIVE';

  if v_address.id is null then
    raise exception 'ADDRESS_NOT_AVAILABLE';
  end if;

  select il.id into v_inventory_location
  from public.inventory_locations il
  where il.status = 'ACTIVE'
  order by il.created_at
  limit 1;

  if v_inventory_location is null then
    raise exception 'INVENTORY_LOCATION_NOT_FOUND';
  end if;

  v_snapshot := jsonb_build_object(
    'address_id', v_address.id,
    'label', v_address.label,
    'address_line', v_address.address_line,
    'address_number', v_address.address_number,
    'address_complement', v_address.address_complement,
    'district', v_address.district,
    'city', v_address.city,
    'state', v_address.state,
    'postal_code', v_address.postal_code
  );

  if not exists (select 1 from public.cart_items ci where ci.cart_id = v_cart.id) then
    raise exception 'CART_EMPTY';
  end if;

  for v_item in
    select
      ci.sku_id,
      ci.quantity,
      pv.name,
      pv.sale_unit,
      pv.minimum_quantity,
      pr.amount_minor as unit_price
    from public.cart_items ci
    join public.product_variants pv
      on pv.id = ci.sku_id
     and pv.status = 'ACTIVE'
    join public.products p
      on p.id = pv.product_id
     and p.status = 'ACTIVE'
    left join lateral (
      select p2.amount_minor
      from public.prices p2
      where p2.company_id = v_cart.company_id
        and p2.sku_id = ci.sku_id
        and p2.status = 'ACTIVE'
        and p2.valid_from <= now()
        and (p2.valid_until is null or p2.valid_until > now())
      order by p2.valid_from desc
      limit 1
    ) pr on true
    where ci.cart_id = v_cart.id
  loop
    if v_item.unit_price is null then
      raise exception 'PRICE_UNAVAILABLE:%', v_item.sku_id;
    end if;
    if v_item.quantity < v_item.minimum_quantity then
      raise exception 'MINIMUM_QUANTITY_NOT_MET:%', v_item.minimum_quantity;
    end if;
    v_subtotal := v_subtotal + v_item.unit_price * v_item.quantity;
  end loop;

  insert into public.orders (
    company_id,
    establishment_id,
    created_by_profile_id,
    cart_id,
    inventory_location_id,
    status,
    requested_window,
    confirmed_window,
    address_snapshot,
    customer_note,
    subtotal_minor,
    total_minor,
    approximate_subtotal_minor,
    approximate_total_minor,
    submitted_for_review_at
  ) values (
    v_cart.company_id,
    v_cart.establishment_id,
    v_profile.id,
    v_cart.id,
    v_inventory_location,
    'SUBMITTED_FOR_REVIEW',
    jsonb_build_object('label', btrim(p_window_label)),
    jsonb_build_object('label', btrim(p_window_label)),
    v_snapshot,
    v_customer_note,
    v_subtotal,
    v_subtotal,
    v_subtotal,
    v_subtotal,
    now()
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in
    select
      ci.sku_id,
      ci.quantity,
      pv.name,
      pv.sale_unit,
      pv.minimum_quantity,
      pr.amount_minor as unit_price
    from public.cart_items ci
    join public.product_variants pv on pv.id = ci.sku_id
    left join lateral (
      select p2.amount_minor
      from public.prices p2
      where p2.company_id = v_cart.company_id
        and p2.sku_id = ci.sku_id
        and p2.status = 'ACTIVE'
        and p2.valid_from <= now()
        and (p2.valid_until is null or p2.valid_until > now())
      order by p2.valid_from desc
      limit 1
    ) pr on true
    where ci.cart_id = v_cart.id
  loop
    insert into public.order_items (
      order_id,
      sku_id,
      quantity,
      sku_name_snapshot,
      sale_unit_snapshot,
      unit_price_minor,
      subtotal_minor,
      minimum_quantity_snapshot,
      approximate_unit_price_minor,
      approximate_subtotal_minor
    ) values (
      v_order_id,
      v_item.sku_id,
      v_item.quantity,
      v_item.name,
      v_item.sale_unit,
      v_item.unit_price,
      v_item.unit_price * v_item.quantity,
      v_item.minimum_quantity,
      v_item.unit_price,
      v_item.unit_price * v_item.quantity
    );
  end loop;

  insert into public.order_status_history(
    order_id, to_status, changed_by_profile_id, reason
  ) values (
    v_order_id, 'SUBMITTED_FOR_REVIEW', v_profile.id, 'Order submitted for price review'
  );

  insert into public.audit_logs(
    actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata
  ) values (
    v_profile.id,
    v_profile.role,
    v_profile.company_id,
    'ORDER_SUBMITTED_FOR_REVIEW',
    'order',
    v_order_id,
    'SUCCESS',
    jsonb_build_object('idempotency_key', p_idempotency_key, 'customer_note_present', v_customer_note is not null)
  );

  update public.carts
  set status = 'CONVERTED', version = version + 1, updated_at = now()
  where id = v_cart.id;

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

