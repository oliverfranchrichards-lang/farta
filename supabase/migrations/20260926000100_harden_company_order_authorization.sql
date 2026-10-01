-- Ensure company order operations require a live tenant membership.
-- Drivers may read their company's queue, but only internal operators can
-- transition an order into picking.
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
  select o.id, o.order_number, o.company_id, c.display_name, e.name, o.created_at, o.status, o.total_minor, coalesce(sum(oi.quantity), 0)::bigint, coalesce(o.confirmed_window->>'label', o.requested_window->>'label', '')
  from public.orders o join public.companies c on c.id = o.company_id join public.establishments e on e.id = o.establishment_id left join public.order_items oi on oi.order_id = o.id
  where o.company_id = v_profile.company_id and (p_status is null or o.status = p_status)
  group by o.id, c.display_name, e.name order by o.created_at desc;
end; $$;

create or replace function public.company_start_order_picking(p_order_id uuid)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles%rowtype; v_status text; v_company_id uuid;
begin
  select * into v_profile from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' for share;
  if v_profile.id is null or v_profile.role <> 'INTERNAL_OPERATOR' or v_profile.company_id is null then raise exception 'FORBIDDEN'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'FORBIDDEN'; end if;
  select o.status, o.company_id into v_status, v_company_id from public.orders o where o.id = p_order_id for update;
  if v_status is null or v_company_id <> v_profile.company_id then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_status <> 'CONFIRMED' then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  update public.orders set status = 'PICKING', updated_at = now() where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by_profile_id, reason) values (p_order_id, 'CONFIRMED', 'PICKING', auth.uid(), 'Picking started by company operator');
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), v_profile.role, v_profile.company_id, 'ORDER_PICKING_STARTED', 'order', p_order_id, 'SUCCESS', '{}'::jsonb);
  return true;
end; $$;

revoke all on function public.company_list_orders(text) from public, anon;
grant execute on function public.company_list_orders(text) to authenticated;
revoke all on function public.company_start_order_picking(uuid) from public, anon;
grant execute on function public.company_start_order_picking(uuid) to authenticated;
