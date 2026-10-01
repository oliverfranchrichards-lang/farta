-- Security hardening identified by the V1 RLS audit.
-- Inventory is accessed through controlled server-side commands; it must not be
-- exposed as a cross-tenant read surface to arbitrary authenticated users.
drop policy if exists inventory_locations_authenticated_read on public.inventory_locations;
create policy inventory_locations_operations_read on public.inventory_locations
for select using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'ACTIVE'
      and (
        p.role = 'PLATFORM_ADMIN'
        or p.role in ('INTERNAL_OPERATOR', 'DRIVER')
          and public.has_active_membership(p.company_id)
      )
  )
  and status = 'ACTIVE'
);

drop policy if exists inventory_balances_authenticated_read on public.inventory_balances;
-- No direct SELECT policy: inventory balances are only exposed through
-- authorized SECURITY DEFINER commands that validate the caller and scope.

drop policy if exists movements_member_read on public.inventory_movements;
create policy movements_member_read on public.inventory_movements
for select using (
  order_id is not null
  and exists (
    select 1
    from public.orders o
    where o.id = public.inventory_movements.order_id
      and public.has_active_membership(o.company_id)
  )
);

drop policy if exists delivery_history_authorized_read on public.delivery_status_history;
create policy delivery_history_authorized_read on public.delivery_status_history
for select using (
  exists (
    select 1
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    where d.id = public.delivery_status_history.delivery_id
      and public.has_active_membership(o.company_id)
  )
  or exists (
    select 1
    from public.delivery_driver_assignments a
    where a.delivery_id = public.delivery_status_history.delivery_id
      and a.driver_profile_id = auth.uid()
      and a.unassigned_at is null
  )
);

drop policy if exists delivery_occurrences_authorized_read on public.delivery_occurrences;
create policy delivery_occurrences_authorized_read on public.delivery_occurrences
for select using (
  exists (
    select 1
    from public.deliveries d
    join public.orders o on o.id = d.order_id
    where d.id = public.delivery_occurrences.delivery_id
      and public.has_active_membership(o.company_id)
  )
  or exists (
    select 1
    from public.delivery_driver_assignments a
    where a.delivery_id = public.delivery_occurrences.delivery_id
      and a.driver_profile_id = auth.uid()
      and a.unassigned_at is null
  )
);
