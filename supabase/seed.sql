-- Seed determinístico para desenvolvimento. Não cria usuários nem credenciais.
insert into public.companies (id, legal_name, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Empresa Demo Ltda.', 'Empresa Demo')
on conflict (id) do update set display_name = excluded.display_name, updated_at = now();

insert into public.establishments (id, company_id, name)
values ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Loja Principal')
on conflict (id) do update set name = excluded.name, updated_at = now();

insert into public.categories (id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000000101', 'Bebidas', 10),
  ('00000000-0000-0000-0000-000000000102', 'Mercearia', 20)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order, updated_at = now();

insert into public.products (id, category_id, name, brand, description)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Água mineral sem gás', 'ProStock', 'Garrafa de 500 ml'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'Arroz branco', 'ProStock', 'Pacote de 5 kg')
on conflict (id) do update set name = excluded.name, brand = excluded.brand, description = excluded.description, updated_at = now();

insert into public.product_variants (id, product_id, sku_code, name, sale_unit)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'DEMO-AGUA-500', 'Unidade 500 ml', 'UN'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 'DEMO-ARROZ-5KG', 'Pacote 5 kg', 'UN')
on conflict (id) do update set name = excluded.name, sale_unit = excluded.sale_unit, updated_at = now();

insert into public.prices (id, company_id, sku_id, amount_minor, valid_from)
values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 299, '2026-01-01T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000302', 2499, '2026-01-01T00:00:00Z')
on conflict (id) do update set amount_minor = excluded.amount_minor, updated_at = now();

insert into public.inventory_locations (id, name)
values ('00000000-0000-0000-0000-000000000501', 'Centro de distribuição demo')
on conflict (id) do update set name = excluded.name, updated_at = now();

insert into public.inventory_balances (inventory_location_id, sku_id, on_hand, reserved)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000301', 100, 0),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000302', 50, 0)
on conflict (inventory_location_id, sku_id) do update set on_hand = excluded.on_hand, reserved = excluded.reserved, updated_at = now();
