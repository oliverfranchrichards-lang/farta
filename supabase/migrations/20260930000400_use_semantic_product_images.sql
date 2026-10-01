-- Substitui placeholders por imagens reais semanticamente relacionadas aos produtos.
-- O parâmetro sku mantém cada URL única mesmo quando produtos compartilham uma foto.

with mapped as (
  select
    pi.id,
    'https://images.unsplash.com/' || case
      when p.name ilike '%banana%' then 'photo-1574226516831-e1dff420e8f8'
      when p.name ilike '%tomate%' then 'photo-1546094096-0df4bcaaa337'
      when p.name ilike '%cebola%' then 'photo-1518977956812-cd3dbadaaf31'
      when p.name ilike '%batata inglesa%' then 'photo-1518977676601-b53f82aba655'
      when p.name ilike '%alface%' then 'photo-1622205313162-be1d5712a43c'
      when p.name ilike '%limão%' then 'photo-1590502593747-42a996133562'
      when p.name ilike '%maçã%' then 'photo-1560806887-1e4cd0b6cbd6'
      when p.name ilike '%leite integral%' then 'photo-1550583724-b2692b85b150'
      when p.name ilike '%queijo%' or p.name ilike '%requeijão%' then 'photo-1452195100486-9cc805987862'
      when p.name ilike '%iogurte%' or p.name ilike '%creme de leite%' or p.name ilike '%leite condensado%' then 'photo-1488477181946-6428a0291777'
      when p.name ilike '%pão%' or p.name ilike '%torrada%' then 'photo-1509440159596-0249088772ff'
      when p.name ilike '%croissant%' or p.name ilike '%bolo%' then 'photo-1555507036-ab1c0f9f3c4f'
      when p.name ilike '%café%' then 'photo-1495474472287-4d71bcdd2085'
      when p.name ilike '%refrigerante%' then 'photo-1554866585-cd94860890b7'
      when p.name ilike '%suco%' or p.name ilike '%chá%' then 'photo-1600271886742-f049cd451bba'
      when p.name ilike '%detergente%' or p.name ilike '%sabão%' or p.name ilike '%limpador%' or p.name ilike '%água sanitária%' then 'photo-1583947215259-38e31be8751f'
      when p.name ilike '%papel higiênico%' or p.name ilike '%papel toalha%' then 'photo-1584622650111-993a426fbf0a'
      when p.name ilike '%copo%' or p.name ilike '%prato%' or p.name ilike '%guardanapo%' or p.name ilike '%saco%' or p.name ilike '%alumínio%' then 'photo-1604594849809-dfedbc827105'
      when p.name ilike '%pizza%' then 'photo-1574071318508-1cdbab80d002'
      when p.name ilike '%batata palito%' then 'photo-1573080496219-bb080dd4f877'
      when p.name ilike '%nuggets%' then 'photo-1562967914-608f82629710'
      when p.name ilike '%açaí%' then 'photo-1577805947697-89e18249d767'
      when p.name ilike '%água%' then 'photo-1564419320461-6870880221ad'
      else 'photo-1542838132-92c53300491e'
    end || '?auto=format&fit=crop&w=640&q=80&sku=' || pv.sku_code as image_url
  from public.product_images pi
  join public.product_variants pv on pv.id = pi.variant_id
  join public.products p on p.id = pv.product_id
)
update public.product_images pi
set storage_object_path = mapped.image_url
from mapped
where pi.id = mapped.id;

insert into public.product_images (
  variant_id, storage_object_path, mime_type, byte_size, alt_text, sort_order, is_primary
)
select
  pv.id,
  'https://images.unsplash.com/' || case
    when p.name ilike '%arroz%' then 'photo-1586201375761-83865001e31c'
    when p.name ilike '%água%' then 'photo-1564419320461-6870880221ad'
    else 'photo-1542838132-92c53300491e'
  end || '?auto=format&fit=crop&w=640&q=80&sku=' || pv.sku_code,
  'image/jpeg', 1, p.name, 0, true
from public.product_variants pv
join public.products p on p.id = pv.product_id
where (p.name ilike '%arroz%' or p.name ilike 'Água mineral sem gás%')
  and not exists (select 1 from public.product_images existing where existing.variant_id = pv.id and existing.is_primary);
