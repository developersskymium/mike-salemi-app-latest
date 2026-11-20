-- 0021 — P4 shop: categories, product galleries and a multi-line cart order. Additive only.

alter table public.shop_products add column if not exists category text;
alter table public.shop_products add column if not exists gallery jsonb not null default '[]'::jsonb;

-- Categories for the current catalogue (only where not set yet).
update public.shop_products set category = 'equipment' where category is null and type = 'physical';
update public.shop_products set category = 'plans' where category is null and file_url is not null;
update public.shop_products set category = 'coaching' where category is null and slug like '%coaching%';
update public.shop_products set category = 'retreats' where category is null and slug like '%retreat%';
update public.shop_products set category = 'digital' where category is null;

-- Galleries: extra images after the cover (cover = shop_products.image). [{src, alt, fit?, focal?}]
update public.shop_products set gallery = '[
  {"src": "/media/shop/bulgarian-bag.jpg", "alt": "The leather Bulgarian Bag on a gym floor", "focal": "50% 55%"}
]'::jsonb where slug = 'suples-bulgarian-bag' and gallery = '[]'::jsonb;
update public.shop_products set gallery = '[
  {"src": "/media/summit/mike-coaching.jpg", "alt": "Mike coaching one to one", "focal": "50% 30%"},
  {"src": "/media/shop/downshift.jpg", "alt": "A quiet moment of breathwork", "focal": "55% 40%"}
]'::jsonb where slug = '1-on-1-coaching-intensive' and gallery = '[]'::jsonb;
update public.shop_products set gallery = '[
  {"src": "/media/summit/summit-group.jpg", "alt": "Men of Movement on Mount Shasta", "focal": "50% 40%"},
  {"src": "/media/retreats/ridge-circle.jpg", "alt": "A circle on the ridge", "focal": "50% 45%"},
  {"src": "/media/retreats/sunrise-lodge.jpg", "alt": "The lodge at sunrise", "focal": "50% 50%"}
]'::jsonb where slug = 'retreat-deposit' and gallery = '[]'::jsonb;
update public.shop_products p set gallery = jsonb_build_array(
    jsonb_build_object('src', '/media/shop/plans/' || p.slug || '-1.jpg', 'alt', 'Page 1 of the plan', 'fit', 'contain'),
    jsonb_build_object('src', '/media/shop/plans/' || p.slug || '-2.jpg', 'alt', 'Page 2 of the plan', 'fit', 'contain'),
    jsonb_build_object('src', '/media/shop/plans/' || p.slug || '-3.jpg', 'alt', 'Page 3 of the plan', 'fit', 'contain'))
  where p.slug in ('plan-on-ramp', 'plan-phase-1', 'plan-phase-2', 'plan-phase-3') and p.gallery = '[]'::jsonb;

-- Cart checkout: one pending order with a line per variant. Prices come from shop_variants, never the browser.
-- Called by the server with the service role (members never write orders).
create or replace function public.create_shop_cart_order(p_user uuid, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  it jsonb; v record; v_qty int; v_order uuid; v_ref text; v_currency text; v_total int := 0;
  v_lines jsonb := '[]'::jsonb; v_physical boolean := false; v_seen uuid[] := '{}';
begin
  if p_user is null then raise exception 'no member'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then return jsonb_build_object('error', 'empty'); end if;
  if jsonb_array_length(p_items) > 20 then return jsonb_build_object('error', 'too_many'); end if;

  for it in select * from jsonb_array_elements(p_items) loop
    if (it->>'variant') is null or (it->>'variant') !~* '^[0-9a-f-]{36}$' then return jsonb_build_object('error', 'not_found'); end if;
    if (it->>'variant')::uuid = any (v_seen) then continue; end if;
    v_seen := v_seen || (it->>'variant')::uuid;
    v_qty := least(greatest(coalesce((it->>'quantity')::int, 1), 1), 10);
    select sv.id, sv.label, sv.price_cents, sv.currency, sv.stripe_price_id, sp.slug, sp.name, sp.type, sp.inquiry
      into v from public.shop_variants sv join public.shop_products sp on sp.id = sv.product_id
      where sv.id = (it->>'variant')::uuid and sv.is_active and sp.is_active;
    if v.id is null then return jsonb_build_object('error', 'not_found', 'variant', it->>'variant'); end if;
    if v.inquiry is not null then return jsonb_build_object('error', 'by_application'); end if;
    if v.price_cents <= 0 then return jsonb_build_object('error', 'free_item'); end if;
    if v_currency is not null and v_currency <> v.currency then return jsonb_build_object('error', 'mixed_currency'); end if;
    v_currency := v.currency;
    v_total := v_total + v.price_cents * v_qty;
    v_physical := v_physical or v.type = 'physical';
    v_lines := v_lines || jsonb_build_object('variant_id', v.id, 'name', v.name, 'variant', v.label, 'unit_cents', v.price_cents,
      'quantity', v_qty, 'slug', v.slug, 'type', v.type, 'stripe_price_id', v.stripe_price_id);
  end loop;

  insert into public.orders (user_id, status, subtotal_cents, discount_cents, total_cents, currency, provider)
    values (p_user, 'pending', v_total, 0, v_total, v_currency, 'stripe')
    returning id, reference into v_order, v_ref;
  insert into public.order_items (order_id, kind, ref_id, name, quantity, unit_cents)
    select v_order, 'product', l->>'variant_id', (l->>'name') || ' — ' || (l->>'variant'), (l->>'quantity')::int, (l->>'unit_cents')::int
    from jsonb_array_elements(v_lines) l;
  return jsonb_build_object('order_id', v_order, 'reference', v_ref, 'amount_cents', v_total, 'currency', v_currency,
    'physical', v_physical, 'lines', v_lines);
end $$;

revoke all on function public.create_shop_cart_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_cart_order(uuid, jsonb) to service_role;
