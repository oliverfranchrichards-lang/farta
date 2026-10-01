-- Data/operation hardening: a dispatched order must have an explicitly
-- assigned driver, and order/delivery states advance together.

create or replace function public.company_list_drivers()
returns table (id uuid, full_name text)
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid() and p.status = 'ACTIVE'
  for share;

  if v_profile.id is null or v_profile.role <> 'INTERNAL_OPERATOR'
     or v_profile.company_id is null
     or not public.has_active_membership(v_profile.company_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select p.id, p.full_name
  from public.profiles p
  join public.company_memberships m
    on m.profile_id = p.id and m.company_id = p.company_id
  where p.company_id = v_profile.company_id
    and p.role = 'DRIVER'
    and p.status = 'ACTIVE'
    and m.status = 'ACTIVE'
  order by p.full_name;
end;
$$;

create or replace function public.company_assign_order_driver(
  p_order_id uuid,
  p_driver_profile_id uuid
)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_operator public.profiles%rowtype;
  v_order public.orders%rowtype;
  v_delivery public.deliveries%rowtype;
begin
  select p.* into v_operator
  from public.profiles p
  where p.id = auth.uid() and p.status = 'ACTIVE'
  for share;

  if v_operator.id is null or v_operator.role <> 'INTERNAL_OPERATOR'
     or v_operator.company_id is null
     or not public.has_active_membership(v_operator.company_id) then
    raise exception 'FORBIDDEN';
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id and o.company_id = v_operator.company_id
  for update;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'READY_FOR_DISPATCH' then
    raise exception 'INVALID_ORDER_TRANSITION';
  end if;

  if not exists (
    select 1 from public.profiles p
    join public.company_memberships m
      on m.profile_id = p.id and m.company_id = p.company_id
    where p.id = p_driver_profile_id
      and p.company_id = v_operator.company_id
      and p.role = 'DRIVER'
      and p.status = 'ACTIVE'
      and m.status = 'ACTIVE'
  ) then
    raise exception 'DRIVER_NOT_AVAILABLE';
  end if;

  select d.* into v_delivery
  from public.deliveries d
  where d.order_id = v_order.id
  for update;
  if v_delivery.id is null then raise exception 'DELIVERY_NOT_FOUND'; end if;

  if exists (
    select 1 from public.delivery_driver_assignments a
    where a.delivery_id = v_delivery.id and a.unassigned_at is null
  ) then
    raise exception 'DELIVERY_ALREADY_ASSIGNED';
  end if;

  insert into public.delivery_driver_assignments
    (delivery_id, driver_profile_id, assigned_by_profile_id)
  values (v_delivery.id, p_driver_profile_id, auth.uid());

  update public.deliveries
  set status = 'ASSIGNED', updated_at = now()
  where id = v_delivery.id;

  insert into public.delivery_status_history
    (delivery_id, from_status, to_status, changed_by_profile_id, reason)
  values (v_delivery.id, v_delivery.status, 'ASSIGNED', auth.uid(), 'Driver assigned by company operator');

  insert into public.audit_logs
    (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), v_operator.role, v_operator.company_id, 'DELIVERY_DRIVER_ASSIGNED', 'order', v_order.id,
    'SUCCESS', jsonb_build_object('driver_profile_id', p_driver_profile_id));
  return true;
end;
$$;

create or replace function public.company_list_orders(p_status text default null)
returns table (id uuid, order_number bigint, company_id uuid, company_name text, establishment_name text, created_at timestamptz, status text, total_minor bigint, units bigint, delivery_window text)
language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' for share;
  if v_profile.id is null or v_profile.role not in ('INTERNAL_OPERATOR', 'DRIVER') or v_profile.company_id is null then raise exception 'FORBIDDEN'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'FORBIDDEN'; end if;
  if p_status is not null and p_status not in ('CONFIRMED','PICKING','READY_FOR_DISPATCH','DISPATCHED','DELIVERED','RECEIPT_CONFIRMED','CANCELLED') then raise exception 'INVALID_STATUS'; end if;
  return query
  select o.id, o.order_number, o.company_id, c.display_name, e.name, o.created_at, o.status, o.total_minor,
    coalesce(sum(oi.quantity), 0)::bigint, coalesce(o.confirmed_window->>'label', o.requested_window->>'label', '')
  from public.orders o
  join public.companies c on c.id = o.company_id
  join public.establishments e on e.id = o.establishment_id
  left join public.order_items oi on oi.order_id = o.id
  where o.company_id = v_profile.company_id
    and (p_status is null or o.status = p_status)
    and (v_profile.role = 'INTERNAL_OPERATOR' or exists (
      select 1
      from public.deliveries d
      join public.delivery_driver_assignments a on a.delivery_id = d.id
      where d.order_id = o.id and a.driver_profile_id = v_profile.id and a.unassigned_at is null
    ))
  group by o.id, c.display_name, e.name
  order by o.created_at desc;
