-- Catálogo demonstrativo para apresentação do MVP.
-- Cada produto abaixo possui SKU ativo, preço vigente para a Empresa Demo
-- e saldo disponível no centro de distribuição demonstrativo.

insert into public.categories (id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000000101', 'Bebidas', 10),
  ('00000000-0000-0000-0000-000000000102', 'Mercearia', 20),
  ('00000000-0000-0000-0000-000000000103', 'Laticínios', 30),
  ('00000000-0000-0000-0000-000000000104', 'Hortifruti', 40),
  ('00000000-0000-0000-0000-000000000105', 'Padaria e Confeitaria', 50),
  ('00000000-0000-0000-0000-000000000106', 'Limpeza', 60),
  ('00000000-0000-0000-0000-000000000107', 'Descartáveis', 70),
  ('00000000-0000-0000-0000-000000000108', 'Congelados', 80)
on conflict (name) do update
set sort_order = excluded.sort_order, status = 'ACTIVE', updated_at = now();

insert into public.products (id, category_id, name, brand, description)
values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', 'Água mineral sem gás 1,5 L', 'Crystal', 'Garrafa PET 1,5 litro'),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000101', 'Água mineral com gás 500 ml', 'Crystal', 'Garrafa PET 500 ml'),
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000101', 'Refrigerante cola 2 L', 'Coca-Cola', 'Garrafa PET 2 litros'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000000101', 'Refrigerante cola lata 350 ml', 'Coca-Cola', 'Lata 350 ml'),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000000101', 'Refrigerante guaraná 2 L', 'Antarctica', 'Garrafa PET 2 litros'),
  ('00000000-0000-0000-0000-000000001006', '00000000-0000-0000-0000-000000000101', 'Suco de laranja integral 1 L', 'Tial', 'Caixa 1 litro'),
  ('00000000-0000-0000-0000-000000001007', '00000000-0000-0000-0000-000000000101', 'Chá gelado pêssego 1,5 L', 'Leão', 'Garrafa PET 1,5 litro'),
  ('00000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000000102', 'Feijão carioca 1 kg', 'Camil', 'Pacote 1 kg'),
  ('00000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000102', 'Açúcar refinado 1 kg', 'União', 'Pacote 1 kg'),
  ('00000000-0000-0000-0000-000000001010', '00000000-0000-0000-0000-000000000102', 'Café torrado e moído 500 g', '3 Corações', 'Pacote 500 g'),
  ('00000000-0000-0000-0000-000000001011', '00000000-0000-0000-0000-000000000102', 'Óleo de soja 900 ml', 'Liza', 'Garrafa 900 ml'),
  ('00000000-0000-0000-0000-000000001012', '00000000-0000-0000-0000-000000000102', 'Macarrão espaguete 500 g', 'Renata', 'Pacote 500 g'),
  ('00000000-0000-0000-0000-000000001013', '00000000-0000-0000-0000-000000000102', 'Molho de tomate tradicional 300 g', 'Pomarola', 'Sachê 300 g'),
  ('00000000-0000-0000-0000-000000001014', '00000000-0000-0000-0000-000000000102', 'Farinha de mandioca 1 kg', 'Yoki', 'Pacote 1 kg'),
  ('00000000-0000-0000-0000-000000001015', '00000000-0000-0000-0000-000000000102', 'Sal refinado 1 kg', 'Cisne', 'Pacote 1 kg'),
  ('00000000-0000-0000-0000-000000001016', '00000000-0000-0000-0000-000000000102', 'Biscoito cream cracker 350 g', 'Marilan', 'Pacote 350 g'),
  ('00000000-0000-0000-0000-000000001017', '00000000-0000-0000-0000-000000000103', 'Leite integral 1 L', 'Itambé', 'Caixa 1 litro'),
  ('00000000-0000-0000-0000-000000001018', '00000000-0000-0000-0000-000000000103', 'Queijo muçarela fatiado 500 g', 'Président', 'Pacote 500 g'),
  ('00000000-0000-0000-0000-000000001019', '00000000-0000-0000-0000-000000000103', 'Requeijão cremoso 200 g', 'Vigor', 'Copo 200 g'),
  ('00000000-0000-0000-0000-000000001020', '00000000-0000-0000-0000-000000000103', 'Manteiga com sal 200 g', 'Aviação', 'Pote 200 g'),
  ('00000000-0000-0000-0000-000000001021', '00000000-0000-0000-0000-000000000103', 'Iogurte natural 170 g', 'Nestlé', 'Pote 170 g'),
  ('00000000-0000-0000-0000-000000001022', '00000000-0000-0000-0000-000000000103', 'Creme de leite 200 g', 'Nestlé', 'Caixa 200 g'),
  ('00000000-0000-0000-0000-000000001023', '00000000-0000-0000-0000-000000000103', 'Leite condensado 395 g', 'Moça', 'Lata 395 g'),
  ('00000000-0000-0000-0000-000000001024', '00000000-0000-0000-0000-000000000104', 'Banana prata', 'Hortifruti Farta', 'Caixa com aproximadamente 10 kg'),
  ('00000000-0000-0000-0000-000000001025', '00000000-0000-0000-0000-000000000104', 'Tomate italiano', 'Hortifruti Farta', 'Caixa com aproximadamente 20 kg'),
  ('00000000-0000-0000-0000-000000001026', '00000000-0000-0000-0000-000000000104', 'Cebola nacional', 'Hortifruti Farta', 'Saco 20 kg'),
  ('00000000-0000-0000-0000-000000001027', '00000000-0000-0000-0000-000000000104', 'Batata inglesa', 'Hortifruti Farta', 'Saco 25 kg'),
  ('00000000-0000-0000-0000-000000001028', '00000000-0000-0000-0000-000000000104', 'Alface crespa', 'Hortifruti Farta', 'Caixa com 24 unidades'),
  ('00000000-0000-0000-0000-000000001029', '00000000-0000-0000-0000-000000000104', 'Limão tahiti', 'Hortifruti Farta', 'Caixa com aproximadamente 20 kg'),
  ('00000000-0000-0000-0000-000000001030', '00000000-0000-0000-0000-000000000105', 'Pão francês congelado 50 g', 'Forno de Minas', 'Pacote com 2 kg'),
  ('00000000-0000-0000-0000-000000001031', '00000000-0000-0000-0000-000000000105', 'Pão de forma tradicional', 'Pullman', 'Pacote 480 g'),
  ('00000000-0000-0000-0000-000000001032', '00000000-0000-0000-0000-000000000105', 'Pão de queijo tradicional', 'Forno de Minas', 'Pacote 1 kg'),
  ('00000000-0000-0000-0000-000000001033', '00000000-0000-0000-0000-000000000105', 'Croissant de manteiga', 'Casa Suíça', 'Caixa com 12 unidades'),
  ('00000000-0000-0000-0000-000000001034', '00000000-0000-0000-0000-000000000105', 'Torrada tradicional 160 g', 'Bauducco', 'Pacote 160 g'),
  ('00000000-0000-0000-0000-000000001035', '00000000-0000-0000-0000-000000000105', 'Bolo de chocolate', 'Casa Suíça', 'Unidade 300 g'),
  ('00000000-0000-0000-0000-000000001036', '00000000-0000-0000-0000-000000000106', 'Detergente neutro 500 ml', 'Ypê', 'Frasco 500 ml'),
  ('00000000-0000-0000-0000-000000001037', '00000000-0000-0000-0000-000000000106', 'Sabão líquido 3 L', 'Omo', 'Frasco 3 litros'),
  ('00000000-0000-0000-0000-000000001038', '00000000-0000-0000-0000-000000000106', 'Água sanitária 1 L', 'Qboa', 'Frasco 1 litro'),
  ('00000000-0000-0000-0000-000000001039', '00000000-0000-0000-0000-000000000106', 'Limpador multiuso 500 ml', 'Veja', 'Frasco 500 ml'),
  ('00000000-0000-0000-0000-000000001040', '00000000-0000-0000-0000-000000000106', 'Papel toalha', 'Snob', 'Pacote com 2 rolos'),
  ('00000000-0000-0000-0000-000000001041', '00000000-0000-0000-0000-000000000106', 'Papel higiênico folha dupla', 'Neve', 'Pacote com 12 rolos'),
  ('00000000-0000-0000-0000-000000001042', '00000000-0000-0000-0000-000000000107', 'Copo descartável 200 ml', 'Copobras', 'Pacote com 100 unidades'),
  ('00000000-0000-0000-0000-000000001043', '00000000-0000-0000-0000-000000000107', 'Prato descartável 21 cm', 'Copobras', 'Pacote com 10 unidades'),
  ('00000000-0000-0000-0000-000000001044', '00000000-0000-0000-0000-000000000107', 'Guardanapo de papel', 'Snob', 'Pacote com 50 unidades'),
  ('00000000-0000-0000-0000-000000001045', '00000000-0000-0000-0000-000000000107', 'Saco para lixo 50 L', 'Dover-Roll', 'Rolo com 30 unidades'),
  ('00000000-0000-0000-0000-000000001046', '00000000-0000-0000-0000-000000000107', 'Papel alumínio 30 cm', 'Wyda', 'Rolo 7,5 metros'),
  ('00000000-0000-0000-0000-000000001047', '00000000-0000-0000-0000-000000000108', 'Batata palito congelada 2 kg', 'McCain', 'Pacote 2 kg'),
  ('00000000-0000-0000-0000-000000001048', '00000000-0000-0000-0000-000000000108', 'Nuggets de frango 1 kg', 'Sadia', 'Pacote 1 kg'),
  ('00000000-0000-0000-0000-000000001049', '00000000-0000-0000-0000-000000000108', 'Pizza muçarela congelada', 'Seara', 'Unidade 460 g'),
  ('00000000-0000-0000-0000-000000001050', '00000000-0000-0000-0000-000000000108', 'Polpa de açaí congelada 1 kg', 'Frooty', 'Pacote 1 kg')
