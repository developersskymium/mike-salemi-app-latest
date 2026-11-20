-- 0022 · Fix: Executive Edge (and any package or program flagged as needing an application) can only be
-- bought after Mike has accepted the member's application. Additive: one new helper and a new body for
-- private.quote_for (the single source of prices), so create_pending_order, quote() and the Stripe checkout
-- all refuse with reason 'application_required' until the application is accepted.
--
-- Flags honoured: coaching_packages.requires_application, and programs.meta.requires_application = true
-- (for the package's program, or the program bought directly).

create or replace function private.application_ok(p_user uuid, p_program uuid, p_package uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    -- nothing asks for an application: fine
    (p_package is null
      and coalesce((select (p.meta->>'requires_application')::boolean from public.programs p where p.id = p_program), false) = false)
    -- an admin can always buy (test purchases)
    or (p_user is not null and private.has_role(p_user, 'admin'))
    -- an accepted application for this package, or for any package of the program
    or (p_user is not null and exists (
          select 1 from public.coaching_applications a
            join public.coaching_packages c on c.id = a.package_id
          where a.user_id = p_user and a.status = 'accepted'
            and (a.package_id = p_package or (p_package is null and c.program_id = p_program))));
$$;
revoke all on function private.application_ok(uuid, uuid, uuid) from public, anon, authenticated;

comment on function private.application_ok(uuid, uuid, uuid) is
  'True when the member may buy: no application needed, an admin, or an accepted application (0022).';

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

