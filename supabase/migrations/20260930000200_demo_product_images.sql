-- Imagens públicas determinísticas para a apresentação do catálogo.
-- O campo storage_object_path recebe a URL externa apenas para o demo visual;
-- a migração de produção poderá mover os arquivos para Supabase Storage.

insert into public.product_images (
  id, variant_id, storage_object_path, mime_type, byte_size, alt_text, sort_order, is_primary
)
select
  ('00000000-0000-0000-0000-' || lpad((4000 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-0000-0000-' || lpad((2000 + n)::text, 12, '0'))::uuid,
  'https://loremflickr.com/640/480/' || case
    when n between 1 and 7 then 'beverage,drink'
    when n between 8 and 16 then 'grocery,food'
    when n between 17 and 23 then 'dairy,food'
    when n between 24 and 29 then 'vegetable,fruit'
    when n between 30 and 35 then 'bakery,bread'
    when n between 36 and 41 then 'cleaning,home'
    when n between 42 and 46 then 'restaurant,supplies'
    else 'frozen,food'
  end || '?lock=' || (4000 + n)::text,
  'image/jpeg',
  1,
  p.name,
  0,
  true
from generate_series(1, 50) as n
join public.products p
  on p.id = ('00000000-0000-0000-0000-' || lpad((1000 + n)::text, 12, '0'))::uuid
on conflict (id) do update
set storage_object_path = excluded.storage_object_path,
    mime_type = excluded.mime_type,
    byte_size = excluded.byte_size,
    alt_text = excluded.alt_text,
    is_primary = true;
