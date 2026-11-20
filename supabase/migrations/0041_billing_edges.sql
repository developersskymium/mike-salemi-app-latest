-- 0041 billing edges (additive only)
--   A. 30-day purchase credit toward a plan: quoted by quote_for, stored on the order, used once when the order is paid
--   B. Paused subscriptions (Stripe pause_collection): paused_at / resumes_at on subscriptions
--   C. "I'm 18 or older" on coaching bookings, coaching applications and retreat applications

-- =====================================================================================================
-- A. Purchase credit
-- Rule (conservative):
--   * One-off program purchases paid in the last 30 days, for programs the target plan (or a lower plan)
--     includes, count toward that plan. The amount is what was actually paid for the item, never list price.
--   * Only when STARTING a plan (no live card-billed Stripe subscription). In-place plan changes are prorated
--     by Stripe instead and get no credit.
--   * Best of plan discount or coupon is chosen first (unchanged); the credit applies after it.
--   * The credit is capped so at least 50 cents is still charged: a real Stripe subscription (with a card) is
--     always created, and a credit alone never turns into a free, card-less plan.
--   * It is a first-payment credit: Checkout applies it as a one-time Stripe coupon; renewals are full price.
--   * The purchases it is built from are marked used when the paid order applies (trigger below), even if the
--     cap meant only part of their value was needed. Each purchase can be credited once.
-- =====================================================================================================

alter table public.orders add column if not exists credit_cents integer not null default 0;
alter table public.orders add column if not exists credit_items uuid[];
comment on column public.orders.credit_cents is 'Purchase credit (recent one-off programs counted toward a plan) taken off this order, after any discount.';
comment on column public.orders.credit_items is 'order_items ids whose value was credited; marked used in plan_credit_uses when this order is paid.';

