create or replace function public.advance_order_status(p_order_id uuid, p_to_status text)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_from text;
  v_company_id uuid;
  v_has_membership boolean := false;
  v_allowed boolean := false;
begin
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid() and p.status = 'ACTIVE'
  for share;

  if v_profile.id is null then
    raise exception 'FORBIDDEN';
  end if;

  if v_profile.role <> 'PLATFORM_ADMIN' then
    v_has_membership := v_profile.company_id is not null
      and public.has_active_membership(v_profile.company_id);
    if not v_has_membership then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  select o.status, o.company_id into v_from, v_company_id
  from public.orders o
  where o.id = p_order_id
  for update;

  if v_from is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if p_to_status not in ('PICKING','READY_FOR_DISPATCH','DISPATCHED','DELIVERED','RECEIPT_CONFIRMED') then
    raise exception 'INVALID_ORDER_STATUS';
  end if;

  if v_profile.role = 'PLATFORM_ADMIN' then
    v_allowed := (v_from = 'CONFIRMED' and p_to_status = 'PICKING')
      or (v_from = 'PICKING' and p_to_status = 'READY_FOR_DISPATCH')
      or (v_from = 'READY_FOR_DISPATCH' and p_to_status = 'DISPATCHED')
      or (v_from = 'DISPATCHED' and p_to_status = 'DELIVERED')
      or (v_from = 'DELIVERED' and p_to_status = 'RECEIPT_CONFIRMED');
  elsif v_profile.role = 'INTERNAL_OPERATOR' and v_profile.company_id = v_company_id then
    v_allowed := (v_from = 'CONFIRMED' and p_to_status = 'PICKING')
      or (v_from = 'PICKING' and p_to_status = 'READY_FOR_DISPATCH')
      or (v_from = 'READY_FOR_DISPATCH' and p_to_status = 'DISPATCHED');
  elsif v_profile.role = 'DRIVER' and v_profile.company_id = v_company_id then
    v_allowed := v_from = 'DISPATCHED' and p_to_status = 'DELIVERED';
  elsif v_profile.role = 'CUSTOMER' and v_profile.company_id = v_company_id then
    v_allowed := v_from = 'DELIVERED' and p_to_status = 'RECEIPT_CONFIRMED';
  end if;

  if not v_allowed then
    raise exception 'INVALID_ORDER_TRANSITION'
      using detail = format(
        'role=%s;from=%s;to=%s;profile_company=%s;order_company=%s;membership=%s',
        v_profile.role, v_from, p_to_status, v_profile.company_id,
        v_company_id, v_has_membership
      );
  end if;

  update public.orders
  set status = p_to_status, updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history
    (order_id, from_status, to_status, changed_by_profile_id, reason)
  values
    (p_order_id, v_from, p_to_status, auth.uid(), 'Status advanced by authorized workflow actor');

  insert into public.audit_logs
    (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values
    (auth.uid(), v_profile.role, v_company_id, 'ORDER_STATUS_ADVANCED', 'order', p_order_id,
     'SUCCESS', jsonb_build_object('from', v_from, 'to', p_to_status));

  return true;
end;
$$;

revoke all on function public.advance_order_status(uuid, text) from public, anon;
grant execute on function public.advance_order_status(uuid, text) to authenticated;
