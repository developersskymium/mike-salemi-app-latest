-- 0014 — W4 (You): medal progress, referral funnel and tiers, shop catalog with server-made orders.
-- Additive only. Members read their own rows; every write goes through a security definer function
-- (members never write points, badges, certificates or orders).

-- ============================================================ 1. Next-medal progress
-- One row per badge: how far the member is towards it, with the same rules as private.evaluate_badges.
create or replace function public.my_badge_progress()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  b record; v_kind text; v_key text; v_cur int; v_target int;
  v_days int; v_best int; v_tools int; v_tools_all int; v_refs int; v_points int;
  v_out jsonb := '[]'::jsonb;
begin
  if v_user is null then return v_out; end if;

  select count(distinct l.id)::int into v_days from public.points_ledger pl
    join public.lessons l on l.id::text = split_part(pl.ref, ':', 1)
    where pl.user_id = v_user and pl.reason = 'lesson' and l.page_type is null;
  select s.best_days into v_best from private.streaks(v_user) s;
  select count(distinct tr.tool_id)::int into v_tools from public.tool_results tr where tr.user_id = v_user;
  select count(*)::int into v_tools_all from public.tools t where t.status = 'published';
  select count(*)::int into v_refs from public.referrals rf where rf.referrer_id = v_user and rf.status in ('paid', 'rewarded');
  select coalesce(sum(pl.amount), 0)::int into v_points from public.points_ledger pl where pl.user_id = v_user;

  for b in select * from public.badges order by position loop
    v_kind := b.rule->>'kind';
    v_cur := 0; v_target := 1;
    if v_kind = 'days' then
      v_cur := coalesce(v_days, 0); v_target := coalesce((b.rule->>'count')::int, 1);
    elsif v_kind = 'streak' then
      v_cur := coalesce(v_best, 0); v_target := coalesce((b.rule->>'days')::int, (b.rule->>'count')::int, 1);
    elsif v_kind in ('tool', 'tools') then
      v_cur := coalesce(v_tools, 0);
      v_target := case when coalesce((b.rule->>'all')::boolean, false) then greatest(v_tools_all, 1) else coalesce((b.rule->>'count')::int, 1) end;
    elsif v_kind = 'referral' then
      v_cur := v_refs; v_target := coalesce((b.rule->>'count')::int, 1);
    elsif v_kind = 'points' then
      v_cur := v_points; v_target := coalesce((b.rule->>'total')::int, 1000);
    elsif v_kind in ('section', 'phase') then
      -- the furthest matching section (lessons done / lessons) in a program the member is enrolled in
      v_key := coalesce(b.rule->>'key', b.rule->>'phase');
      select x.d, x.t into v_cur, v_target from (
        select count(*) filter (where private.lesson_done(v_user, l.id))::int as d, count(*)::int as t
        from public.sections s
        join public.enrollments e on e.user_id = v_user and e.program_id = s.program_id
                                 and (s.path_id is null or s.path_id is not distinct from e.path_id)
        join public.lessons l on l.section_id = s.id
        where v_key is null or s.key = v_key or s.key like '%-' || v_key
        group by s.id) x
      order by x.d::numeric / greatest(x.t, 1) desc, x.t limit 1;
    elsif v_kind in ('path', 'level') then
      v_key := coalesce(b.rule->>'key', b.rule->>'path');
      select count(*) filter (where private.lesson_done(v_user, l.id))::int, count(*)::int into v_cur, v_target
        from public.lessons l join public.program_paths pp on pp.id = l.path_id where pp.key = v_key;
    end if;
    v_cur := coalesce(v_cur, 0); v_target := greatest(coalesce(v_target, 1), 1);
    v_out := v_out || jsonb_build_object(
      'id', b.id, 'current', least(v_cur, v_target), 'target', v_target,
      'earned', exists (select 1 from public.member_badges mb where mb.user_id = v_user and mb.badge_id = b.id));
  end loop;
  return v_out;
end $$;

revoke all on function public.my_badge_progress() from public, anon;
grant execute on function public.my_badge_progress() to authenticated;

