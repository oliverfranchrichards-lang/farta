-- Fix PL/pgSQL output-variable ambiguities found by Supabase lint.
create or replace function public.add_to_establishment_cart(
  p_establishment_id uuid, p_sku_id uuid, p_quantity integer default 1
)
returns table (cart_id uuid, quantity integer)
language plpgsql security definer set search_path = public
as $$
declare v_profile public.profiles%rowtype; v_cart public.carts%rowtype; v_price bigint; v_minimum integer; v_result_quantity integer;
begin
  if p_establishment_id is null or p_sku_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 9999 then raise exception 'INVALID_QUANTITY'; end if;
  select * into v_profile from public.current_profile();
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'ACTIVE_MEMBERSHIP_REQUIRED'; end if;
  if not exists (select 1 from public.establishments e where e.id=p_establishment_id and e.company_id=v_profile.company_id and e.status='ACTIVE') then raise exception 'ESTABLISHMENT_NOT_AVAILABLE'; end if;
  select pv.minimum_quantity into v_minimum from public.product_variants pv join public.products p on p.id=pv.product_id and p.status='ACTIVE' where pv.id=p_sku_id and pv.status='ACTIVE';
  if v_minimum is null then raise exception 'SKU_NOT_AVAILABLE'; end if;
  select pr.amount_minor into v_price from public.prices pr where pr.company_id=v_profile.company_id and pr.sku_id=p_sku_id and pr.status='ACTIVE' and pr.valid_from<=now() and (pr.valid_until is null or pr.valid_until>now()) order by pr.valid_from desc limit 1;
  if v_price is null then raise exception 'PRICE_UNAVAILABLE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_profile.company_id::text || ':' || p_establishment_id::text, 0));
  select c.* into v_cart from public.carts c where c.company_id=v_profile.company_id and c.establishment_id=p_establishment_id and c.status='ACTIVE' for update;
  if v_cart.id is null then insert into public.carts(company_id,establishment_id,created_by_profile_id) values(v_profile.company_id,p_establishment_id,v_profile.id) returning * into v_cart; end if;
  select coalesce(ci.quantity,0)+p_quantity into v_result_quantity from (select 1) seed left join public.cart_items ci on ci.cart_id=v_cart.id and ci.sku_id=p_sku_id;
  if v_result_quantity>9999 then raise exception 'INVALID_QUANTITY'; end if;
  if v_result_quantity<v_minimum then raise exception 'MINIMUM_QUANTITY_NOT_MET:%',v_minimum; end if;
  insert into public.cart_items(cart_id,sku_id,quantity,displayed_unit_price_minor) values(v_cart.id,p_sku_id,p_quantity,v_price)
  on conflict on constraint cart_items_cart_id_sku_id_key do update set quantity=public.cart_items.quantity+excluded.quantity, displayed_unit_price_minor=excluded.displayed_unit_price_minor, updated_at=now();
  update public.carts set version=version+1,updated_at=now() where id=v_cart.id;
  return query select ci.cart_id,ci.quantity from public.cart_items ci where ci.cart_id=v_cart.id and ci.sku_id=p_sku_id;
end; $$;

