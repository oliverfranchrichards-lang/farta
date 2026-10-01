create or replace function public.advance_order_status(p_order_id uuid, p_to_status text)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles%rowtype; v_from text; v_company_id uuid; v_allowed boolean := false;
begin
  select * into v_profile from public.profiles where id = auth.uid() and status = 'ACTIVE' for share;
  if v_profile.id is null then raise exception 'FORBIDDEN'; end if;
  if v_profile.role <> 'PLATFORM_ADMIN' and (v_profile.company_id is null or not public.has_active_membership(v_profile.company_id)) then raise exception 'FORBIDDEN'; end if;
  select status, company_id into v_from, v_company_id from public.orders where id = p_order_id for update;
  if v_from is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_to_status not in ('PICKING','READY_FOR_DISPATCH','DISPATCHED','DELIVERED','RECEIPT_CONFIRMED') then raise exception 'INVALID_ORDER_STATUS'; end if;
  if v_profile.role = 'PLATFORM_ADMIN' then
    v_allowed := (v_from, p_to_status) in (('CONFIRMED','PICKING'), ('PICKING','READY_FOR_DISPATCH'), ('READY_FOR_DISPATCH','DISPATCHED'), ('DISPATCHED','DELIVERED'), ('DELIVERED','RECEIPT_CONFIRMED'));
  elsif v_profile.company_id = v_company_id and v_profile.role = 'INTERNAL_OPERATOR' then
    v_allowed := (v_from, p_to_status) in (('CONFIRMED','PICKING'), ('PICKING','READY_FOR_DISPATCH'), ('READY_FOR_DISPATCH','DISPATCHED'));
  elsif v_profile.company_id = v_company_id and v_profile.role = 'DRIVER' then
    v_allowed := (v_from, p_to_status) = ('DISPATCHED','DELIVERED');
  elsif v_profile.company_id = v_company_id and v_profile.role = 'CUSTOMER' then
    v_allowed := (v_from, p_to_status) = ('DELIVERED','RECEIPT_CONFIRMED');
  end if;
  if not v_allowed then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  update public.orders set status = p_to_status, updated_at = now() where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by_profile_id, reason) values (p_order_id, v_from, p_to_status, auth.uid(), 'Status advanced by authorized workflow actor');
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), v_profile.role, v_company_id, 'ORDER_STATUS_ADVANCED', 'order', p_order_id, 'SUCCESS', jsonb_build_object('from', v_from, 'to', p_to_status));
  return true;
end; $$;
