-- Mike Salemi App v2 — commerce, smart offers, rewards, referrals (server functions).
-- Prices are computed here, never in the browser. Only server code (these functions, or the Stripe
-- webhook through the service role) writes orders, order_items, subscriptions, access_grants,
-- coaching_credits, points_ledger, member_badges and referrals.
--
-- Member-callable:  quote, get_offer, log_offer_event, my_rewards, claim_referral
-- Service role only: create_pending_order, apply_paid_order, refund_order (public wrappers so the
--                    webhook can reach them through the API; the logic lives in private.*)

-- ---------------------------------------------------------------- billing customers (Stripe customer per member)
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  customer_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
revoke all on public.billing_customers from anon, authenticated;
create policy admin_all on public.billing_customers for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- one grant per source row (makes apply_paid_order safe to repeat)
create index if not exists access_grants_source_idx on public.access_grants (source_ref) where source_ref is not null;
create index if not exists coaching_credits_source_idx on public.coaching_credits (source_ref) where source_ref is not null;
create index if not exists subscriptions_provider_ref_idx on public.subscriptions (provider, provider_ref);
create index if not exists points_ledger_reason_idx on public.points_ledger (user_id, reason);

-- ---------------------------------------------------------------- small helpers
-- A program by uuid text or slug.
create or replace function private.resolve_program(p_ref text)
returns uuid language sql stable security definer set search_path = '' as $$
  select p.id from public.programs p where p.id::text = p_ref or p.slug = p_ref limit 1;
$$;

-- A program path by uuid text or key.
create or replace function private.resolve_path(p_ref text)
returns uuid language sql stable security definer set search_path = '' as $$
  select pp.id from public.program_paths pp where pp.id::text = p_ref or pp.key = p_ref limit 1;
$$;

-- The member's best plan right now: personal subscription (still inside its period) or organization seat.
-- No row = free.
create or replace function private.member_plan(p_user uuid)
returns table (plan_id text, rank int, source text)
language sql stable security definer set search_path = '' as $$
  select x.plan_id, x.rank, x.source from (
    select s.plan_id, pl.rank, 'subscription'::text as source
    from public.subscriptions s join public.plans pl on pl.id = s.plan_id
    where s.user_id = p_user and s.status in ('trialing', 'active', 'past_due', 'cancelled') and s.current_period_end > now()
    union all
    select o.plan_id, pl.rank, 'organization'::text
    from public.org_members m
    join public.organizations o on o.id = m.org_id
    join public.plans pl on pl.id = o.plan_id
    where m.user_id = p_user and m.status = 'active'
      and (o.status = 'active' or (o.status = 'past_due' and o.grace_until > now()))
  ) x
  order by x.rank desc
  limit 1;
$$;

-- An active grant that came from buying/being given the program (not a plan or an org seat).
create or replace function private.owns_program(p_user uuid, p_program uuid, p_scope public.benefit_scope default 'content')
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.access_grants g
    where g.user_id = p_user and g.program_id = p_program and g.scope = p_scope and g.source <> 'organization'
      and g.revoked_at is null and g.starts_at <= now() and (g.ends_at is null or g.ends_at > now()));
$$;

