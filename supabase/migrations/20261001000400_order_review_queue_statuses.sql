-- Include review states in queue filtering without changing tenant scope.
create or replace function public.company_list_orders(p_status text default null)
returns table (id uuid, order_number bigint, company_id uuid, company_name text, establishment_name text, created_at timestamptz, status text, total_minor bigint, units bigint, delivery_window text)
language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE' for share;
  if v_profile.id is null or v_profile.role not in ('INTERNAL_OPERATOR', 'DRIVER') or v_profile.company_id is null or not public.has_active_membership(v_profile.company_id) then raise exception 'FORBIDDEN'; end if;
  if p_status is not null and p_status not in ('SUBMITTED_FOR_REVIEW','PRICED_AWAITING_CUSTOMER_CONFIRMATION','CUSTOMER_CONFIRMED','CONFIRMED','PICKING','READY_FOR_DISPATCH','DISPATCHED','DELIVERED','RECEIPT_CONFIRMED','CANCELLED') then raise exception 'INVALID_STATUS'; end if;
  return query select o.id, o.order_number, o.company_id, c.display_name, e.name, o.created_at, o.status, o.total_minor, coalesce(sum(oi.quantity),0)::bigint, coalesce(o.confirmed_window->>'label',o.requested_window->>'label','')
  from public.orders o join public.companies c on c.id=o.company_id join public.establishments e on e.id=o.establishment_id left join public.order_items oi on oi.order_id=o.id
  where o.company_id=v_profile.company_id and (p_status is null or o.status=p_status) and (v_profile.role='INTERNAL_OPERATOR' or exists (select 1 from public.deliveries d join public.delivery_driver_assignments a on a.delivery_id=d.id where d.order_id=o.id and a.driver_profile_id=v_profile.id and a.unassigned_at is null))
  group by o.id,c.display_name,e.name order by o.created_at desc;
end; $$;

create or replace function public.admin_list_orders(p_status text default null)
returns table (id uuid, order_number bigint, company_id uuid, company_name text, establishment_name text, created_at timestamptz, status text, total_minor bigint, units bigint, delivery_window text)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='PLATFORM_ADMIN' and p.status='ACTIVE') then raise exception 'FORBIDDEN'; end if;
  if p_status is not null and p_status not in ('SUBMITTED_FOR_REVIEW','PRICED_AWAITING_CUSTOMER_CONFIRMATION','CUSTOMER_CONFIRMED','CONFIRMED','PICKING','READY_FOR_DISPATCH','DISPATCHED','DELIVERED','RECEIPT_CONFIRMED','CANCELLED') then raise exception 'INVALID_STATUS'; end if;
  return query select o.id,o.order_number,o.company_id,c.display_name,e.name,o.created_at,o.status,o.total_minor,coalesce(sum(oi.quantity),0)::bigint,coalesce(o.confirmed_window->>'label',o.requested_window->>'label','')
  from public.orders o join public.companies c on c.id=o.company_id join public.establishments e on e.id=o.establishment_id left join public.order_items oi on oi.order_id=o.id
  where p_status is null or o.status=p_status group by o.id,c.display_name,e.name order by o.created_at desc;
end; $$;

revoke all on function public.company_list_orders(text) from public, anon;
grant execute on function public.company_list_orders(text) to authenticated;
revoke all on function public.admin_list_orders(text) from public, anon;
grant execute on function public.admin_list_orders(text) to authenticated;
