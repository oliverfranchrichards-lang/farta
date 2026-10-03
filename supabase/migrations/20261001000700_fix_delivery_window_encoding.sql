-- Normalize the second delivery-window label in the already deployed function.
-- The previous migration was generated with a mojibake literal (AmanhÃ£),
-- which made the valid Portuguese label fail validation.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.submit_order_for_review(uuid,uuid,text,text)'::regprocedure)
    into v_definition;
  v_definition := replace(v_definition, 'Amanh' || chr(195) || chr(163), 'Amanh' || chr(227));
  execute v_definition;
end;
$$;
