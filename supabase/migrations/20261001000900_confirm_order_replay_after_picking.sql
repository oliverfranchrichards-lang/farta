-- A client retry can arrive after the operator has already started picking.
-- Preserve confirmation idempotency while excluding legacy picking orders.
do $$
declare
  v_definition text;
  v_old text := 'if v_order.status = ''CUSTOMER_CONFIRMED'' then return true; end if;';
  v_new text := 'if v_order.final_confirmed_at is not null and v_order.status in (''CUSTOMER_CONFIRMED'',''PICKING'',''READY_FOR_DISPATCH'',''DISPATCHED'',''DELIVERED'',''RECEIPT_CONFIRMED'') then return true; end if;';
begin
  select pg_get_functiondef('public.confirm_final_order_price(uuid,text)'::regprocedure)
    into v_definition;
  if position(v_old in v_definition) = 0 then raise exception 'CONFIRM_FUNCTION_SHAPE_UNEXPECTED'; end if;
  execute replace(v_definition, v_old, v_new);
end;
$$;
