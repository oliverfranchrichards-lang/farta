-- New review orders become eligible for picking only after CUSTOMER_CONFIRMED.
create or replace function public.company_start_order_picking(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles%rowtype; v_status text; v_company_id uuid;
begin
  select * into v_profile from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' for share;
  if v_profile.id is null or v_profile.role <> 'INTERNAL_OPERATOR' or v_profile.company_id is null or not public.has_active_membership(v_profile.company_id) then raise exception 'FORBIDDEN'; end if;
  select o.status, o.company_id into v_status, v_company_id from public.orders o where o.id = p_order_id for update;
  if v_status is null or v_company_id <> v_profile.company_id then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_status not in ('CONFIRMED', 'CUSTOMER_CONFIRMED') then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  if v_status = 'CUSTOMER_CONFIRMED' and not exists (select 1 from public.inventory_reservations r where r.order_id = p_order_id and r.status = 'ACTIVE') then raise exception 'RESERVATION_REQUIRED'; end if;
  update public.orders set status = 'PICKING', updated_at = now() where id = p_order_id;
  insert into public.order_status_history(order_id, from_status, to_status, changed_by_profile_id, reason) values (p_order_id, v_status, 'PICKING', auth.uid(), 'Picking started by company operator');
  insert into public.audit_logs(actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), v_profile.role, v_profile.company_id, 'ORDER_PICKING_STARTED', 'order', p_order_id, 'SUCCESS', '{}'::jsonb);
  return true;
end; $$;

create or replace function public.admin_start_order_picking(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare v_status text; v_company_id uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'PLATFORM_ADMIN' and p.status = 'ACTIVE') then raise exception 'FORBIDDEN'; end if;
  select o.status, o.company_id into v_status, v_company_id from public.orders o where o.id = p_order_id for update;
  if v_status is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_status not in ('CONFIRMED', 'CUSTOMER_CONFIRMED') then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  if v_status = 'CUSTOMER_CONFIRMED' and not exists (select 1 from public.inventory_reservations r where r.order_id = p_order_id and r.status = 'ACTIVE') then raise exception 'RESERVATION_REQUIRED'; end if;
  update public.orders set status = 'PICKING', updated_at = now() where id = p_order_id;
  insert into public.order_status_history(order_id, from_status, to_status, changed_by_profile_id, reason) values (p_order_id, v_status, 'PICKING', auth.uid(), 'Picking started by platform administrator');
  insert into public.audit_logs(actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), 'PLATFORM_ADMIN', v_company_id, 'ORDER_PICKING_STARTED', 'order', p_order_id, 'SUCCESS', '{}'::jsonb);
  return true;
end; $$;

revoke all on function public.company_start_order_picking(uuid) from public, anon;
grant execute on function public.company_start_order_picking(uuid) to authenticated;
revoke all on function public.admin_start_order_picking(uuid) from public, anon;
grant execute on function public.admin_start_order_picking(uuid) to authenticated;