-- ---------------------------------------------------------------- quote
-- What a member pays for one thing. Rules: free / owned / included pay nothing; otherwise the best
-- eligible price: the larger of the plan discount (best benefit among plans ranked at or below the
-- member's plan, so a higher plan is never worse) and the coupon. Discounts never stack.
-- kind: plan (ref = plan id, interval month|year) | program (uuid or slug) | bundle (uuid or slug)
--       | run (program_runs uuid) | coaching (coaching_packages uuid)
create or replace function private.quote_for(p_user uuid, p_kind text, p_ref text, p_interval text default 'one_time', p_coupon text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_interval text := coalesce(nullif(p_interval, ''), 'one_time');
  v_plan_id text; v_rank int;
  v_ref text; v_name text; v_state text; v_reason text;
  v_program uuid; v_scope public.benefit_scope := 'content';
  v_price record; v_base int := 0; v_currency text := 'usd';
  v_benefit record; v_plan_disc int := 0; v_coupon record; v_coupon_disc int := 0; v_coupon_error text;
  v_disc int := 0; v_applied text; v_coupon_id uuid;
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

  -- ---------- coupon (never stacks with the plan discount: the larger one wins)
  if v_state is null and nullif(trim(coalesce(p_coupon, '')), '') is not null then
    select c.* into v_coupon from public.coupons c
      where upper(c.code) = upper(trim(p_coupon)) and c.is_active
        and (c.expires_at is null or c.expires_at > now())
        and (c.max_redemptions is null or c.redeemed < c.max_redemptions);
    if v_coupon.id is null then
      v_coupon_error := 'invalid_coupon';
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

  return jsonb_build_object(
    'kind', p_kind, 'ref', coalesce(v_ref, p_ref), 'name', v_name, 'interval', v_interval,
    'state', v_state, 'reason', v_reason,
    'currency', v_currency,
    'base_cents', v_base,
    'discount_cents', case when v_state = 'purchasable' then v_disc else 0 end,
    'amount_cents', case when v_state = 'purchasable' then v_base - v_disc else 0 end,
    'benefit_applied', v_applied,
    'coupon_id', v_coupon_id, 'coupon_error', v_coupon_error,
    'price_id', v_price.id, 'stripe_price_id', v_price.stripe_price_id, 'access_days', v_price.access_days,
    'member_plan', v_plan_id);
end $$;

create or replace function public.quote(p_kind text, p_ref text, p_interval text default 'one_time', p_coupon text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.quote_for((select auth.uid()), p_kind, p_ref, p_interval, p_coupon);
$$;

-- ---------------------------------------------------------------- orders
-- Called by the checkout route (service role) after it has verified the user. Quotes on the server,
-- creates a pending order + item. A zero total (100% coupon) is applied immediately.
create or replace function private.create_pending_order(p_user uuid, p_kind text, p_ref text, p_interval text default 'one_time',
                                                        p_coupon text default null, p_offer uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_q jsonb; v_order uuid; v_reference text;
begin
  if p_user is null then raise exception 'not signed in'; end if;
  v_q := private.quote_for(p_user, p_kind, p_ref, p_interval, p_coupon);
  if v_q->>'state' <> 'purchasable' then
    return jsonb_build_object('error', 'not_purchasable', 'quote', v_q);
  end if;
  insert into public.orders (user_id, status, subtotal_cents, discount_cents, total_cents, currency, coupon_id, offer_id, provider)
  values (p_user, 'pending', (v_q->>'base_cents')::int, (v_q->>'discount_cents')::int, (v_q->>'amount_cents')::int,
          v_q->>'currency', (v_q->>'coupon_id')::uuid,
          (select o.id from public.offers o where o.id = p_offer), 'stripe')
  returning id, reference into v_order, v_reference;
  insert into public.order_items (order_id, price_id, kind, ref_id, name, quantity, unit_cents, benefit_applied)
  values (v_order, (v_q->>'price_id')::uuid, p_kind, v_q->>'ref', coalesce(v_q->>'name', p_kind), 1,
          (v_q->>'base_cents')::int, v_q->>'benefit_applied');
  if (v_q->>'amount_cents')::int = 0 then
    perform private.apply_paid_order(v_order, 'free');
    return jsonb_build_object('order_id', v_order, 'reference', v_reference, 'quote', v_q, 'paid', true);
  end if;
  return jsonb_build_object('order_id', v_order, 'reference', v_reference, 'quote', v_q, 'paid', false);
end $$;

-- Idempotent grant: one live grant per (user, program, scope, source, source_ref).
create or replace function private.grant_access(p_user uuid, p_program uuid, p_scope public.benefit_scope, p_source public.grant_source,
                                                p_source_ref text, p_ends_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select g.id into v_id from public.access_grants g
    where g.user_id = p_user and g.program_id = p_program and g.scope = p_scope and g.source = p_source
      and g.source_ref is not distinct from p_source_ref and g.revoked_at is null
    limit 1;
  if v_id is null then
    insert into public.access_grants (user_id, program_id, scope, source, source_ref, ends_at)
    values (p_user, p_program, p_scope, p_source, p_source_ref, p_ends_at)
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- A program purchase/booking also grants the programs it includes (retreat -> preparation course).
create or replace function private.grant_with_inclusions(p_user uuid, p_program uuid, p_scope public.benefit_scope,
                                                         p_source_ref text, p_ends_at timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
declare i record;
begin
  perform private.grant_access(p_user, p_program, p_scope, 'purchase', p_source_ref, p_ends_at);
  for i in select pi.included_program_id, pi.access_days from public.program_inclusions pi where pi.parent_program_id = p_program loop
    perform private.grant_access(p_user, i.included_program_id, 'content', 'inclusion', p_source_ref,
      case when i.access_days is not null then now() + make_interval(days => i.access_days) end);
  end loop;
end $$;

-- 30 days of Pro for a referrer: extend an existing admin Pro subscription or start one.
create or replace function private.reward_referrer(p_referrer uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_sub uuid;
begin
  if not exists (select 1 from public.plans where id = 'pro') then return; end if;
  select s.id into v_sub from public.subscriptions s
    where s.user_id = p_referrer and s.plan_id = 'pro' and s.provider = 'admin' and s.status in ('active', 'trialing')
    order by s.current_period_end desc limit 1;
  if v_sub is not null then
    update public.subscriptions set current_period_end = greatest(current_period_end, now()) + interval '30 days', updated_at = now()
      where id = v_sub;
  else
    insert into public.subscriptions (user_id, plan_id, status, interval, current_period_end, provider, provider_ref)
    values (p_referrer, 'pro', 'active', 'month', now() + interval '30 days', 'admin', 'referral');
  end if;
end $$;

-- Marks an order paid and delivers everything in it. Safe to call any number of times.
-- p_subscription (plans): Stripe subscription {id, status, current_period_end (unix), cancel_at_period_end}.
create or replace function private.apply_paid_order(p_order uuid, p_payment_ref text default null, p_subscription jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_o record; it record; v_ends timestamptz; v_days int; v_run record; v_pkg record; v_interval text; v_period_end timestamptz;
  v_sub_ref text; v_sub_id uuid; v_ref record;
begin
  select * into v_o from public.orders where id = p_order for update;
  if v_o.id is null then raise exception 'order not found'; end if;
  if v_o.status = 'paid' then return jsonb_build_object('order_id', p_order, 'already_paid', true); end if;
  if v_o.status <> 'pending' then raise exception 'order is %', v_o.status; end if;
  if v_o.user_id is null then raise exception 'order has no member'; end if;

  update public.orders set status = 'paid', provider_ref = coalesce(p_payment_ref, provider_ref) where id = p_order;

  for it in select * from public.order_items where order_id = p_order loop
    v_days := null;
    if it.price_id is not null then select pr.access_days into v_days from public.prices pr where pr.id = it.price_id; end if;
    v_ends := case when v_days is not null then now() + make_interval(days => v_days) end;

    if it.kind = 'program' then
      perform private.grant_with_inclusions(v_o.user_id, it.ref_id::uuid, 'content', p_order::text, v_ends);

    elsif it.kind = 'bundle' then
      for v_ref in select bi.program_id from public.bundle_items bi where bi.bundle_id = it.ref_id::uuid loop
        perform private.grant_with_inclusions(v_o.user_id, v_ref.program_id, 'content', p_order::text, v_ends);
      end loop;

    elsif it.kind = 'run' then
      select pr.id, pr.program_id into v_run from public.program_runs pr where pr.id = it.ref_id::uuid;
      perform private.grant_with_inclusions(v_o.user_id, v_run.program_id, 'retreat', p_order::text, null);
      insert into public.run_applications (run_id, user_id, status, order_id)
        values (v_run.id, v_o.user_id, 'booked', p_order)
        on conflict (run_id, user_id) do update set status = 'booked', order_id = excluded.order_id, updated_at = now();

    elsif it.kind = 'coaching' then
      select c.id, c.sessions into v_pkg from public.coaching_packages c where c.id = it.ref_id::uuid;
      if not exists (select 1 from public.coaching_credits cc where cc.source_ref = p_order::text and cc.package_id = v_pkg.id) then
        insert into public.coaching_credits (user_id, package_id, total, source, source_ref, expires_at)
        values (v_o.user_id, v_pkg.id, coalesce(v_pkg.sessions, 1) * it.quantity, 'purchase', p_order::text, v_ends);
      end if;

    elsif it.kind = 'plan' then
      select pr.interval into v_interval from public.prices pr where pr.id = it.price_id;
      v_interval := case when v_interval in ('month', 'year') then v_interval else 'month' end;
      v_period_end := coalesce(to_timestamp((p_subscription->>'current_period_end')::double precision),
                               now() + case when v_interval = 'year' then interval '1 year' else interval '1 month' end);
      v_sub_ref := coalesce(p_subscription->>'id', 'order:' || p_order::text);
      select s.id into v_sub_id from public.subscriptions s where s.provider = 'stripe' and s.provider_ref = v_sub_ref;
      if v_sub_id is null then
        insert into public.subscriptions (user_id, plan_id, status, interval, current_period_end, cancel_at_period_end, provider, provider_ref)
        values (v_o.user_id, it.ref_id, coalesce(p_subscription->>'status', 'active'), v_interval, v_period_end,
                coalesce((p_subscription->>'cancel_at_period_end')::boolean, false), 'stripe', v_sub_ref);
      else
        update public.subscriptions set plan_id = it.ref_id, status = coalesce(p_subscription->>'status', status),
          current_period_end = v_period_end, updated_at = now() where id = v_sub_id;
      end if;
    end if;
  end loop;

  if v_o.coupon_id is not null then
    update public.coupons set redeemed = redeemed + 1 where id = v_o.coupon_id;
  end if;
  if v_o.offer_id is not null then
    insert into public.offer_events (offer_id, user_id, placement, event) values (v_o.offer_id, v_o.user_id, 'checkout', 'convert');
  end if;

  -- referral: the referred member's first paid order rewards the referrer (30 days of Pro + 500 points)
  if v_o.total_cents > 0 then
    select rf.* into v_ref from public.referrals rf where rf.referred_id = v_o.user_id and rf.status = 'signed_up' for update;
    if v_ref.id is not null then
      update public.referrals set status = 'rewarded', paid_at = now() where id = v_ref.id;
      perform private.reward_referrer(v_ref.referrer_id);
      perform private.award_points(v_ref.referrer_id, 500, 'referral', v_ref.id::text);
    end if;
  end if;

  return jsonb_build_object('order_id', p_order, 'applied', true);
end $$;

-- Refund: order refunded, purchase grants and credits from it revoked, retreat booking cancelled.
create or replace function private.refund_order(p_order uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  update public.orders set status = 'refunded' where id = p_order and status in ('paid', 'pending');
  update public.access_grants set revoked_at = now()
    where source_ref = p_order::text and source in ('purchase', 'inclusion') and revoked_at is null;
  get diagnostics v_n = row_count;
  update public.coaching_credits set expires_at = now() where source_ref = p_order::text and (expires_at is null or expires_at > now());
  update public.run_applications set status = 'cancelled', updated_at = now() where order_id = p_order and status = 'booked';
  return jsonb_build_object('order_id', p_order, 'revoked_grants', v_n);
end $$;

-- Service-role entry points (the API only exposes the public schema).
create or replace function public.create_pending_order(p_user uuid, p_kind text, p_ref text, p_interval text default 'one_time',
                                                       p_coupon text default null, p_offer uuid default null)
returns jsonb language sql security definer set search_path = '' as $$
  select private.create_pending_order(p_user, p_kind, p_ref, p_interval, p_coupon, p_offer);
$$;
create or replace function public.apply_paid_order(p_order uuid, p_payment_ref text default null, p_subscription jsonb default null)
returns jsonb language sql security definer set search_path = '' as $$
  select private.apply_paid_order(p_order, p_payment_ref, p_subscription);
$$;
create or replace function public.refund_order(p_order uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select private.refund_order(p_order);
$$;

-- ---------------------------------------------------------------- smart offers
-- Audience keys (all optional, all must hold):
--   has_program:[uuid|slug]   member can open every one     lacks_program:[uuid|slug]  member can open none
--   lacks_path:[uuid|key]     not enrolled in and no certificate for any of these paths
--   plans:['free','pro',...]  member's current plan is one of these
--   goals:['strength',...]    member has an active goal of one of these kinds
--   org_member:true|false     signed_out:true (only signed-out visitors; otherwise offers are for members)
create or replace function private.offer_audience_ok(p_user uuid, p_plan text, a jsonb)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare x text;
begin
  a := coalesce(a, '{}'::jsonb);
  if coalesce((a->>'signed_out')::boolean, false) then return p_user is null; end if;
  if p_user is null then return false; end if;
  for x in select jsonb_array_elements_text(coalesce(a->'has_program', '[]')) loop
    if not coalesce(private.has_access(p_user, private.resolve_program(x), 'content'), false) then return false; end if;
  end loop;
  for x in select jsonb_array_elements_text(coalesce(a->'lacks_program', '[]')) loop
    if coalesce(private.has_access(p_user, private.resolve_program(x), 'content'), false) then return false; end if;
  end loop;
  for x in select jsonb_array_elements_text(coalesce(a->'lacks_path', '[]')) loop
    if exists (select 1 from public.enrollments e where e.user_id = p_user and e.path_id = private.resolve_path(x))
       or exists (select 1 from public.certificates c where c.user_id = p_user and c.path_id = private.resolve_path(x)) then
      return false;
    end if;
  end loop;
  if jsonb_array_length(coalesce(a->'plans', '[]')) > 0 and not (a->'plans') ? p_plan then return false; end if;
  if jsonb_array_length(coalesce(a->'goals', '[]')) > 0 and not exists (
       select 1 from public.goals g where g.user_id = p_user and g.status = 'active' and (a->'goals') ? g.kind) then
    return false;
  end if;
  if a ? 'org_member' and (a->>'org_member')::boolean <> exists (
       select 1 from public.org_members m where m.user_id = p_user and m.status = 'active') then
    return false;
  end if;
  return true;
end $$;

-- Has the member completed a program / path / phase (from certificates and section points)?
create or replace function private.has_completed(p_user uuid, p_scope text, p_program uuid, p_path uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_user is null then false
    when p_scope = 'path' then exists (
      select 1 from public.certificates c where c.user_id = p_user
        and (p_program is null or c.program_id = p_program) and (p_path is null or c.path_id = p_path))
    when p_scope = 'program' and p_program is not null then
      case when exists (select 1 from public.program_paths pp where pp.program_id = p_program and pp.kind = 'level')
        then not exists (select 1 from public.program_paths pp where pp.program_id = p_program and pp.kind = 'level'
                         and not exists (select 1 from public.certificates c where c.user_id = p_user and c.path_id = pp.id))
        else exists (select 1 from public.certificates c where c.user_id = p_user and c.program_id = p_program)
      end
    when p_scope = 'program' then exists (select 1 from public.certificates c where c.user_id = p_user)
    when p_scope in ('phase', 'section') then exists (
      select 1 from public.points_ledger pl join public.sections s on s.id::text = split_part(pl.ref, ':', 1)
      where pl.user_id = p_user and pl.reason = 'section'
        and (p_program is null or s.program_id = p_program) and (p_path is null or s.path_id = p_path))
    else false
  end;
$$;

-- Trigger kinds (offers.trigger):
--   {kind:'always'}
--   {kind:'completed', scope:'phase'|'path'|'program', program_id?, path_id?}   ids may be slugs/keys.
--       Matches the context {completed, program_id, path_id} (completion screens) or the member's state.
--   {kind:'tool_result', tool_id, result?}   context {tool_id, result} or a saved tool_results row
--   {kind:'run_booked', program_id?}         a booked, not yet finished retreat/run
--   {kind:'run_upcoming', program_id?, days} a booked run starting within `days`
--   {kind:'inactive_days', days}             no completed step for `days`
--   {kind:'intake_answer', key, value}       latest intake response answer
--   anything else (e.g. watched_topic) never matches yet.
create or replace function private.offer_trigger_ok(p_user uuid, t jsonb, ctx jsonb)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_kind text := coalesce(t->>'kind', 'always'); v_prog uuid; v_path uuid; v_scope text;
begin
  ctx := coalesce(ctx, '{}'::jsonb);
  if v_kind = 'always' then return true; end if;

  if v_kind = 'completed' then
    v_scope := case when t->>'scope' = 'section' then 'phase' else coalesce(t->>'scope', 'program') end;
    v_prog := private.resolve_program(t->>'program_id');
    v_path := private.resolve_path(t->>'path_id');
    if (t->>'program_id' is not null and v_prog is null) or (t->>'path_id' is not null and v_path is null) then return false; end if;
    if ctx ? 'completed'
       and (case when ctx->>'completed' = 'section' then 'phase' else ctx->>'completed' end) = v_scope
       and (v_prog is null or private.resolve_program(ctx->>'program_id') = v_prog)
       and (v_path is null or private.resolve_path(ctx->>'path_id') = v_path) then
      return true;
    end if;
    return private.has_completed(p_user, v_scope, v_prog, v_path);
  end if;

  if v_kind = 'tool_result' then
    if ctx->>'tool_id' = t->>'tool_id' and (t->>'result' is null or ctx->>'result' = t->>'result') then return true; end if;
    return p_user is not null and exists (
      select 1 from public.tool_results tr where tr.user_id = p_user and tr.tool_id = t->>'tool_id'
        and (t->>'result' is null or tr.result->>'result' = t->>'result' or tr.result->>'key' = t->>'result'));
  end if;

  if v_kind in ('run_booked', 'run_upcoming') then
    v_prog := private.resolve_program(t->>'program_id');
    return p_user is not null and exists (
      select 1 from public.run_applications a join public.program_runs r on r.id = a.run_id
      where a.user_id = p_user and a.status = 'booked'
        and (t->>'program_id' is null or r.program_id = v_prog)
        and coalesce(r.ends_at, r.starts_at) > now()
        and (v_kind = 'run_booked' or r.starts_at <= now() + make_interval(days => coalesce((t->>'days')::int, 30))));
  end if;

  if v_kind = 'inactive_days' then
    return p_user is not null and coalesce(
      (select max(sp.completed_at) from public.step_progress sp where sp.user_id = p_user),
      (select p.created_at from public.profiles p where p.id = p_user)) < now() - make_interval(days => coalesce((t->>'days')::int, 7));
  end if;

  if v_kind = 'intake_answer' then
    return p_user is not null and (
      select ir.answers->>(t->>'key') from public.intake_responses ir
      where ir.user_id = p_user order by ir.created_at desc limit 1) = t->>'value';
  end if;

  return false;
end $$;

-- Is the offer's target something the member does not have yet?
create or replace function private.offer_target_open(p_user uuid, p_rank int, p_kind text, p_ref text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user is null then return true; end if;
  if p_kind = 'program' then
    return not coalesce(private.has_access(p_user, private.resolve_program(p_ref), 'content'), false);
  elsif p_kind = 'plan' then
    return p_rank < coalesce((select pl.rank from public.plans pl where pl.id = p_ref), 0);
  elsif p_kind = 'bundle' then
    return exists (select 1 from public.bundle_items bi join public.bundles b on b.id = bi.bundle_id
                   where (b.id::text = p_ref or b.slug = p_ref) and not private.has_access(p_user, bi.program_id, 'content'));
  elsif p_kind = 'run' then
    return not exists (select 1 from public.run_applications a where a.user_id = p_user and a.run_id::text = p_ref and a.status = 'booked');
  end if;
  return true;
end $$;

-- The single best offer for this placement and context, or null.
-- Caps: hidden after `max_views` views, for `cooldown_days` after a dismiss, and for good after a convert.
create or replace function public.get_offer(p_placement text, p_context jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_plan text; v_rank int; o record;
begin
  if v_user is not null then select mp.plan_id, mp.rank into v_plan, v_rank from private.member_plan(v_user) mp; end if;
  v_plan := coalesce(v_plan, 'free');
  v_rank := coalesce(v_rank, (select pl.rank from public.plans pl where pl.id = 'free'), 0);

  for o in
    select f.* from public.offers f
    where f.is_active and p_placement = any (f.placements)
      and (f.starts_at is null or f.starts_at <= now()) and (f.ends_at is null or f.ends_at > now())
    order by f.priority, f.created_at
  loop
    if v_user is not null then
      continue when exists (select 1 from public.offer_events e where e.user_id = v_user and e.offer_id = o.id and e.event = 'convert');
      continue when exists (select 1 from public.offer_events e where e.user_id = v_user and e.offer_id = o.id and e.event = 'dismiss'
                              and e.created_at > now() - make_interval(days => o.cooldown_days));
      continue when (select count(*) from public.offer_events e where e.user_id = v_user and e.offer_id = o.id and e.event = 'view') >= o.max_views;
    end if;
    continue when not private.offer_audience_ok(v_user, v_plan, o.audience);
    continue when not private.offer_trigger_ok(v_user, o.trigger, p_context);
    continue when not private.offer_target_open(v_user, v_rank, o.target_kind, o.target_ref);

    return jsonb_build_object(
      'id', o.id, 'placement', p_placement, 'headline', o.headline, 'body', o.body, 'cta_label', o.cta_label,
      'image_url', o.image_url, 'target_kind', o.target_kind, 'target_ref', o.target_ref, 'priority', o.priority,
      'coupon_code', (select c.code from public.coupons c where c.id = o.coupon_id and c.is_active),
      'target', case
        when o.target_kind = 'program' then (select jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name)
                                              from public.programs p where p.id = private.resolve_program(o.target_ref))
        when o.target_kind = 'plan' then (select jsonb_build_object('id', pl.id, 'name', pl.name) from public.plans pl where pl.id = o.target_ref)
        when o.target_kind = 'coaching' then (select jsonb_build_object('id', c.id, 'name', c.name) from public.coaching_packages c where c.id::text = o.target_ref)
        when o.target_kind = 'url' then jsonb_build_object('url', o.target_ref)
      end);
  end loop;
  return null;
end $$;

-- view | click | dismiss (convert is recorded by the server when an order is paid). One view per offer per day counts.
create or replace function public.log_offer_event(p_offer uuid, p_placement text, p_event text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if p_event not in ('view', 'click', 'dismiss') then raise exception 'invalid offer event'; end if;
  if not exists (select 1 from public.offers where id = p_offer) then raise exception 'offer not found'; end if;
  if p_event = 'view' and v_user is not null and exists (
       select 1 from public.offer_events e where e.user_id = v_user and e.offer_id = p_offer and e.event = 'view'
         and e.created_at > now() - interval '1 day') then
    return;
  end if;
  insert into public.offer_events (offer_id, user_id, placement, event) values (p_offer, v_user, left(coalesce(p_placement, ''), 40), p_event);
end $$;

-- ---------------------------------------------------------------- rewards
-- Streaks: consecutive calendar days (member's timezone) with at least one completed step.
-- current = the run ending today or yesterday.
create or replace function private.streaks(p_user uuid)
returns table (current_days int, best_days int)
language sql stable security definer set search_path = '' as $$
  with tz as (
    select coalesce((select p.timezone from public.profiles p where p.id = p_user
                     and exists (select 1 from pg_catalog.pg_timezone_names n where n.name = p.timezone)), 'UTC') as name),
  d as (select distinct (sp.completed_at at time zone (select name from tz))::date as day
        from public.step_progress sp where sp.user_id = p_user),
  g as (select day, day - (row_number() over (order by day))::int as grp from d),
  runs as (select max(day) as last_day, count(*)::int as n from g group by grp)
  select
    coalesce((select r.n from runs r where r.last_day >= (now() at time zone (select name from tz))::date - 1
              order by r.last_day desc limit 1), 0),
    coalesce((select max(r.n) from runs r), 0);
$$;

-- Badge rule kinds (badges.rule):
--   {kind:'days', count, program?}         completed training days (lessons without page_type), optional program uuid/slug
--   {kind:'streak', days}                  best streak of consecutive active days reaches `days`
--   {kind:'section'|'phase', count?, program?, key?|phase?, title?}
--                                          phases completed (default 1); key/phase = sections.key (exact, or '<prefix>-<key>'),
--                                          title = case-insensitive substring of the section title
--   {kind:'path'|'level', count?, program?, key?|path?}  levels/paths completed; key/path = program_paths.key
--   {kind:'tool'|'tools', count?} | {kind:'tools', all:true}  distinct tools with a saved result
--   {kind:'referral', count}               referred members who paid
--   {kind:'points', total}                 lifetime points
-- Newly earned badges add badges.points to the ledger (reason 'badge', ref = badge id).
create or replace function private.evaluate_badges(p_user uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  b record; v_ok boolean; v_kind text; v_n int; v_prog uuid; v_new text[] := '{}';
  v_streak_best int; v_tools int; v_tools_all int;
begin
  if p_user is null then return v_new; end if;
  for b in select * from public.badges bd
           where not exists (select 1 from public.member_badges mb where mb.user_id = p_user and mb.badge_id = bd.id)
           order by bd.position
  loop
    v_kind := b.rule->>'kind';
    v_prog := private.resolve_program(coalesce(b.rule->>'program', b.rule->>'program_id'));
    v_ok := false;

    if v_kind = 'days' then
      select count(distinct l.id) into v_n from public.points_ledger pl
        join public.lessons l on l.id::text = split_part(pl.ref, ':', 1)
        where pl.user_id = p_user and pl.reason = 'lesson' and l.page_type is null and (v_prog is null or l.program_id = v_prog);
      v_ok := v_n >= coalesce((b.rule->>'count')::int, 1);

    elsif v_kind = 'streak' then
      if v_streak_best is null then select s.best_days into v_streak_best from private.streaks(p_user) s; end if;
      v_ok := v_streak_best >= coalesce((b.rule->>'days')::int, (b.rule->>'count')::int, 1);

    elsif v_kind in ('section', 'phase') then
      select count(distinct s.id) into v_n from public.points_ledger pl
        join public.sections s on s.id::text = split_part(pl.ref, ':', 1)
        where pl.user_id = p_user and pl.reason = 'section' and (v_prog is null or s.program_id = v_prog)
          and (coalesce(b.rule->>'key', b.rule->>'phase') is null or s.key = coalesce(b.rule->>'key', b.rule->>'phase')
               or s.key like '%-' || coalesce(b.rule->>'key', b.rule->>'phase'))
          and (b.rule->>'title' is null or s.title ilike '%' || (b.rule->>'title') || '%');
      v_ok := v_n >= coalesce((b.rule->>'count')::int, 1);

    elsif v_kind in ('path', 'level') then
      select count(distinct split_part(pl.ref, ':', 1)) into v_n from public.points_ledger pl
        left join public.program_paths pp on pp.id::text = split_part(pl.ref, ':', 1)
        where pl.user_id = p_user and pl.reason = 'path'
          and (v_prog is null or pp.program_id = v_prog or split_part(pl.ref, ':', 1) = v_prog::text)
          and (coalesce(b.rule->>'key', b.rule->>'path') is null or pp.key = coalesce(b.rule->>'key', b.rule->>'path'));
      v_ok := v_n >= coalesce((b.rule->>'count')::int, 1);

    elsif v_kind in ('tool', 'tools') then
      if v_tools is null then
        select count(distinct tr.tool_id) into v_tools from public.tool_results tr where tr.user_id = p_user;
        select count(*) into v_tools_all from public.tools t where t.status = 'published';
      end if;
      v_ok := case when coalesce((b.rule->>'all')::boolean, false) then v_tools_all > 0 and v_tools >= v_tools_all
                   else v_tools >= coalesce((b.rule->>'count')::int, 1) end;

    elsif v_kind = 'referral' then
      select count(*) into v_n from public.referrals rf where rf.referrer_id = p_user and rf.status in ('paid', 'rewarded');
      v_ok := v_n >= coalesce((b.rule->>'count')::int, 1);

    elsif v_kind = 'points' then
      select coalesce(sum(pl.amount), 0) into v_n from public.points_ledger pl where pl.user_id = p_user;
      v_ok := v_n >= coalesce((b.rule->>'total')::int, 1000);
    end if;

    if v_ok then
      insert into public.member_badges (user_id, badge_id) values (p_user, b.id) on conflict do nothing;
      if found then
        v_new := v_new || b.id;
        if b.points > 0 then perform private.award_points(p_user, b.points, 'badge', b.id); end if;
      end if;
    end if;
  end loop;
  return v_new;
end $$;

create or replace function private.on_points_ledger_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.evaluate_badges(new.user_id);
  return null;
end $$;
create or replace trigger points_ledger_badges after insert on public.points_ledger
  for each row when (new.reason in ('lesson', 'section', 'path', 'tool', 'referral'))
  execute function private.on_points_ledger_insert();

-- First result of each tool: 25 points (reason 'tool', ref = tool id), which re-evaluates badges.
create or replace function private.on_tool_result_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_points(new.user_id, 25, 'tool', new.tool_id);
  return null;
end $$;
create or replace trigger tool_results_points after insert on public.tool_results
  for each row execute function private.on_tool_result_insert();

-- Levels: every 1000 points. Initiate, Apprentice, Practitioner, Adept, Master, then Master II, III ...
create or replace function private.level_name(p_level int)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_level <= 1 then 'Initiate' when p_level = 2 then 'Apprentice' when p_level = 3 then 'Practitioner'
    when p_level = 4 then 'Adept' when p_level = 5 then 'Master'
    else 'Master ' || (array['II','III','IV','V','VI','VII','VIII','IX','X'])[least(p_level - 5, 9)]
         || case when p_level - 5 > 9 then '+' else '' end
  end;
$$;

create or replace function public.my_rewards()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_total int; v_level int; v_cur int; v_best int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select coalesce(sum(amount), 0)::int into v_total from public.points_ledger where user_id = v_user;
  v_level := v_total / 1000 + 1;
  select s.current_days, s.best_days into v_cur, v_best from private.streaks(v_user) s;
  return jsonb_build_object(
    'points_total', v_total,
    'level', v_level,
    'level_name', private.level_name(v_level),
    'next_level_at', v_level * 1000,
    'streak_current', coalesce(v_cur, 0),
    'streak_best', coalesce(v_best, 0),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'tier', b.tier, 'icon', b.icon, 'earned_at', mb.earned_at)
                       order by mb.earned_at, b.position)
      from public.member_badges mb join public.badges b on b.id = mb.badge_id where mb.user_id = v_user), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- referrals
-- Once per account, not your own code, within 30 days of signing up.
create or replace function public.claim_referral(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_referrer uuid; v_created timestamptz;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select rc.user_id into v_referrer from public.referral_codes rc where rc.code = upper(trim(p_code));
  if v_referrer is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if v_referrer = v_user then return jsonb_build_object('ok', false, 'error', 'own_code'); end if;
  if exists (select 1 from public.referrals where referred_id = v_user) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;
  select u.created_at into v_created from auth.users u where u.id = v_user;
  if v_created < now() - interval '30 days' then return jsonb_build_object('ok', false, 'error', 'too_late'); end if;
  insert into public.referrals (referrer_id, referred_id) values (v_referrer, v_user) on conflict (referred_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- grants
revoke all on function private.resolve_program(text), private.resolve_path(text), private.member_plan(uuid),
  private.owns_program(uuid, uuid, public.benefit_scope), private.quote_for(uuid, text, text, text, text),
  private.create_pending_order(uuid, text, text, text, text, uuid),
  private.grant_access(uuid, uuid, public.benefit_scope, public.grant_source, text, timestamptz),
  private.grant_with_inclusions(uuid, uuid, public.benefit_scope, text, timestamptz), private.reward_referrer(uuid),
  private.apply_paid_order(uuid, text, jsonb), private.refund_order(uuid),
  private.offer_audience_ok(uuid, text, jsonb), private.has_completed(uuid, text, uuid, uuid),
  private.offer_trigger_ok(uuid, jsonb, jsonb), private.offer_target_open(uuid, int, text, text),
  private.streaks(uuid), private.evaluate_badges(uuid), private.on_points_ledger_insert(), private.on_tool_result_insert(),
  private.level_name(int)
  from public, anon, authenticated;

revoke all on function public.quote(text, text, text, text), public.get_offer(text, jsonb), public.log_offer_event(uuid, text, text),
  public.my_rewards(), public.claim_referral(text),
  public.create_pending_order(uuid, text, text, text, text, uuid), public.apply_paid_order(uuid, text, jsonb), public.refund_order(uuid)
  from public, anon, authenticated;
grant execute on function public.quote(text, text, text, text), public.get_offer(text, jsonb), public.log_offer_event(uuid, text, text)
  to anon, authenticated;
grant execute on function public.my_rewards(), public.claim_referral(text) to authenticated;
grant execute on function public.create_pending_order(uuid, text, text, text, text, uuid), public.apply_paid_order(uuid, text, jsonb),
  public.refund_order(uuid) to service_role;

-- ---------------------------------------------------------------- seed: coaching single session + 6 starter offers
-- Idempotent (by offer name). Skips any offer whose programs are missing.
insert into public.coaching_packages (name, description, sessions, duration_minutes, format, position)
select 'Single session', 'One hour with Mike on the thing that is actually holding you back.', 1, 60, 'one_to_one', 0
where not exists (select 1 from public.coaching_packages where name = 'Single session');

insert into public.prices (kind, ref_id, label, interval, amount_cents, draft_note)
select 'coaching', c.id::text, 'Single session', 'one_time', 18000, 'Legacy price; awaiting Mike'
from public.coaching_packages c
where c.name = 'Single session'
  and not exists (select 1 from public.prices pr where pr.kind = 'coaching' and pr.ref_id = c.id::text);

do $$
declare
  v_kbl uuid := private.resolve_program('kettlebell-lifestyle');
  v_mtk uuid := private.resolve_program('mastering-the-kettlebell');
  v_swing uuid := private.resolve_program('what-your-kettlebell-swing-is-missing');
  v_retreat uuid := private.resolve_program('men-of-movement-retreats');
  v_l1 uuid; v_l2 uuid; v_l2_key text; v_coach uuid;
begin
  select pp.id into v_l1 from public.program_paths pp where pp.program_id = v_kbl and pp.kind = 'level' order by pp.position limit 1;
  select pp.id, pp.key into v_l2, v_l2_key from public.program_paths pp where pp.program_id = v_kbl and pp.kind = 'level' order by pp.position offset 1 limit 1;
  select c.id into v_coach from public.coaching_packages c where c.name = 'Single session' limit 1;

  if v_kbl is not null and v_l1 is not null and v_l2 is not null and not exists (select 1 from public.offers where name = 'KBL Level I done → Level II') then
    insert into public.offers (name, priority, trigger, audience, placements, target_kind, target_ref, headline, body, cta_label, max_views, cooldown_days)
    values ('KBL Level I done → Level II', 10,
      jsonb_build_object('kind', 'completed', 'scope', 'path', 'program_id', v_kbl, 'path_id', v_l1),
      jsonb_build_object('lacks_path', jsonb_build_array(v_l2)),
      '{program_complete,today}', 'url', '/programs/kettlebell-lifestyle?path=' || coalesce(v_l2_key, v_l2::text),
      'Level II is ready for you', 'You finished Level I. Level II builds on everything you just learned.', 'Start Level II', 5, 3);
  end if;

  if v_kbl is not null and v_mtk is not null and not exists (select 1 from public.offers where name = 'KBL done → MTK') then
    insert into public.offers (name, priority, trigger, audience, placements, target_kind, target_ref, headline, body, cta_label)
    values ('KBL done → MTK', 20,
      jsonb_build_object('kind', 'completed', 'scope', 'program', 'program_id', v_kbl),
      '{}'::jsonb, '{program_complete,today,program_page}', 'program', v_mtk::text,
      'Take your kettlebell skills further', 'Mastering the Kettlebell is the next step after Kettlebell Lifestyle.', 'See Mastering the Kettlebell');
  end if;

  if v_mtk is not null and v_swing is not null and not exists (select 1 from public.offers where name = 'Swing Is Missing done → MTK') then
    insert into public.offers (name, priority, trigger, audience, placements, target_kind, target_ref, headline, body, cta_label)
    values ('Swing Is Missing done → MTK', 30,
      jsonb_build_object('kind', 'completed', 'scope', 'program', 'program_id', v_swing),
      '{}'::jsonb, '{program_complete,today}', 'program', v_mtk::text,
      'Your swing is just the start', 'Mastering the Kettlebell turns the fixes you just learned into a full practice.', 'See Mastering the Kettlebell');
  end if;

  if not exists (select 1 from public.offers where name = 'Kettlebell Selector → shop') then
    insert into public.offers (name, is_active, priority, trigger, audience, placements, target_kind, target_ref, headline, body, cta_label)
    values ('Kettlebell Selector → shop', false, 40,
      '{"kind":"tool_result","tool_id":"kettlebell-selector"}'::jsonb,
      '{}'::jsonb, '{tool_result}', 'url', '/shop',
      'Get the right kettlebell', 'Pick up the bell your result recommends.', 'Shop kettlebells');
  end if;

  if v_retreat is not null and v_coach is not null and not exists (select 1 from public.offers where name = 'Retreat booked → prep + coaching') then
    insert into public.offers (name, priority, trigger, audience, placements, target_kind, target_ref, headline, body, cta_label)
    values ('Retreat booked → prep + coaching', 15,
      jsonb_build_object('kind', 'run_booked', 'program_id', v_retreat),
      '{}'::jsonb, '{today,program_page}', 'coaching', v_coach::text,
      'Arrive ready for Men of Movement', 'Start Men of Movement: Preparation, and book a single session with Mike before you go.', 'Book a session');
  end if;

  if exists (select 1 from public.plans where id = 'pro') and not exists (select 1 from public.offers where name = 'Free member on Today → Pro') then
    insert into public.offers (name, priority, trigger, audience, placements, target_kind, target_ref, headline, body, cta_label, max_views, cooldown_days)
    values ('Free member on Today → Pro', 100,
      '{"kind":"always"}'::jsonb, '{"plans":["free"]}'::jsonb, '{today}', 'plan', 'pro',
      'Unlock Kettlebell Lifestyle with Pro', 'Pro includes Kettlebell Lifestyle and member pricing on every course.', 'See Pro', 5, 7);
  end if;
end $$;