create or replace function public.submit_order_for_review(
  p_cart_id uuid, p_address_id uuid, p_window_label text, p_idempotency_key text default null
)
returns table (order_id uuid, order_number bigint)
language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles%rowtype; v_cart public.carts%rowtype; v_address public.addresses%rowtype; v_snapshot jsonb; v_order_id uuid; v_order_number bigint; v_inventory_location uuid; v_subtotal bigint:=0; v_item record;
begin
  if p_cart_id is null or p_address_id is null then raise exception 'ADDRESS_REQUIRED'; end if;
  if p_window_label is null or p_window_label not in ('Hoje','AmanhÃ£') then raise exception 'INVALID_DELIVERY_WINDOW'; end if;
  select * into v_profile from public.profiles p where p.id=auth.uid() and p.role='CUSTOMER' and p.status='ACTIVE' for share;
  if v_profile.id is null or v_profile.company_id is null then raise exception 'ACTIVE_PROFILE_REQUIRED'; end if;
  if not public.has_active_membership(v_profile.company_id) then raise exception 'ACTIVE_MEMBERSHIP_REQUIRED'; end if;
  select * into v_cart from public.carts c where c.id=p_cart_id and c.company_id=v_profile.company_id for update;
  if v_cart.id is null or v_cart.status<>'ACTIVE' then raise exception 'ACTIVE_CART_NOT_FOUND'; end if;
  select * into v_address from public.addresses a where a.id=p_address_id and a.establishment_id=v_cart.establishment_id and a.status='ACTIVE';
  if v_address.id is null then raise exception 'ADDRESS_NOT_AVAILABLE'; end if;
  select il.id into v_inventory_location from public.inventory_locations il where il.status='ACTIVE' order by il.created_at limit 1;
  if v_inventory_location is null then raise exception 'INVENTORY_LOCATION_NOT_FOUND'; end if;
  v_snapshot:=jsonb_build_object('address_id',v_address.id,'label',v_address.label,'address_line',v_address.address_line,'address_number',v_address.address_number,'address_complement',v_address.address_complement,'district',v_address.district,'city',v_address.city,'state',v_address.state,'postal_code',v_address.postal_code);
  if not exists(select 1 from public.cart_items ci where ci.cart_id=v_cart.id) then raise exception 'CART_EMPTY'; end if;
  for v_item in select ci.sku_id,ci.quantity,pv.name,pv.sale_unit,pv.minimum_quantity,pr.amount_minor unit_price from public.cart_items ci join public.product_variants pv on pv.id=ci.sku_id and pv.status='ACTIVE' join public.products p on p.id=pv.product_id and p.status='ACTIVE' left join lateral(select p2.amount_minor from public.prices p2 where p2.company_id=v_cart.company_id and p2.sku_id=ci.sku_id and p2.status='ACTIVE' and p2.valid_from<=now() and (p2.valid_until is null or p2.valid_until>now()) order by p2.valid_from desc limit 1) pr on true where ci.cart_id=v_cart.id loop
    if v_item.unit_price is null then raise exception 'PRICE_UNAVAILABLE:%',v_item.sku_id; end if;
    if v_item.quantity<v_item.minimum_quantity then raise exception 'MINIMUM_QUANTITY_NOT_MET:%',v_item.minimum_quantity; end if;
    v_subtotal:=v_subtotal+v_item.unit_price*v_item.quantity;
  end loop;
  insert into public.orders(company_id,establishment_id,created_by_profile_id,cart_id,inventory_location_id,status,requested_window,confirmed_window,address_snapshot,subtotal_minor,total_minor,approximate_subtotal_minor,approximate_total_minor,submitted_for_review_at)
  values(v_cart.company_id,v_cart.establishment_id,v_profile.id,v_cart.id,v_inventory_location,'SUBMITTED_FOR_REVIEW',jsonb_build_object('label',p_window_label),jsonb_build_object('label',p_window_label),v_snapshot,v_subtotal,v_subtotal,v_subtotal,v_subtotal,now()) returning public.orders.id,public.orders.order_number into v_order_id,v_order_number;
  for v_item in select ci.sku_id,ci.quantity,pv.name,pv.sale_unit,pv.minimum_quantity,pr.amount_minor unit_price from public.cart_items ci join public.product_variants pv on pv.id=ci.sku_id left join lateral(select p2.amount_minor from public.prices p2 where p2.company_id=v_cart.company_id and p2.sku_id=ci.sku_id and p2.status='ACTIVE' and p2.valid_from<=now() and (p2.valid_until is null or p2.valid_until>now()) order by p2.valid_from desc limit 1) pr on true where ci.cart_id=v_cart.id loop
    insert into public.order_items(order_id,sku_id,quantity,sku_name_snapshot,sale_unit_snapshot,unit_price_minor,subtotal_minor,minimum_quantity_snapshot,approximate_unit_price_minor,approximate_subtotal_minor) values(v_order_id,v_item.sku_id,v_item.quantity,v_item.name,v_item.sale_unit,v_item.unit_price,v_item.unit_price*v_item.quantity,v_item.minimum_quantity,v_item.unit_price,v_item.unit_price*v_item.quantity);
  end loop;
  insert into public.order_status_history(order_id,to_status,changed_by_profile_id,reason) values(v_order_id,'SUBMITTED_FOR_REVIEW',v_profile.id,'Order submitted for price review');
  insert into public.audit_logs(actor_profile_id,actor_role,company_id,action,resource_type,resource_id,outcome,metadata) values(v_profile.id,v_profile.role,v_profile.company_id,'ORDER_SUBMITTED_FOR_REVIEW','order',v_order_id,'SUCCESS',jsonb_build_object('idempotency_key',p_idempotency_key));
  update public.carts set status='CONVERTED',version=version+1,updated_at=now() where id=v_cart.id;
  return query select v_order_id,v_order_number;
end; $$;

revoke all on function public.add_to_establishment_cart(uuid,uuid,integer) from public,anon;
grant execute on function public.add_to_establishment_cart(uuid,uuid,integer) to authenticated;
revoke all on function public.submit_order_for_review(uuid,uuid,text,text) from public,anon;
grant execute on function public.submit_order_for_review(uuid,uuid,text,text) to authenticated;
