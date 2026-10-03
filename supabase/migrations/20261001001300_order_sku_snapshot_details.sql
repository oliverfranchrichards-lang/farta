create or replace function public.company_get_order_details(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles%rowtype; v_order public.orders%rowtype; v_allowed boolean := false;
begin
  select p.* into v_profile from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE';
  if v_profile.id is null then raise exception 'FORBIDDEN'; end if;
  select o.* into v_order from public.orders o where o.id = p_order_id;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_profile.role = 'PLATFORM_ADMIN' then v_allowed := true;
  elsif v_profile.company_id = v_order.company_id and v_profile.role = 'INTERNAL_OPERATOR' and public.has_active_membership(v_profile.company_id) then v_allowed := true;
  elsif v_profile.company_id = v_order.company_id and v_profile.role = 'DRIVER' and exists (select 1 from public.deliveries d join public.delivery_driver_assignments a on a.delivery_id = d.id where d.order_id = v_order.id and a.driver_profile_id = v_profile.id and a.unassigned_at is null) then v_allowed := true;
  end if;
  if not v_allowed then raise exception 'FORBIDDEN'; end if;
  insert into public.audit_logs(actor_profile_id, actor_role, company_id, action, resource_type, resource_id, outcome, metadata) values (auth.uid(), v_profile.role, v_order.company_id, 'ORDER_DETAILS_VIEWED', 'order', v_order.id, 'SUCCESS', '{}'::jsonb);
  return jsonb_build_object(
    'id', v_order.id, 'orderNumber', v_order.order_number, 'companyId', v_order.company_id, 'status', v_order.status, 'createdAt', v_order.created_at,
    'confirmedWindow', v_order.confirmed_window, 'requestedWindow', v_order.requested_window, 'address', v_order.address_snapshot,
    'subtotalMinor', v_order.subtotal_minor, 'deliveryFeeMinor', v_order.delivery_fee_minor, 'totalMinor', v_order.total_minor,
    'approximateSubtotalMinor', v_order.approximate_subtotal_minor, 'approximateTotalMinor', v_order.approximate_total_minor,
    'finalSubtotalMinor', v_order.final_subtotal_minor, 'finalTotalMinor', v_order.final_total_minor, 'finalConfirmedAt', v_order.final_confirmed_at,
    'companyName', (select c.display_name from public.companies c where c.id = v_order.company_id),
    'establishmentName', (select e.name from public.establishments e where e.id = v_order.establishment_id),
    'customer', (select jsonb_build_object('name', p.full_name, 'phone', p.phone) from public.profiles p where p.id = v_order.created_by_profile_id),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', oi.id, 'skuId', oi.sku_id, 'skuCode', coalesce(oi.sku_code_snapshot, pv.sku_code), 'productName', coalesce(p.name, oi.sku_name_snapshot),
      'brand', p.brand, 'variantName', oi.sku_name_snapshot, 'unit', oi.sale_unit_snapshot, 'quantity', oi.quantity,
      'unitPriceMinor', coalesce(oi.final_unit_price_minor, oi.approximate_unit_price_minor, oi.unit_price_minor),
      'subtotalMinor', coalesce(oi.final_subtotal_minor, oi.approximate_subtotal_minor, oi.subtotal_minor),
      'approximateUnitPriceMinor', oi.approximate_unit_price_minor, 'approximateSubtotalMinor', oi.approximate_subtotal_minor,
      'finalUnitPriceMinor', oi.final_unit_price_minor, 'finalSubtotalMinor', oi.final_subtotal_minor
    ) order by oi.created_at) from public.order_items oi left join public.product_variants pv on pv.id = oi.sku_id left join public.products p on p.id = pv.product_id where oi.order_id = v_order.id), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('fromStatus', h.from_status, 'toStatus', h.to_status, 'changedAt', h.changed_at, 'reason', h.reason) order by h.changed_at) from public.order_status_history h where h.order_id = v_order.id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.company_get_order_details(uuid) from public, anon;
grant execute on function public.company_get_order_details(uuid) to authenticated;
