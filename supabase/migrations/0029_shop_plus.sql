-- 0029 — Shop plus (spec 12 · Shop 1–10): shop by need, "used in" links, Mike-using-it photos, bundles,
-- member pricing, free-shipping threshold, order tracking, gear ratings, first-sessions unlock.
-- Additive only. Prices are always computed here, never in the browser. Members never write orders.

-- ---------------------------------------------------------------- catalogue columns
alter table public.shop_products add column if not exists need text;
alter table public.shop_products add column if not exists used_in jsonb not null default '[]'::jsonb;      -- [{label, href}]
alter table public.shop_products add column if not exists mike_photo jsonb;                                -- {src, alt, focal, caption}
alter table public.shop_products add column if not exists bundle jsonb not null default '[]'::jsonb;       -- [{slug, key, qty}] for bundles
do $$ begin
  alter table public.shop_products add constraint shop_products_need_chk check (need is null or need in ('start', 'level-up', 'recover', 'wear'));
exception when duplicate_object then null; end $$;

alter table public.shop_variants add column if not exists member_price_cents int;
alter table public.shop_variants add column if not exists weight_kg numeric;
do $$ begin
  alter table public.shop_variants add constraint shop_variants_member_price_chk check (member_price_cents is null or (member_price_cents >= 0 and member_price_cents <= price_cents));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- order fulfilment (written by staff / server only)
alter table public.orders add column if not exists shipping_cents int not null default 0;
alter table public.orders add column if not exists shipping_address jsonb;
alter table public.orders add column if not exists fulfillment text;
alter table public.orders add column if not exists tracking_carrier text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
do $$ begin
  alter table public.orders add constraint orders_fulfillment_chk check (fulfillment is null or fulfillment in ('processing', 'shipped', 'delivered'));
exception when duplicate_object then null; end $$;

-- Shipping rules live in the shop setting (enabled flag untouched).
update public.site_settings
  set value = jsonb_build_object('free_shipping_cents', 15000, 'shipping_cents', 1200) || value
  where key = 'shop' and not (value ? 'free_shipping_cents');