on conflict (id) do update
set category_id = excluded.category_id, name = excluded.name, brand = excluded.brand,
    description = excluded.description, status = 'ACTIVE', updated_at = now();

insert into public.product_variants (id, product_id, sku_code, name, sale_unit)
select
  ('00000000-0000-0000-0000-' || lpad((2000 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-0000-0000-' || lpad((1000 + n)::text, 12, '0'))::uuid,
  'FARTA-DEMO-' || lpad(n::text, 3, '0'),
  'Unidade de venda',
  'UN'
from generate_series(1, 50) as n
on conflict (id) do update
set product_id = excluded.product_id, sku_code = excluded.sku_code, name = excluded.name,
    sale_unit = excluded.sale_unit, status = 'ACTIVE', updated_at = now();

insert into public.prices (id, company_id, sku_id, amount_minor, valid_from)
select
  ('00000000-0000-0000-0000-' || lpad((3000 + n)::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  ('00000000-0000-0000-0000-' || lpad((2000 + n)::text, 12, '0'))::uuid,
  amount_minor,
  '2026-01-01T00:00:00Z'::timestamptz
from unnest(array[
  499, 299, 1099, 549, 899, 1199, 899, 899, 499, 1899,
  999, 599, 399, 1099, 299, 749, 599, 2299, 899, 1099,
  329, 449, 749, 4999, 6999, 3999, 4499, 2499, 3999, 2799,
  899, 2499, 2199, 1699, 899, 649, 3299, 399, 499, 549,
  1899, 999, 799, 499, 1599, 899, 3499, 2999, 1899, 2499
]) with ordinality as values_list(amount_minor, n)
on conflict (id) do update
set amount_minor = excluded.amount_minor, status = 'ACTIVE', valid_from = excluded.valid_from,
    valid_until = null, updated_at = now();

insert into public.inventory_balances (inventory_location_id, sku_id, on_hand, reserved)
select
  '00000000-0000-0000-0000-000000000501'::uuid,
  ('00000000-0000-0000-0000-' || lpad((2000 + n)::text, 12, '0'))::uuid,
  40 + ((n * 7) % 90),
  0
from generate_series(1, 50) as n
on conflict (inventory_location_id, sku_id) do update
set on_hand = excluded.on_hand, reserved = excluded.reserved, updated_at = now();