create table if not exists public.plan_credit_uses (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  used_by_order uuid not null references public.orders(id) on delete cascade,
  used_at timestamptz not null default now()
);
alter table public.plan_credit_uses enable row level security;
-- No member policies: written by the trigger below (security definer), read by server functions only.
drop policy if exists admin_all on public.plan_credit_uses;
create policy admin_all on public.plan_credit_uses for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Unused purchase credit toward a plan: {cents, items[]}.
create or replace function private.plan_credit(p_user uuid, p_plan text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with target as (select pl.rank from public.plans pl where pl.id = p_plan),
  eligible as (
    select distinct on (oi.ref_id) oi.id,
           least(oi.unit_cents * oi.quantity, greatest(o.total_cents - coalesce(o.shipping_cents, 0), 0)) as cents
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where p_user is not null
      and o.user_id = p_user and o.status = 'paid' and oi.kind = 'program'
      and o.created_at > now() - interval '30 days'
      and oi.ref_id ~ '^[0-9a-f-]{36}$'
      and not exists (select 1 from public.plan_credit_uses u where u.order_item_id = oi.id)
      and exists (select 1 from public.plan_program_benefits b join public.plans pl on pl.id = b.plan_id
                  where b.program_id = oi.ref_id::uuid and b.scope = 'content' and b.benefit = 'included'
                    and pl.rank <= (select t.rank from target t))
    order by oi.ref_id, o.created_at desc
  )
  select jsonb_build_object(
    'cents', coalesce(sum(e.cents) filter (where e.cents > 0), 0),
    'items', coalesce(jsonb_agg(e.id) filter (where e.cents > 0), '[]'::jsonb))
  from eligible e;
$$;
revoke all on function private.plan_credit(uuid, text) from public, anon, authenticated;

-- quote_for: unchanged except the credit block near the end and three new keys (credit_cents, credit_items;
-- amount_cents is now after the credit). Same signature, so public.quote and create_pending_order keep working.
create or replace function private.quote_for(p_user uuid, p_kind text, p_ref text, p_interval text default 'one_time'::text, p_coupon text default null::text)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_interval text := coalesce(nullif(p_interval, ''), 'one_time');
  v_plan_id text; v_rank int;
  v_ref text; v_name text; v_state text; v_reason text;
  v_program uuid; v_scope public.benefit_scope := 'content';
  v_price record; v_base int := 0; v_currency text := 'usd';
  v_benefit record; v_plan_disc int := 0; v_coupon record; v_coupon_disc int := 0; v_coupon_error text;
  v_disc int := 0; v_applied text; v_coupon_id uuid;
  v_credit int := 0; v_credit_items jsonb := '[]'::jsonb; v_credit_j jsonb;
  r record;
begin
  select null::uuid as id, null::int as amount_cents, null::text as currency, null::int as access_days, null::text as stripe_price_id
    into v_price;
  if p_kind = 'plan' then
    if v_interval not in ('month', 'year') then v_interval := 'month'; end if;
  else
    v_interval := 'one_time';
  end if;

  if p_user is not null then
    select mp.plan_id, mp.rank into v_plan_id, v_rank from private.member_plan(p_user) mp;
  end if;
  v_plan_id := coalesce(v_plan_id, 'free');
  v_rank := coalesce(v_rank, (select pl.rank from public.plans pl where pl.id = 'free'), 0);

  -- ---------- what is being bought, and does the member already have it
  if p_kind = 'program' then
    select p.id, p.name, p.is_free, p.status into r from public.programs p where p.id = private.resolve_program(p_ref);
    if r.id is null or r.status <> 'published' then
      v_state := 'unavailable'; v_reason := 'not_found';
    else
      v_ref := r.id::text; v_name := r.name; v_program := r.id;
      if r.is_free then v_state := 'free';
      elsif p_user is not null and private.has_role(p_user, 'admin') then v_state := 'owned';
      elsif p_user is not null and private.owns_program(p_user, r.id) then v_state := 'owned';
      elsif p_user is not null and private.has_access(p_user, r.id, 'content') then v_state := 'included';
      elsif not private.application_ok(p_user, r.id, null) then
        v_state := 'unavailable'; v_reason := 'application_required';
      end if;
    end if;

  elsif p_kind = 'bundle' then
    select b.id, b.name into r from public.bundles b where (b.id::text = p_ref or b.slug = p_ref) and b.is_active;
    if r.id is null then
      v_state := 'unavailable'; v_reason := 'not_found';
    else
      v_ref := r.id::text; v_name := r.name;
      if p_user is not null and exists (select 1 from public.bundle_items bi where bi.bundle_id = r.id)
         and not exists (select 1 from public.bundle_items bi where bi.bundle_id = r.id
                         and not private.has_access(p_user, bi.program_id, 'content')) then
        v_state := 'owned';
      end if;
    end if;

  elsif p_kind = 'run' then
    select pr.id, pr.name, pr.program_id, pr.status, pr.requires_application into r
      from public.program_runs pr where pr.id::text = p_ref;
    if r.id is null then
      v_state := 'unavailable'; v_reason := 'not_found';
    else
      v_ref := r.id::text; v_name := r.name; v_program := r.program_id; v_scope := 'retreat';
      if p_user is not null and exists (select 1 from public.run_applications a where a.run_id = r.id and a.user_id = p_user and a.status = 'booked') then
        v_state := 'owned';
      elsif r.status <> 'open' then
        v_state := 'unavailable'; v_reason := 'run_not_open';
      elsif r.requires_application and (p_user is null or not exists (
              select 1 from public.run_applications a where a.run_id = r.id and a.user_id = p_user and a.status = 'accepted')) then
        v_state := 'unavailable'; v_reason := 'application_required';
      end if;
    end if;

  elsif p_kind = 'coaching' then
    select c.id, c.name, c.program_id, c.requires_application into r
      from public.coaching_packages c where c.id::text = p_ref and c.is_active;
    if r.id is null then
      v_state := 'unavailable'; v_reason := 'not_found';
    else
      v_ref := r.id::text; v_name := r.name; v_program := r.program_id; v_scope := 'coaching';
      if not private.application_ok(p_user, r.program_id, case when r.requires_application then r.id end) then
        v_state := 'unavailable'; v_reason := 'application_required';
      end if;
    end if;

  elsif p_kind = 'plan' then
    select pl.id, pl.name, pl.rank into r from public.plans pl where pl.id = p_ref and pl.is_active;
    if r.id is null then
      v_state := 'unavailable'; v_reason := 'not_found';
    else
      v_ref := r.id; v_name := r.name;
      if r.rank <= coalesce((select pl.rank from public.plans pl where pl.id = 'free'), 0) then v_state := 'free';
      elsif p_user is not null and v_plan_id = r.id then v_state := 'owned';
      elsif p_user is not null and v_rank > r.rank then v_state := 'included';
      end if;
    end if;

  else
    v_state := 'unavailable'; v_reason := 'unknown_kind';
  end if;

  -- ---------- base price
  if v_ref is not null then
    select pr.id, pr.amount_cents, pr.currency, pr.access_days, pr.stripe_price_id into v_price
      from public.prices pr
      where pr.kind = p_kind and pr.ref_id = v_ref and pr.interval = v_interval and pr.is_active
      order by pr.amount_cents limit 1;
    v_base := coalesce(v_price.amount_cents, 0);
    v_currency := coalesce(v_price.currency, 'usd');
  end if;

  if v_state is null and v_price.id is null then
    v_state := 'unavailable'; v_reason := 'no_price';
  end if;

  -- ---------- plan benefit (programs, retreat places, coaching)
  if v_state is null and p_user is not null and v_program is not null then
    select b.benefit, b.discount_percent, b.plan_id into v_benefit
      from public.plan_program_benefits b join public.plans pl on pl.id = b.plan_id
      where b.program_id = v_program and b.scope = v_scope and pl.rank <= v_rank and b.benefit <> 'none'
      order by (b.benefit = 'included') desc, b.discount_percent desc nulls last, pl.rank desc
      limit 1;
    if v_benefit.benefit = 'included' and v_scope <> 'content' then
      v_state := 'included'; v_applied := v_benefit.plan_id || ':included';
    elsif v_benefit.benefit = 'discount' then
      v_plan_disc := round(v_base * v_benefit.discount_percent / 100.0)::int;
    elsif v_benefit.benefit = 'included' then
      -- a lower plan includes it but the member's own plan row is missing: never charge more than the lower plan
      v_plan_disc := v_base;
    end if;
  end if;

  -- ---------- referral welcome month: applied automatically to a monthly plan when no code was typed
  if v_state is null and p_user is not null and p_kind = 'plan' and v_interval = 'month'
     and nullif(trim(coalesce(p_coupon, '')), '') is null then
    select mc.coupon_code into p_coupon from public.member_credits mc join public.coupons c on c.id = mc.coupon_id
      where mc.user_id = p_user and mc.kind = 'free_month' and mc.redeemed_at is null and c.is_active
        and (c.expires_at is null or c.expires_at > now()) and (c.max_redemptions is null or c.redeemed < c.max_redemptions)
      order by mc.created_at limit 1;
  end if;

  -- ---------- coupon (never stacks with the plan discount: the larger one wins)
  if v_state is null and nullif(trim(coalesce(p_coupon, '')), '') is not null then
    select c.* into v_coupon from public.coupons c
      where upper(c.code) = upper(trim(p_coupon)) and c.is_active
        and (c.expires_at is null or c.expires_at > now())
        and (c.max_redemptions is null or c.redeemed < c.max_redemptions);
    if v_coupon.id is null then
      v_coupon_error := 'invalid_coupon';
    elsif v_coupon.applies_to->>'user_id' is not null and (p_user is null or v_coupon.applies_to->>'user_id' <> p_user::text) then
      v_coupon_error := 'coupon_not_applicable';
    elsif jsonb_array_length(coalesce(v_coupon.applies_to->'intervals', '[]'::jsonb)) > 0 and not (v_coupon.applies_to->'intervals') ? v_interval then
      v_coupon_error := 'coupon_not_applicable';
    elsif jsonb_array_length(coalesce(v_coupon.applies_to->'kinds', '[]'::jsonb)) > 0 and not (v_coupon.applies_to->'kinds') ? p_kind then
      v_coupon_error := 'coupon_not_applicable';
    elsif jsonb_array_length(coalesce(v_coupon.applies_to->'ref_ids', '[]'::jsonb)) > 0 and not (v_coupon.applies_to->'ref_ids') ? v_ref then
      v_coupon_error := 'coupon_not_applicable';
    else
      v_coupon_disc := least(v_base, coalesce(round(v_base * v_coupon.percent_off / 100.0)::int, v_coupon.amount_off_cents, 0));
    end if;
  end if;

  if v_state is null then
    v_state := 'purchasable';
    if v_coupon_disc > v_plan_disc then
      v_disc := v_coupon_disc; v_applied := 'coupon:' || v_coupon.code; v_coupon_id := v_coupon.id;
    elsif v_plan_disc > 0 then
      v_disc := v_plan_disc; v_applied := v_benefit.plan_id || ':' || v_benefit.benefit || coalesce(':' || v_benefit.discount_percent, '');
    end if;
  end if;

  -- ---------- 0041: purchase credit toward a plan (after the discount; first payment only; leaves >= 50 cents)
  if v_state = 'purchasable' and p_kind = 'plan' and p_user is not null
     and not exists (select 1 from public.subscriptions s
                     where s.user_id = p_user and s.provider = 'stripe' and s.provider_ref like 'sub\_%'
                       and s.status in ('trialing', 'active', 'past_due') and s.current_period_end > now()) then
    v_credit_j := private.plan_credit(p_user, v_ref);
    v_credit := least(coalesce((v_credit_j->>'cents')::int, 0), greatest(v_base - v_disc - 50, 0));
    if v_credit > 0 then v_credit_items := coalesce(v_credit_j->'items', '[]'::jsonb); else v_credit := 0; end if;
  end if;

  return jsonb_build_object(
    'kind', p_kind, 'ref', coalesce(v_ref, p_ref), 'name', v_name, 'interval', v_interval,
    'state', v_state, 'reason', v_reason,
    'currency', v_currency,
    'base_cents', v_base,
    'discount_cents', case when v_state = 'purchasable' then v_disc else 0 end,
    'credit_cents', case when v_state = 'purchasable' then v_credit else 0 end,
    'credit_items', case when v_state = 'purchasable' then v_credit_items else '[]'::jsonb end,
    'amount_cents', case when v_state = 'purchasable' then v_base - v_disc - v_credit else 0 end,
    'benefit_applied', v_applied,
    'coupon_id', v_coupon_id, 'coupon_error', v_coupon_error,
    'price_id', v_price.id, 'stripe_price_id', v_price.stripe_price_id, 'access_days', v_price.access_days,
    'member_plan', v_plan_id);
end $function$;

-- create_pending_order: unchanged except it stores the credit on the order (total is already after the credit).
create or replace function private.create_pending_order(p_user uuid, p_kind text, p_ref text, p_interval text default 'one_time'::text, p_coupon text default null::text, p_offer uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare v_q jsonb; v_order uuid; v_reference text;
begin
  if p_user is null then raise exception 'not signed in'; end if;
  v_q := private.quote_for(p_user, p_kind, p_ref, p_interval, p_coupon);
  if v_q->>'state' <> 'purchasable' then
    return jsonb_build_object('error', 'not_purchasable', 'quote', v_q);
  end if;
  insert into public.orders (user_id, status, subtotal_cents, discount_cents, total_cents, currency, coupon_id, offer_id, provider,
                             credit_cents, credit_items)
  values (p_user, 'pending', (v_q->>'base_cents')::int, (v_q->>'discount_cents')::int, (v_q->>'amount_cents')::int,
          v_q->>'currency', (v_q->>'coupon_id')::uuid,
          (select o.id from public.offers o where o.id = p_offer), 'stripe',
          coalesce((v_q->>'credit_cents')::int, 0),
          case when coalesce((v_q->>'credit_cents')::int, 0) > 0
               then array(select jsonb_array_elements_text(v_q->'credit_items')::uuid) end)
  returning id, reference into v_order, v_reference;
  insert into public.order_items (order_id, price_id, kind, ref_id, name, quantity, unit_cents, benefit_applied)
  values (v_order, (v_q->>'price_id')::uuid, p_kind, v_q->>'ref', coalesce(v_q->>'name', p_kind), 1,
          (v_q->>'base_cents')::int, v_q->>'benefit_applied');
  if (v_q->>'amount_cents')::int = 0 then
    perform private.apply_paid_order(v_order, 'free');
    return jsonb_build_object('order_id', v_order, 'reference', v_reference, 'quote', v_q, 'paid', true);
  end if;
  return jsonb_build_object('order_id', v_order, 'reference', v_reference, 'quote', v_q, 'paid', false);
end $function$;

-- Mark the credited purchases used once, when the order that took the credit is paid (apply_paid_order sets
-- status = 'paid'; this keeps apply_paid_order itself untouched).
create or replace function private.orders_use_plan_credit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' and coalesce(new.credit_cents, 0) > 0 and new.credit_items is not null then
    insert into public.plan_credit_uses (order_item_id, used_by_order)
    select i, new.id from unnest(new.credit_items) as i
    where exists (select 1 from public.order_items oi where oi.id = i)
    on conflict (order_item_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists orders_use_plan_credit on public.orders;
create trigger orders_use_plan_credit after update of status on public.orders
  for each row execute function private.orders_use_plan_credit();

-- my_plan_savings: same shape; each plan's credit_cents is now the credit the checkout will really apply
-- (unused purchases only, none while a card-billed plan is live; same rule as quote_for before the 50-cent cap).
create or replace function public.my_plan_savings()
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare v_user uuid := (select auth.uid()); v_plan text; v_rank int; res jsonb;
begin
  if v_user is null then return null; end if;
  select mp.plan_id, mp.rank into v_plan, v_rank from private.member_plan(v_user) mp;
  v_plan := coalesce(v_plan, 'free'); v_rank := coalesce(v_rank, 0);

  with bought as (
    select oi.ref_id::uuid as program_id, max(oi.unit_cents * oi.quantity) as paid_cents, max(o.created_at) as paid_at
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where o.user_id = v_user and o.status = 'paid' and oi.kind = 'program' and oi.ref_id ~ '^[0-9a-f-]{36}$'
    group by 1
  ), owned as (
    select distinct g.program_id from public.access_grants g
    where g.user_id = v_user and g.scope = 'content' and g.source in ('purchase', 'migration', 'admin', 'reward')
      and g.revoked_at is null and (g.ends_at is null or g.ends_at > now())
  ), list_price as (
    select pr.ref_id::uuid as program_id, min(pr.amount_cents) as cents from public.prices pr
    where pr.kind = 'program' and pr.is_active and pr.interval = 'one_time' and pr.ref_id ~ '^[0-9a-f-]{36}$' group by 1
  )
  select jsonb_build_object(
    'plan', (select jsonb_build_object('id', pl.id, 'name', pl.name, 'rank', pl.rank) from public.plans pl where pl.id = v_plan),
    'owned', coalesce((select jsonb_agg(jsonb_build_object('program_id', p.id, 'slug', p.slug, 'name', p.name,
                 'paid_cents', b.paid_cents, 'paid_at', b.paid_at, 'list_cents', lp.cents) order by p.position)
               from public.programs p join (select program_id from owned union select program_id from bought) x on x.program_id = p.id
               left join bought b on b.program_id = p.id left join list_price lp on lp.program_id = p.id
               where p.status = 'published' and not p.is_free), '[]'),
    'plans', coalesce((select jsonb_agg(jsonb_build_object(
                 'id', pl.id, 'name', pl.name, 'rank', pl.rank, 'tagline', pl.tagline, 'current', pl.id = v_plan,
                 'month_cents', (select min(pr.amount_cents) from public.prices pr where pr.kind = 'plan' and pr.ref_id = pl.id and pr.is_active and pr.interval = 'month'),
                 'year_cents', (select min(pr.amount_cents) from public.prices pr where pr.kind = 'plan' and pr.ref_id = pl.id and pr.is_active and pr.interval = 'year'),
                 'includes', coalesce((select jsonb_agg(jsonb_build_object('program_id', p.id, 'slug', p.slug, 'name', p.name, 'list_cents', lp.cents,
                                  'owned', exists (select 1 from owned o where o.program_id = p.id) or exists (select 1 from bought bb where bb.program_id = p.id)) order by p.position)
                               from public.plan_program_benefits b join public.programs p on p.id = b.program_id and p.status = 'published' and not p.is_free
                               left join list_price lp on lp.program_id = p.id
                               where b.plan_id = pl.id and b.scope = 'content' and b.benefit = 'included'), '[]'),
                 'discounts', coalesce((select jsonb_agg(jsonb_build_object('slug', p.slug, 'name', p.name, 'percent', b.discount_percent))
                               from public.plan_program_benefits b join public.programs p on p.id = b.program_id and p.status = 'published'
                               where b.plan_id = pl.id and b.scope = 'content' and b.benefit = 'discount'), '[]'),
                 'credit_cents', case when exists (select 1 from public.subscriptions s
                                                   where s.user_id = v_user and s.provider = 'stripe' and s.provider_ref like 'sub\_%'
                                                     and s.status in ('trialing', 'active', 'past_due') and s.current_period_end > now())
                                      then 0 else coalesce((private.plan_credit(v_user, pl.id)->>'cents')::int, 0) end
               ) order by pl.rank) from public.plans pl where pl.is_active and pl.rank > 0), '[]')
  ) into res;
  return res;
end $function$;