-- ---------------------------------------------------------------- gear ratings
create table if not exists public.shop_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.shop_products (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists shop_reviews_product_idx on public.shop_reviews (product_id);
alter table public.shop_reviews enable row level security;
revoke all on public.shop_reviews from anon, authenticated;
grant select on public.shop_reviews to authenticated;
do $$ begin
  create policy shop_reviews_read on public.shop_reviews for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- helpers
-- Member = an active or trialing Pro/Max subscription.
create or replace function private.shop_is_member(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user and s.status in ('active', 'trialing') and s.plan_id in ('pro', 'max') and s.current_period_end > now()
  );
$$;
revoke all on function private.shop_is_member(uuid) from public, anon, authenticated;

create or replace function public.shop_is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.shop_is_member(auth.uid());
$$;
revoke all on function public.shop_is_member() from public, anon;
grant execute on function public.shop_is_member() to authenticated;

-- Price a cart for a member: member price when they qualify, shipping from the shop setting.
create or replace function private.shop_quote(p_user uuid, p_items jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  it jsonb; v record; v_qty int; v_member boolean := private.shop_is_member(p_user);
  v_lines jsonb := '[]'::jsonb; v_seen uuid[] := '{}'; v_sub int := 0; v_list int := 0; v_physical boolean := false;
  v_currency text; v_set jsonb; v_free int; v_flat int; v_ship int := 0; v_unit int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then return jsonb_build_object('error', 'empty'); end if;
  if jsonb_array_length(p_items) > 20 then return jsonb_build_object('error', 'too_many'); end if;
  select value into v_set from public.site_settings where key = 'shop';
  v_free := coalesce((v_set->>'free_shipping_cents')::int, 15000);
  v_flat := coalesce((v_set->>'shipping_cents')::int, 1200);
  for it in select * from jsonb_array_elements(p_items) loop
    if (it->>'variant') is null or (it->>'variant') !~* '^[0-9a-f-]{36}$' then return jsonb_build_object('error', 'not_found'); end if;
    if (it->>'variant')::uuid = any (v_seen) then continue; end if;
    v_seen := v_seen || (it->>'variant')::uuid;
    v_qty := least(greatest(coalesce((it->>'quantity')::int, 1), 1), 10);
    select sv.id, sv.label, sv.price_cents, sv.member_price_cents, sv.currency, sv.stripe_price_id, sp.slug, sp.name, sp.type, sp.inquiry
      into v from public.shop_variants sv join public.shop_products sp on sp.id = sv.product_id
      where sv.id = (it->>'variant')::uuid and sv.is_active and sp.is_active;
    if v.id is null then return jsonb_build_object('error', 'not_found', 'variant', it->>'variant'); end if;
    if v.inquiry is not null then return jsonb_build_object('error', 'by_application'); end if;
    if v.price_cents <= 0 then return jsonb_build_object('error', 'free_item'); end if;
    if v_currency is not null and v_currency <> v.currency then return jsonb_build_object('error', 'mixed_currency'); end if;
    v_currency := v.currency;
    v_unit := case when v_member and v.member_price_cents is not null then v.member_price_cents else v.price_cents end;
    v_sub := v_sub + v_unit * v_qty;
    v_list := v_list + v.price_cents * v_qty;
    v_physical := v_physical or v.type = 'physical';
    v_lines := v_lines || jsonb_build_object('variant_id', v.id, 'name', v.name, 'variant', v.label, 'unit_cents', v_unit, 'list_cents', v.price_cents,
      'quantity', v_qty, 'slug', v.slug, 'type', v.type, 'stripe_price_id', case when v_unit = v.price_cents then v.stripe_price_id end);
  end loop;
  if v_physical and v_sub < v_free then v_ship := v_flat; end if;
  return jsonb_build_object('lines', v_lines, 'currency', coalesce(v_currency, 'usd'), 'member', v_member, 'subtotal_cents', v_sub,
    'member_saving_cents', v_list - v_sub, 'shipping_cents', v_ship, 'free_shipping_cents', v_free, 'physical', v_physical, 'total_cents', v_sub + v_ship);
end $$;
revoke all on function private.shop_quote(uuid, jsonb) from public, anon, authenticated;

-- Quote for the signed-in member (read-only; used by the checkout page).
create or replace function public.quote_shop_cart(p_items jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.shop_quote(auth.uid(), p_items);
$$;
revoke all on function public.quote_shop_cart(jsonb) from public, anon;
grant execute on function public.quote_shop_cart(jsonb) to authenticated;

-- Cart checkout (service role only): re-prices from the catalogue with member pricing and shipping,
-- makes one pending order with a line per variant plus a shipping line.
create or replace function public.create_shop_checkout_order(p_user uuid, p_items jsonb, p_shipping jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare q jsonb; v_order uuid; v_ref text;
begin
  if p_user is null then raise exception 'no member'; end if;
  q := private.shop_quote(p_user, p_items);
  if q ? 'error' then return q; end if;
  insert into public.orders (user_id, status, subtotal_cents, discount_cents, total_cents, currency, provider, shipping_cents, shipping_address, fulfillment)
    values (p_user, 'pending', (q->>'subtotal_cents')::int, 0,
      (q->>'total_cents')::int, q->>'currency', 'stripe', (q->>'shipping_cents')::int,
      case when (q->>'physical')::boolean then p_shipping end, case when (q->>'physical')::boolean then 'processing' end)
    returning id, reference into v_order, v_ref;
  insert into public.order_items (order_id, kind, ref_id, name, quantity, unit_cents, benefit_applied)
    select v_order, 'product', l->>'variant_id', (l->>'name') || ' — ' || (l->>'variant'), (l->>'quantity')::int, (l->>'unit_cents')::int,
      case when (l->>'unit_cents')::int < (l->>'list_cents')::int then 'member_price' end
    from jsonb_array_elements(q->'lines') l;
  if (q->>'shipping_cents')::int > 0 then
    insert into public.order_items (order_id, kind, ref_id, name, quantity, unit_cents) values (v_order, 'shipping', 'shipping', 'Shipping', 1, (q->>'shipping_cents')::int);
  end if;
  return q || jsonb_build_object('order_id', v_order, 'reference', v_ref, 'amount_cents', (q->>'total_cents')::int);
end $$;
revoke all on function public.create_shop_checkout_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_checkout_order(uuid, jsonb, jsonb) to service_role;

-- The older cart entry point (Stripe-hosted fallback) now prices the same way.
create or replace function public.create_shop_cart_order(p_user uuid, p_items jsonb)
returns jsonb language sql security definer set search_path = '' as $$
  select public.create_shop_checkout_order(p_user, p_items, null);
$$;
revoke all on function public.create_shop_cart_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_cart_order(uuid, jsonb) to service_role;

-- Rate gear you bought (one rating per product, editable). Only for products in a paid order of yours.
create or replace function public.rate_shop_product(p_product uuid, p_rating int, p_body text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then return jsonb_build_object('error', 'signed_out'); end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then return jsonb_build_object('error', 'invalid'); end if;
  if not exists (
    select 1 from public.orders o join public.order_items i on i.order_id = o.id
      join public.shop_variants sv on sv.id::text = i.ref_id
    where o.user_id = v_user and o.status = 'paid' and i.kind = 'product' and sv.product_id = p_product
  ) then return jsonb_build_object('error', 'not_bought'); end if;
  insert into public.shop_reviews (user_id, product_id, rating, body)
    values (v_user, p_product, p_rating, nullif(left(trim(coalesce(p_body, '')), 600), ''))
    on conflict (user_id, product_id) do update set rating = excluded.rating, body = excluded.body, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.rate_shop_product(uuid, int, text) from public, anon;
grant execute on function public.rate_shop_product(uuid, int, text) to authenticated;

-- Product rating summaries (public to members).
create or replace function public.shop_ratings()
returns table (product_id uuid, average numeric, count int) language sql stable security definer set search_path = '' as $$
  select r.product_id, round(avg(r.rating)::numeric, 1), count(*)::int from public.shop_reviews r group by r.product_id;
$$;
revoke all on function public.shop_ratings() from public, anon;
grant execute on function public.shop_ratings() to authenticated;

-- First 3 sessions with your new bell: unlocked by any paid order containing a kettlebell.
create or replace function public.owns_shop_kettlebell()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o join public.order_items i on i.order_id = o.id
      join public.shop_variants sv on sv.id::text = i.ref_id
    where o.user_id = auth.uid() and o.status = 'paid' and i.kind = 'product' and sv.weight_kg is not null
  );
$$;
revoke all on function public.owns_shop_kettlebell() from public, anon;
grant execute on function public.owns_shop_kettlebell() to authenticated;

-- ---------------------------------------------------------------- catalogue: needs for existing rows
update public.shop_products set need = 'level-up' where slug = 'suples-bulgarian-bag' and need is null;
update public.shop_products set need = 'start' where slug = 'plan-on-ramp' and need is null;
update public.shop_products set need = 'level-up' where slug in ('plan-phase-1', 'plan-phase-2', 'plan-phase-3', '1-on-1-coaching-intensive') and need is null;
update public.shop_products set need = 'recover' where slug = 'retreat-deposit' and need is null;
update public.shop_products set mike_photo = '{"src": "/media/summit/mike-squat.jpg", "alt": "Mike Salemi training with a sandbag-style load", "focal": "50% 30%", "caption": "Mike uses the bag for rotational throws and carries."}'::jsonb
  where slug = 'suples-bulgarian-bag' and mike_photo is null;

-- ---------------------------------------------------------------- catalogue: new products
insert into public.shop_products (slug, name, type, category, need, tagline, description, bullets, image, note, used_in, mike_photo, bundle, position) values
  ('competition-kettlebell', 'Competition Kettlebell', 'physical', 'equipment', 'start',
   'One handle, one size. Every weight trains the same.',
   'Steel competition bells in the standard colours. The handle and body stay the same size at every weight, so your technique carries straight over when you move up.',
   '["Steel, colour-coded by weight", "Same handle and size at every weight", "Flat base for rows and push-ups"]'::jsonb,
   null, 'Ships within the US.',
   '[{"label": "Kettlebell Lifestyle · Level I, Weeks 1–4", "href": "/programs/kettlebell-lifestyle"}, {"label": "Essential Kettlebell Training: Strength", "href": "/programs/essential-kettlebell-training-strength"}]'::jsonb,
   '{"src": "/media/summit/mike-goblet.jpg", "alt": "Mike Salemi holding a kettlebell in a goblet squat", "focal": "50% 25%", "caption": "Mike teaches every goblet squat in Level I with a single bell."}'::jsonb,
   '[]'::jsonb, 20),
  ('kettlebell-pair', 'Kettlebell Pair', 'physical', 'equipment', 'level-up',
   'Double cleans, double front squats, double presses.',
   'Two matched competition bells. The step from single-bell work to doubles is where strength takes off.',
   '["Two matched bells", "Same competition handle", "Save against buying two singles"]'::jsonb,
   null, 'Ships within the US.',
   '[{"label": "Kettlebell Lifestyle · Level II", "href": "/programs/kettlebell-lifestyle"}, {"label": "Mastering the Kettlebell", "href": "/programs/mastering-the-kettlebell"}]'::jsonb,
   '{"src": "/media/summit/mike-press.jpg", "alt": "Mike Salemi pressing a kettlebell overhead", "focal": "60% 14%", "caption": "Doubles are the backbone of Level II."}'::jsonb,
   '[]'::jsonb, 21),
  ('mobility-stick', 'Mobility Stick', 'physical', 'equipment', 'recover',
   'Hip hinge, shoulder dislocates, thoracic rotation.',
   'A light 48-inch hardwood dowel. The simplest tool for grooving the hinge and opening the shoulders between sets.',
   '["48-inch hardwood", "Used in every warm-up", "Packs in a bag"]'::jsonb,
   '/media/summit/mike-standing.jpg', null,
   '[{"label": "Working-In · Morning flow", "href": "/programs/working-in"}]'::jsonb,
   '{"src": "/media/summit/mike-standing.jpg", "alt": "Mike Salemi standing tall after a mobility flow", "focal": "50% 20%", "caption": "Mike opens most sessions with the stick."}'::jsonb,
   '[]'::jsonb, 30),
  ('massage-ball-set', 'Massage Ball Set', 'physical', 'equipment', 'recover',
   'Two firm balls and a peanut for feet, hips and upper back.',
   'Firm rubber that holds its shape. Five minutes after training does more than an hour of scrolling.',
   '["Two balls and a peanut", "Firm, grippy rubber", "Mesh carry bag"]'::jsonb,
   '/media/summit/breathwork.jpg', null,
   '[{"label": "Working-In · Recovery days", "href": "/programs/working-in"}]'::jsonb,
   '{"src": "/media/summit/working-in.jpg", "alt": "Mike Salemi teaching a Working In session", "focal": "28% 30%", "caption": "Part of Mike''s recovery days in Working-In."}'::jsonb,
   '[]'::jsonb, 31),
  ('training-tee', 'Training Tee', 'physical', 'equipment', 'wear',
   'Soft, heavy cotton that survives a thousand swings.',
   'A relaxed-fit tee with a small bell mark on the chest. Made for the practice, not the mirror.',
   '["Heavyweight combed cotton", "Relaxed fit", "Small bell mark"]'::jsonb,
   '/media/summit/mike-deadlift.jpg', null, '[]'::jsonb,
   '{"src": "/media/summit/mike-deadlift.jpg", "alt": "Mike Salemi in a kettlebell deadlift", "focal": "50% 30%", "caption": "What Mike trains in."}'::jsonb,
   '[]'::jsonb, 40),
  ('training-hoodie', 'Training Hoodie', 'physical', 'equipment', 'wear',
   'For cold mornings and the walk home.',
   'Midweight fleece hoodie with the Mike Salemi wordmark. Warm without being bulky between sets.',
   '["Midweight fleece", "Wordmark on the chest", "Kangaroo pocket"]'::jsonb,
   '/media/summit/mike-getup.jpg', null, '[]'::jsonb, null, '[]'::jsonb, 41),
  ('starter-set', 'Starter Set: Three Bells', 'physical', 'bundles', 'start',
   'Light, medium, heavy. The three bells the Selector builds your set around.',
   'Three competition bells chosen with the Kettlebell Selector, plus the Mobility Stick. Everything Level I asks for.',
   '["Three competition bells", "Mobility Stick included", "Save against buying separately"]'::jsonb,
   null, 'Ships within the US.',
   '[{"label": "Kettlebell Lifestyle · Level I, Weeks 1–4", "href": "/programs/kettlebell-lifestyle"}]'::jsonb,
   '{"src": "/media/summit/mike-goblet.jpg", "alt": "Mike Salemi holding a kettlebell", "focal": "50% 25%", "caption": "The set Mike recommends for Level I."}'::jsonb,
   '[]'::jsonb, 10),
  ('recovery-kit', 'Recovery Kit', 'physical', 'bundles', 'recover',
   'Stick and balls together, for the days in between.',
   'The Mobility Stick and the Massage Ball Set, together for less.',
   '["Mobility Stick", "Massage Ball Set", "Save against buying separately"]'::jsonb,
   '/media/summit/breathwork.jpg', null,
   '[{"label": "Working-In", "href": "/programs/working-in"}]'::jsonb, null,
   '[{"slug": "mobility-stick", "key": "standard", "qty": 1}, {"slug": "massage-ball-set", "key": "standard", "qty": 1}]'::jsonb, 11)
on conflict (slug) do nothing;

-- Variants: list price, member price, weight.
insert into public.shop_variants (product_id, key, label, price_cents, member_price_cents, weight_kg, position)
select p.id, v.key, v.label, v.cents, v.member, v.kg, v.pos
from public.shop_products p
join (values
  ('competition-kettlebell', '8kg', '8 kg · Pink', 7900, 7100, 8, 1),
  ('competition-kettlebell', '12kg', '12 kg · Blue', 9900, 8900, 12, 2),
  ('competition-kettlebell', '16kg', '16 kg · Yellow', 11900, 10700, 16, 3),
  ('competition-kettlebell', '20kg', '20 kg · Purple', 13900, 12500, 20, 4),
  ('competition-kettlebell', '24kg', '24 kg · Green', 15900, 14300, 24, 5),
  ('competition-kettlebell', '28kg', '28 kg · Orange', 17900, 16100, 28, 6),
  ('competition-kettlebell', '32kg', '32 kg · Red', 19900, 17900, 32, 7),
  ('kettlebell-pair', '12kg', '2 × 12 kg · Blue', 18900, 16900, 12, 1),
  ('kettlebell-pair', '16kg', '2 × 16 kg · Yellow', 22900, 20500, 16, 2),
  ('kettlebell-pair', '20kg', '2 × 20 kg · Purple', 26900, 24100, 20, 3),
  ('kettlebell-pair', '24kg', '2 × 24 kg · Green', 30900, 27700, 24, 4),
  ('mobility-stick', 'standard', '48 in · Hardwood', 2900, 2500, null, 1),
  ('massage-ball-set', 'standard', '3-piece set', 3400, 2900, null, 1),
  ('training-tee', 's', 'S', 3800, 3200, null, 1),
  ('training-tee', 'm', 'M', 3800, 3200, null, 2),
  ('training-tee', 'l', 'L', 3800, 3200, null, 3),
  ('training-tee', 'xl', 'XL', 3800, 3200, null, 4),
  ('training-hoodie', 's', 'S', 7800, 6600, null, 1),
  ('training-hoodie', 'm', 'M', 7800, 6600, null, 2),
  ('training-hoodie', 'l', 'L', 7800, 6600, null, 3),
  ('training-hoodie', 'xl', 'XL', 7800, 6600, null, 4),
  ('starter-set', 'men', 'Men · 12, 16, 20 kg + stick', 34900, 31400, 16, 1),
  ('starter-set', 'women', 'Women · 8, 12, 16 kg + stick', 29900, 26900, 12, 2),
  ('recovery-kit', 'standard', 'Stick + ball set', 5400, 4800, null, 1)
) as v(slug, key, label, cents, member, kg, pos) on v.slug = p.slug
on conflict (product_id, key) do nothing;

-- Bundle contents per variant ("for" = the bundle variant key; no "for" = in every variant).
update public.shop_products set bundle = '[{"for":"men","slug":"competition-kettlebell","key":"12kg","qty":1},{"for":"men","slug":"competition-kettlebell","key":"16kg","qty":1},{"for":"men","slug":"competition-kettlebell","key":"20kg","qty":1},{"for":"women","slug":"competition-kettlebell","key":"8kg","qty":1},{"for":"women","slug":"competition-kettlebell","key":"12kg","qty":1},{"for":"women","slug":"competition-kettlebell","key":"16kg","qty":1},{"slug":"mobility-stick","key":"standard","qty":1}]'::jsonb
  where slug = 'starter-set' and bundle = '[]'::jsonb;
