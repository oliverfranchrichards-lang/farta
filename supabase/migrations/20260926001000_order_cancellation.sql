create or replace function public.cancel_order(p_order_id uuid, p_reason text)
returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_status text;
  v_company_id uuid;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_allowed boolean := false;
begin
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid() and p.status = 'ACTIVE'
  for share;
  if v_profile.id is null then raise exception 'FORBIDDEN'; end if;
  if v_reason is null or char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'INVALID_CANCELLATION_REASON';
  end if;
  if v_profile.role <> 'PLATFORM_ADMIN' then
    if v_profile.company_id is null or not public.has_active_membership(v_profile.company_id) then raise exception 'FORBIDDEN'; end if;
  end if;

  select o.status, o.company_id into v_status, v_company_id
  from public.orders o where o.id = p_order_id for update;
  if v_status is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_status in ('DELIVERED', 'RECEIPT_CONFIRMED', 'CANCELLED') then raise exception 'INVALID_ORDER_TRANSITION'; end if;

  if v_profile.role = 'PLATFORM_ADMIN' then
    v_allowed := v_status in ('CONFIRMED', 'PICKING', 'READY_FOR_DISPATCH');
  elsif v_profile.role = 'INTERNAL_OPERATOR' and v_profile.company_id = v_company_id then
    v_allowed := v_status in ('CONFIRMED', 'PICKING', 'READY_FOR_DISPATCH');
  elsif v_profile.role = 'CUSTOMER' and v_profile.company_id = v_company_id then
    v_allowed := v_status = 'CONFIRMED';
  end if;
  if not v_allowed then raise exception 'FORBIDDEN'; end if;

  update public.orders set status = 'CANCELLED', cancelled_at = now(), updated_at = now() where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by_profile_id, reason)
  values (p_order_id, v_status, 'CANCELLED', auth.uid(), v_reason);
  insert into public.audit_logs (actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata)
  values (auth.uid(), v_profile.role, v_company_id, 'ORDER_CANCELLED', 'order', p_order_id, 'SUCCESS', jsonb_build_object('from', v_status, 'reason', v_reason));
  return true;
end;
$$;

revoke all on function public.cancel_order(uuid, text) from public, anon;
grant execute on function public.cancel_order(uuid, text) to authenticated;
