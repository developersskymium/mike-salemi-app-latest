-- 0032 Shop: only what Mike actually sells.
-- Client (Nov 20): the shop carries only real physical products Mike offers, with real photos.
-- Today that is the Suples Bulgarian Bag® (Original Leather), which Mike sells as an authorised Suples
-- distributor (mikesalemi.io). Everything else is unpublished (is_active = false), never deleted.

-- 1. The Suples Bulgarian Bag: real copy, real photos, shipping included, USA only.
update public.shop_products set
  name        = 'Suples Bulgarian Bag® — Original Leather Model',
  type        = 'physical',
  category    = 'equipment',
  need        = null,
  tagline     = 'The bag Mike trains with. Made in Bulgaria.',
  description = 'The original genuine-leather Bulgarian Bag, made in Bulgaria by Suples. "The one I train with… It''s my favorite bag." — Mike. Swing it, spin it, throw it and carry it: it loads you in every plane and stands in for kettlebells, dumbbells, medicine balls and sandbags. Mike is an authorised Suples distributor and educator.',
  bullets     = '["Genuine leather, made in Bulgaria","2-year warranty on genuine leather","Shipping included (USA orders only)","Sold by Mike as an authorised Suples distributor"]'::jsonb,
  image       = 'https://assets.cdn.filesafe.space/UighMD1kAbJoZtbTe7zW/media/66215673c2107c08ffd3160e.jpeg',
  gallery     = '[
    {"src":"/media/shop/mike-bulgarian-bag.png","alt":"Mike Salemi swinging the Suples Bulgarian Bag overhead","fit":"cover","focal":"40% 40%"},
    {"src":"https://assets.cdn.filesafe.space/UighMD1kAbJoZtbTe7zW/media/692854bb354d2b20f4843699.jpg","alt":"Mike Salemi spinning the Suples Bulgarian Bag","fit":"cover","focal":"50% 35%"},
    {"src":"https://assets.cdn.filesafe.space/UighMD1kAbJoZtbTe7zW/media/6928a6ae8f87970d1ea25ac4.jpg","alt":"Bulgarian Bag certification with Mike Salemi","fit":"cover","focal":"50% 40%"}
  ]'::jsonb,
  mike_photo  = '{"src":"https://assets.cdn.filesafe.space/UighMD1kAbJoZtbTe7zW/media/692854bb354d2b20f4843699.jpg","alt":"Mike Salemi spinning the Suples Bulgarian Bag","focal":"50% 35%","caption":"The one I train with. It''s my favorite bag."}'::jsonb,
  used_in     = '[{"label":"Athleticism 4 Life","href":"/programs/athleticism-4-life"},{"label":"Level 1 Bulgarian Bag Certification","href":"https://mikesalemi.io/bulgarianbagcertifications"}]'::jsonb,
  bundle      = '[]'::jsonb,
  note        = 'USA orders only · shipping included.',
  inquiry     = null,
  file_url    = null,
  position    = 1,
  is_active   = true
where slug = 'suples-bulgarian-bag';

-- Old six-size variants (pre-tonight guesses) → inactive; the real 16 size/weight variants from mikesalemi.io.
update public.shop_variants set is_active = false
where product_id = (select id from public.shop_products where slug = 'suples-bulgarian-bag')
  and key in ('x-small', 'small', 'medium', 'large', 'x-large', 'xx-large');

insert into public.shop_variants (product_id, key, label, price_cents, member_price_cents, weight_kg, currency, position, is_active)
select p.id, v.key, v.label, v.cents, null, v.kg, 'usd', v.pos, true
from public.shop_products p, (values
  ('xs-6lb',   'XS · 6 lb / 3 kg',    13600,  3,  1),
  ('xs-11lb',  'XS · 11 lb / 5 kg',   16200,  5,  2),
  ('s-13lb',   'S · 13 lb / 6 kg',    16600,  6,  3),
  ('s-17lb',   'S · 17 lb / 8 kg',    16900,  8,  4),
  ('m-22lb',   'M · 22 lb / 10 kg',   19300, 10,  5),
  ('m-26lb',   'M · 26 lb / 12 kg',   19900, 12,  6),
  ('m-30lb',   'M · 30 lb / 14 kg',   20400, 14,  7),
  ('l-33lb',   'L · 33 lb / 15 kg',   19500, 15,  8),
  ('l-37lb',   'L · 37 lb / 17 kg',   23300, 17,  9),
  ('l-42lb',   'L · 42 lb / 19 kg',   20900, 19, 10),
  ('xl-44lb',  'XL · 44 lb / 20 kg',  23000, 20, 11),
  ('xl-50lb',  'XL · 50 lb / 22 kg',  24600, 22, 12),
  ('xl-58lb',  'XL · 58 lb / 26 kg',  29300, 26, 13),
  ('xxl-66lb', 'XXL · 66 lb / 30 kg', 32100, 30, 14),
  ('xxl-75lb', 'XXL · 75 lb / 34 kg', 29500, 34, 15),
  ('xxl-84lb', 'XXL · 84 lb / 38 kg', 34500, 38, 16)
) as v(key, label, cents, kg, pos)
where p.slug = 'suples-bulgarian-bag'
on conflict (product_id, key) do update set
  label = excluded.label, price_cents = excluded.price_cents, member_price_cents = null,
  weight_kg = excluded.weight_kg, currency = 'usd', position = excluded.position, is_active = true;

-- 2. Unpublish everything that is not a real physical product Mike sells (invented tonight in 0029, or digital).
update public.shop_products set is_active = false
where slug <> 'suples-bulgarian-bag';

-- 3. Shipping is included on the bag: no flat shipping line.
update public.site_settings
set value = coalesce(value, '{}'::jsonb) || '{"free_shipping_cents":0,"shipping_cents":0}'::jsonb
where key = 'shop';
