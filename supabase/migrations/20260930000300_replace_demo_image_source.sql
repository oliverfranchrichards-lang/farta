-- LoremFlickr passou a responder 401 ao proxy de imagens do Next.js.
-- Picsum fornece URLs determinísticas sem autenticação para o demo.
update public.product_images
set storage_object_path = 'https://picsum.photos/seed/farta-' || (4000 + row_number) || '/640/480'
from (
  select id, row_number() over (order by id) as row_number
  from public.product_images
  where variant_id is not null
    and storage_object_path like 'https://loremflickr.com/%'
) as demo_images
where public.product_images.id = demo_images.id;