-- ============================================================ 2. Referral funnel
create table if not exists public.referral_events (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('share', 'visit')),
  channel text check (channel in ('link', 'copy', 'native', 'whatsapp', 'email', 'x')),
  created_at timestamptz not null default now()
);
create index if not exists referral_events_referrer_idx on public.referral_events (referrer_id, created_at desc);
alter table public.referral_events enable row level security;
revoke all on public.referral_events from anon, authenticated;
grant select on public.referral_events to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referral_events' and policyname = 'own_read') then
    create policy own_read on public.referral_events for select to authenticated using (referrer_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referral_events' and policyname = 'admin_all') then
    create policy admin_all on public.referral_events for all to authenticated
      using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- The member shared their link through a channel (logged for the funnel; capped per day).
create or replace function public.log_referral_share(p_channel text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if p_channel not in ('link', 'copy', 'native', 'whatsapp', 'email', 'x') then raise exception 'invalid channel'; end if;
  if (select count(*) from public.referral_events e where e.referrer_id = v_user and e.kind = 'share'
        and e.created_at > now() - interval '1 day') >= 50 then return; end if;
  insert into public.referral_events (referrer_id, kind, channel) values (v_user, 'share', p_channel);
end $$;

-- Someone opened an invite link (/join?ref=CODE). Callable signed out; capped per referrer per day.
create or replace function public.log_referral_visit(p_code text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_ref uuid;
begin
  select rc.user_id into v_ref from public.referral_codes rc where rc.code = upper(trim(p_code));
  if v_ref is null or v_ref = (select auth.uid()) then return; end if;
  if (select count(*) from public.referral_events e where e.referrer_id = v_ref and e.kind = 'visit'
        and e.created_at > now() - interval '1 day') >= 200 then return; end if;
  insert into public.referral_events (referrer_id, kind, channel) values (v_ref, 'visit', 'link');
end $$;

revoke all on function public.log_referral_share(text), public.log_referral_visit(text) from public, anon, authenticated;
grant execute on function public.log_referral_share(text) to authenticated;
grant execute on function public.log_referral_visit(text) to anon, authenticated;

-- What referral points unlock (legacy tiers; the reward rule is confirmed with the client, Studio edits it).
insert into public.site_settings (key, value) values
  ('referral_tiers', '[{"points":100,"reward":"5-Minute Downshift Workshop"},{"points":500,"reward":"Printable plan bundle"},{"points":1000,"reward":"Mastering the Kettlebell — Ballistic tier"}]'::jsonb),
  ('shop', '{"enabled": false, "note": "Turn on when products, prices and Stripe are confirmed."}'::jsonb)
on conflict (key) do nothing;

-- ============================================================ 3. Shop catalog
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null check (type in ('digital', 'physical')),
  tagline text,
  description text,
  bullets jsonb not null default '[]'::jsonb,
  image text,
  note text,
  -- sold by application: {"label": "...", "href": "/coaching"}; no checkout
  inquiry jsonb,
  -- free digital download, shown to members with access to `program_id` (or everyone when null)
  file_url text,
  program_id uuid references public.programs (id) on delete set null,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.shop_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products (id) on delete cascade,
  key text not null,
  label text not null,
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'usd',
  stripe_price_id text,
  position int not null default 0,
  is_active boolean not null default true,
  unique (product_id, key)
);
create index if not exists shop_variants_product_idx on public.shop_variants (product_id);
create index if not exists shop_products_program_idx on public.shop_products (program_id);

alter table public.shop_products enable row level security;
alter table public.shop_variants enable row level security;
revoke all on public.shop_products, public.shop_variants from anon, authenticated;
grant select on public.shop_products, public.shop_variants to anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['shop_products', 'shop_variants'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'public_read') then
      execute format('create policy public_read on public.%I for select to anon, authenticated using (is_active)', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'admin_all') then
      execute format('create policy admin_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    end if;
  end loop;
end $$;

-- Legacy catalog (src/content/shop.ts + plans.ts).
insert into public.shop_products (slug, name, type, tagline, description, bullets, image, note, inquiry, file_url, program_id, position) values
  ('suples-bulgarian-bag', 'Suples Bulgarian Bag® — Original Leather', 'physical', 'Tri-planar loading no other tool gives you',
   'The original leather Bulgarian Bag, made in Bulgaria. It stands in for kettlebells, dumbbells, medicine balls, weight vests and barbells, and opens up rotational work you cannot replicate with a bell.',
   '["Leather construction, made in Bulgaria","Six sizes from X-Small to XX-Large","Tri-planar swings, spins and throws","Suits every sport"]',
   '/media/shop/bulgarian-bag.jpg', 'USA orders only.', null, null, null, 10),
  ('1-on-1-coaching-intensive', '1-on-1 Coaching Intensive with Mike', 'digital', 'Technique and movement, coached personally',
   'A private video session with Mike to review your technique, your training plan and what to work on next.',
   '["Private video call","Technique review","Personal next-step plan"]',
   '/media/shop/downshift.jpg', 'Application required — Mike''s team confirms fit, timing and pricing with you.',
   '{"label":"Request booking","href":"/coaching"}', null, null, 20),
  ('retreat-deposit', 'Retreat Deposit', 'digital', 'Hold your place at the next retreat',
   'Reserve a spot at an upcoming Mike Salemi retreat. The balance is due before the retreat starts.',
   '["Holds your place","Applied to the full retreat price"]',
   '/media/retreats/fire-circle.jpg', 'Application required — deposit details are shared once your place is confirmed.',
   '{"label":"Apply for a place","href":"/programs/men-of-movement-retreats"}', null, null, 30)
on conflict (slug) do nothing;

insert into public.shop_products (slug, name, type, tagline, description, bullets, image, file_url, program_id, position)
select v.slug, v.name, 'digital', 'Included with Kettlebell Lifestyle',
  'The printable phase plan: every day laid out with its focus, so you can train from paper when you would rather leave the phone alone. ' || v.summary,
  '["Full phase breakdown","Print or save to your phone","Included with Kettlebell Lifestyle"]'::jsonb,
  '/media/shop/plan.jpg', v.file, (select p.id from public.programs p where p.slug = 'kettlebell-lifestyle'), v.pos
from (values
  ('plan-on-ramp', 'On Ramp Plan — printable plan', 'Approximately 7 days: get set up, learn the ground rules and ease into the weekly rhythm.', '/media/plans/Kettlebell-Lifestyle-On-Ramp-Phase-Plan.pdf', 40),
  ('plan-phase-1', 'Phase I Plan — printable plan', 'Approximately 14 days: movement foundations, kettlebell fundamentals and postural awareness.', '/media/plans/Kettlebell-Lifestyle-Phase-I-Plan.pdf', 41),
  ('plan-phase-2', 'Phase II Plan — printable plan', 'Approximately 21 days: build on the fundamentals with more strength and skill work.', '/media/plans/Kettlebell-Lifestyle-Phase-II-Plan.pdf', 42),
  ('plan-phase-3', 'Phase III Plan — printable plan', 'Approximately 21 days: bring it together with full sessions, tougher workouts and lasting habits.', '/media/plans/Kettlebell-Lifestyle-Phase-III-Plan.pdf', 43)
) as v(slug, name, summary, file, pos)
on conflict (slug) do nothing;

insert into public.shop_variants (product_id, key, label, price_cents, position)
select p.id, v.key, v.label, v.cents, v.pos from public.shop_products p
cross join (values
  ('x-small', 'X-Small · 12 lb', 13600, 1), ('small', 'Small · 17 lb', 14600, 2), ('medium', 'Medium · 26 lb', 16600, 3),
  ('large', 'Large · 37 lb', 19600, 4), ('x-large', 'X-Large · 50 lb', 22600, 5), ('xx-large', 'XX-Large · 61 lb', 25600, 6)
) as v(key, label, cents, pos)
where p.slug = 'suples-bulgarian-bag'
on conflict (product_id, key) do nothing;

-- ============================================================ 4. Shop orders (server only)
-- Called by the shop checkout with the service role: the price comes from shop_variants, never the browser.
-- The order is a normal `orders` row (kind 'product' items), so the Stripe webhook's apply_paid_order marks it
-- paid without granting anything, and it shows in the member's order history.
create or replace function public.create_shop_order(p_user uuid, p_variant uuid, p_quantity int default 1)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v record; v_qty int := least(greatest(coalesce(p_quantity, 1), 1), 10); v_order uuid; v_ref text;
begin
  if p_user is null then raise exception 'no member'; end if;
  select sv.id, sv.label, sv.price_cents, sv.currency, sv.stripe_price_id, sp.id as product_id, sp.slug, sp.name, sp.type, sp.inquiry
    into v from public.shop_variants sv join public.shop_products sp on sp.id = sv.product_id
    where sv.id = p_variant and sv.is_active and sp.is_active;
  if v.id is null then return jsonb_build_object('error', 'not_found'); end if;
  if v.inquiry is not null then return jsonb_build_object('error', 'by_application'); end if;
  if v.price_cents <= 0 then return jsonb_build_object('error', 'free_item'); end if;

  insert into public.orders (user_id, status, subtotal_cents, discount_cents, total_cents, currency, provider)
    values (p_user, 'pending', v.price_cents * v_qty, 0, v.price_cents * v_qty, v.currency, 'stripe')
    returning id, reference into v_order, v_ref;
  insert into public.order_items (order_id, kind, ref_id, name, quantity, unit_cents)
    values (v_order, 'product', v.id::text, v.name || ' — ' || v.label, v_qty, v.price_cents);
  return jsonb_build_object('order_id', v_order, 'reference', v_ref, 'amount_cents', v.price_cents * v_qty, 'unit_cents', v.price_cents,
    'quantity', v_qty, 'currency', v.currency, 'name', v.name, 'variant', v.label, 'type', v.type, 'slug', v.slug,
    'stripe_price_id', v.stripe_price_id);
end $$;

revoke all on function public.create_shop_order(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.create_shop_order(uuid, uuid, int) to service_role;