end; $$;

create or replace function public.advance_order_status(p_order_id uuid, p_to_status text)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_from text;
  v_company_id uuid;
  v_delivery public.deliveries%rowtype;
  v_allowed boolean := false;
begin
  select p.* into v_profile from public.profiles p
  where p.id = auth.uid() and p.status = 'ACTIVE' for share;
  if v_profile.id is null then raise exception 'FORBIDDEN'; end if;

  if v_profile.role <> 'PLATFORM_ADMIN'
     and (v_profile.company_id is null or not public.has_active_membership(v_profile.company_id)) then
    raise exception 'FORBIDDEN';
  end if;

  select o.status, o.company_id into v_from, v_company_id
  from public.orders o where o.id = p_order_id for update;
  if v_from is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_to_status not in ('PICKING','READY_FOR_DISPATCH','DISPATCHED','DELIVERED','RECEIPT_CONFIRMED') then
    raise exception 'INVALID_ORDER_STATUS';
  end if;

  select d.* into v_delivery from public.deliveries d where d.order_id = p_order_id for update;

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
    v_allowed := v_from = 'DISPATCHED' and p_to_status = 'DELIVERED'
      and exists (select 1 from public.delivery_driver_assignments a
        where a.delivery_id = v_delivery.id and a.driver_profile_id = auth.uid() and a.unassigned_at is null);
  elsif v_profile.role = 'CUSTOMER' and v_profile.company_id = v_company_id then
    v_allowed := v_from = 'DELIVERED' and p_to_status = 'RECEIPT_CONFIRMED';
  end if;

  if p_to_status = 'DISPATCHED' and not exists (
    select 1 from public.delivery_driver_assignments a
    where a.delivery_id = v_delivery.id and a.unassigned_at is null
  ) then
    raise exception 'DRIVER_ASSIGNMENT_REQUIRED';
  end if;
  if not v_allowed then raise exception 'INVALID_ORDER_TRANSITION'; end if;

  update public.orders set status = p_to_status, updated_at = now() where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by_profile_id, reason)
  values (p_order_id, v_from, p_to_status, auth.uid(), 'Status advanced by authorized workflow actor');

  if p_to_status = 'DISPATCHED' then
    update public.deliveries set status = 'IN_TRANSIT', updated_at = now() where id = v_delivery.id;
    insert into public.delivery_status_history (delivery_id, from_status, to_status, changed_by_profile_id, reason)
    values (v_delivery.id, v_delivery.status, 'IN_TRANSIT', auth.uid(), 'Order dispatched');
  elsif p_to_status = 'DELIVERED' then
    update public.deliveries set status = 'DELIVERED', delivered_at = now(), updated_at = now() where id = v_delivery.id;
    insert into public.delivery_status_history (delivery_id, from_status, to_status, changed_by_profile_id, reason)
    values (v_delivery.id, v_delivery.status, 'DELIVERED', auth.uid(), 'Delivery completed');
  end if;

  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), v_profile.role, v_company_id, 'ORDER_STATUS_ADVANCED', 'order', p_order_id,
    'SUCCESS', jsonb_build_object('from', v_from, 'to', p_to_status));
  return true;
end; $$;

revoke all on function public.company_list_drivers() from public, anon;
grant execute on function public.company_list_drivers() to authenticated;
revoke all on function public.company_assign_order_driver(uuid, uuid) from public, anon;
grant execute on function public.company_assign_order_driver(uuid, uuid) to authenticated;
revoke all on function public.company_list_orders(text) from public, anon;
grant execute on function public.company_list_orders(text) to authenticated;
revoke all on function public.advance_order_status(uuid, text) from public, anon;
grant execute on function public.advance_order_status(uuid, text) to authenticated;
