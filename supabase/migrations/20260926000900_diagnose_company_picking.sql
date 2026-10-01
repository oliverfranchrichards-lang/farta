create or replace function public.company_start_order_picking(p_order_id uuid)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_status text;
  v_company_id uuid;
  v_has_membership boolean := false;
begin
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid() and p.status = 'ACTIVE'
  for share;

  if v_profile.id is null then
    raise exception 'FORBIDDEN' using detail = 'active_profile_not_found';
  end if;

  if v_profile.company_id is not null then
    v_has_membership := public.has_active_membership(v_profile.company_id);
  end if;

  if v_profile.role <> 'INTERNAL_OPERATOR' or v_profile.company_id is null or not v_has_membership then
    raise exception 'FORBIDDEN' using detail = format(
      'role=%s;profile_company=%s;membership=%s',
      v_profile.role, v_profile.company_id, v_has_membership
    );
  end if;

  select o.status, o.company_id into v_status, v_company_id
  from public.orders o
  where o.id = p_order_id
  for update;

  if v_status is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_company_id <> v_profile.company_id then
    raise exception 'ORDER_NOT_FOUND' using detail = format(
      'profile_company=%s;order_company=%s', v_profile.company_id, v_company_id
    );
  end if;
  if v_status <> 'CONFIRMED' then
    raise exception 'INVALID_ORDER_TRANSITION' using detail = format('from=%s;to=PICKING', v_status);
  end if;

  update public.orders set status = 'PICKING', updated_at = now() where id = p_order_id;
  insert into public.order_status_history
    (order_id, from_status, to_status, changed_by_profile_id, reason)
  values
    (p_order_id, 'CONFIRMED', 'PICKING', auth.uid(), 'Picking started by company operator');
  insert into public.audit_logs
    (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values
    (auth.uid(), v_profile.role, v_profile.company_id, 'ORDER_PICKING_STARTED', 'order', p_order_id, 'SUCCESS', '{}'::jsonb);
  return true;
end;
$$;

revoke all on function public.company_start_order_picking(uuid) from public, anon;
grant execute on function public.company_start_order_picking(uuid) to authenticated;
