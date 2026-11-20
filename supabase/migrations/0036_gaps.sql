-- 0036 — Gaps: finish partly-built features. Additive only (new tables, new functions, in-place patches of
-- existing function bodies via create or replace). Members never write access/orders/points/badges/perks:
-- every write below goes through a security definer function, except saved lists (own rows, RLS).
--
-- 1. Bell weight memory + "How did today feel?" saved to the account (exercise_weights, day_feels), mirrored into
--    the latest training_sessions row for that day: progress.weights {exercise: kg} and progress.feel.
-- 2. (UI only: paused plans.)
-- 3. Badge coupons: applies_to.user_id is enforced by quote_for; a paid order marks the member's perk redeemed.
-- 4. Referral "give a month, get a month": the invited friend gets a free_month credit (member_credits) (100% off one monthly plan,
--    locked to them) when they claim a code; quote_for applies it automatically. Using it still rewards the inviter.
-- 5. Named saved lists for the Library.

-- ============================================================ 1. Weights + feel
create table if not exists public.exercise_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null check (char_length(exercise_key) between 1 and 120),
  exercise text not null check (char_length(exercise) between 1 and 200),
  kg numeric(5,1) not null check (kg > 0 and kg <= 200),
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists exercise_weights_user_key on public.exercise_weights (user_id, exercise_key, created_at desc);
alter table public.exercise_weights enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='exercise_weights' and policyname='own_read') then
  execute $p$create policy own_read on public.exercise_weights for select to authenticated using (user_id = (select auth.uid()))$p$; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='exercise_weights' and policyname='admin_all') then
  execute $p$create policy admin_all on public.exercise_weights for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))$p$; end if; end $$;

create table if not exists public.day_feels (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  feel text not null check (feel in ('easy', 'right', 'hard')),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.day_feels enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='day_feels' and policyname='own_read') then
  execute $p$create policy own_read on public.day_feels for select to authenticated using (user_id = (select auth.uid()))$p$; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='day_feels' and policyname='admin_all') then
  execute $p$create policy admin_all on public.day_feels for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))$p$; end if; end $$;

-- Merge a patch into the member's most recent session for that lesson (last 36 hours), if there is one.
create or replace function private.patch_day_session(p_user uuid, p_lesson uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_lesson is null then return; end if;
  select ts.id into v_id from public.training_sessions ts
    where ts.user_id = p_user and ts.lesson_id = p_lesson and ts.started_at > now() - interval '36 hours'
    order by ts.started_at desc limit 1;
  if v_id is null then return; end if;
  update public.training_sessions ts set
    progress = case
      when p_patch ? 'weights' then jsonb_set(coalesce(ts.progress, '{}'::jsonb) - 'weights', '{weights}',
                                              coalesce(ts.progress->'weights', '{}'::jsonb) || (p_patch->'weights'))
      else coalesce(ts.progress, '{}'::jsonb) || p_patch end,
    last_activity_at = now()
  where ts.id = v_id;
end $$;

create or replace function public.log_exercise_weight(p_exercise_key text, p_exercise text, p_kg numeric, p_lesson uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if p_kg is null or p_kg <= 0 or p_kg > 200 then raise exception 'invalid weight'; end if;
  insert into public.exercise_weights (user_id, exercise_key, exercise, kg, lesson_id)
    values (v_user, left(p_exercise_key, 120), left(p_exercise, 200), p_kg,
            (select l.id from public.lessons l where l.id = p_lesson));
  perform private.patch_day_session(v_user, p_lesson, jsonb_build_object('weights', jsonb_build_object(left(p_exercise, 200), p_kg)));
  return jsonb_build_object('ok', true, 'kg', p_kg);
end $$;

create or replace function public.set_day_feel(p_lesson uuid, p_feel text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if p_feel not in ('easy', 'right', 'hard') then raise exception 'invalid feel'; end if;
  if not exists (select 1 from public.lessons l where l.id = p_lesson) then raise exception 'lesson not found'; end if;
  insert into public.day_feels (user_id, lesson_id, feel) values (v_user, p_lesson, p_feel)
    on conflict (user_id, lesson_id) do update set feel = excluded.feel, updated_at = now();
  perform private.patch_day_session(v_user, p_lesson, jsonb_build_object('feel', p_feel));
  return jsonb_build_object('ok', true, 'feel', p_feel);
end $$;

revoke all on function public.log_exercise_weight(text, text, numeric, uuid) from public, anon;
revoke all on function public.set_day_feel(uuid, text) from public, anon;
grant execute on function public.log_exercise_weight(text, text, numeric, uuid) to authenticated;
grant execute on function public.set_day_feel(uuid, text) to authenticated;
revoke all on function private.patch_day_session(uuid, uuid, jsonb) from public, anon, authenticated;

-- ============================================================ 3 + 4. Coupons locked to a member, referral welcome month
create table if not exists public.member_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('free_month')),
  source text not null default 'referral',
  label text not null,
  detail text,
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, kind, source)
);
alter table public.member_credits enable row level security;
create policy own_read on public.member_credits for select to authenticated using (user_id = (select auth.uid()));
create policy admin_all on public.member_credits for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- The invited friend's first month: a 100%-off coupon for one monthly plan, usable only by them.
create or replace function private.grant_referral_welcome(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_coupon uuid; v_code text; v_exp timestamptz := now() + interval '180 days';
begin
  if p_user is null then return; end if;
  if exists (select 1 from public.member_credits mc where mc.user_id = p_user and mc.kind = 'free_month' and mc.source = 'referral') then return; end if;
  v_code := 'MSREF' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.coupons (code, percent_off, applies_to, max_redemptions, expires_at, is_active)
    values (v_code, 100, jsonb_build_object('kinds', '["plan"]'::jsonb, 'intervals', '["month"]'::jsonb, 'user_id', p_user, 'referral', true), 1, v_exp, true)
    returning id into v_coupon;
  insert into public.member_credits (user_id, kind, source, label, detail, coupon_id, coupon_code, expires_at)
    values (p_user, 'free_month', 'referral', 'Your first month is on us',
            'A friend invited you, so your first month of membership is free. It comes off at checkout automatically.',
            v_coupon, v_code, v_exp)
    on conflict (user_id, kind, source) do nothing;
end $$;
revoke all on function private.grant_referral_welcome(uuid) from public, anon, authenticated;

-- Friends who already claimed a code and have not paid yet get theirs now.
select private.grant_referral_welcome(rf.referred_id) from public.referrals rf where rf.status = 'signed_up';

-- Patch existing function bodies in place (keeps any other agent's edits to the rest of the body).
do $patch$
declare v_def text; v_new text;
begin
  -- claim_referral: grant the welcome month on a successful claim
  v_def := pg_get_functiondef('public.claim_referral(text)'::regprocedure);
  if position('grant_referral_welcome' in v_def) = 0 then
    v_new := replace(v_def,
      'on conflict (referred_id) do nothing;',
      'on conflict (referred_id) do nothing;' || E'\n  perform private.grant_referral_welcome(v_user);');
    if v_new = v_def then raise exception '0036: claim_referral anchor not found'; end if;
    execute v_new;
  end if;

  -- quote_for: auto-apply the referral month; enforce applies_to.user_id and applies_to.intervals
  v_def := pg_get_functiondef('private.quote_for(uuid, text, text, text, text)'::regprocedure);
  if position('applies_to->>''user_id''' in v_def) = 0 then
    v_new := replace(v_def,
      '  -- ---------- coupon (never stacks with the plan discount: the larger one wins)',
      '  -- ---------- referral welcome month: applied automatically to a monthly plan when no code was typed
  if v_state is null and p_user is not null and p_kind = ''plan'' and v_interval = ''month''
     and nullif(trim(coalesce(p_coupon, '''')), '''') is null then
    select mc.coupon_code into p_coupon from public.member_credits mc join public.coupons c on c.id = mc.coupon_id
      where mc.user_id = p_user and mc.kind = ''free_month'' and mc.redeemed_at is null and c.is_active
        and (c.expires_at is null or c.expires_at > now()) and (c.max_redemptions is null or c.redeemed < c.max_redemptions)
      order by mc.created_at limit 1;
  end if;

  -- ---------- coupon (never stacks with the plan discount: the larger one wins)');
    v_new := replace(v_new,
      '    elsif jsonb_array_length(coalesce(v_coupon.applies_to->''kinds'', ''[]''::jsonb)) > 0 and not (v_coupon.applies_to->''kinds'') ? p_kind then',
      '    elsif v_coupon.applies_to->>''user_id'' is not null and (p_user is null or v_coupon.applies_to->>''user_id'' <> p_user::text) then
      v_coupon_error := ''coupon_not_applicable'';
    elsif jsonb_array_length(coalesce(v_coupon.applies_to->''intervals'', ''[]''::jsonb)) > 0 and not (v_coupon.applies_to->''intervals'') ? v_interval then
      v_coupon_error := ''coupon_not_applicable'';
    elsif jsonb_array_length(coalesce(v_coupon.applies_to->''kinds'', ''[]''::jsonb)) > 0 and not (v_coupon.applies_to->''kinds'') ? p_kind then');
    if position('applies_to->>''user_id''' in v_new) = 0 or position('referral welcome month' in v_new) = 0 then
      raise exception '0036: quote_for anchors not found';
    end if;
    execute v_new;
  end if;

  -- apply_paid_order: mark the member's perk redeemed; a free referral month still rewards the inviter
  v_def := pg_get_functiondef('private.apply_paid_order(uuid, text, jsonb)'::regprocedure);
  if position('member_perks' in v_def) = 0 then
    v_new := replace(v_def,
      '    update public.coupons set redeemed = redeemed + 1 where id = v_o.coupon_id;',
      '    update public.coupons set redeemed = redeemed + 1 where id = v_o.coupon_id;
    update public.member_perks set redeemed_at = now()
      where coupon_id = v_o.coupon_id and user_id = v_o.user_id and redeemed_at is null;
    update public.member_credits set redeemed_at = now()
      where coupon_id = v_o.coupon_id and user_id = v_o.user_id and redeemed_at is null;');
    v_new := replace(v_new,
      '  if v_o.total_cents > 0 then',
      '  if v_o.total_cents > 0 or exists (select 1 from public.member_credits mc where mc.coupon_id = v_o.coupon_id
                                     and mc.user_id = v_o.user_id and mc.source = ''referral'') then');
    if position('member_perks set redeemed_at' in v_new) = 0 or position('mc.source = ''referral''' in v_new) = 0 then
      raise exception '0036: apply_paid_order anchors not found';
    end if;
    execute v_new;
  end if;
end $patch$;

-- ============================================================ 5. Named saved lists
create table if not exists public.saved_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index if not exists saved_lists_user_name on public.saved_lists (user_id, lower(name));
create table if not exists public.saved_list_items (
  list_id uuid not null references public.saved_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, video_id)
);
create index if not exists saved_list_items_user on public.saved_list_items (user_id, video_id);
alter table public.saved_lists enable row level security;
alter table public.saved_list_items enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_lists' and policyname='own_all') then
  execute $p$create policy own_all on public.saved_lists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_list_items' and policyname='own_all') then
  execute $p$create policy own_all on public.saved_list_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.saved_lists l where l.id = list_id and l.user_id = (select auth.uid())))$p$; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_lists' and policyname='admin_all') then
  execute $p$create policy admin_all on public.saved_lists for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))$p$; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_list_items' and policyname='admin_all') then
  execute $p$create policy admin_all on public.saved_list_items for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))$p$; end if; end $$;
grant select, insert, update, delete on public.saved_lists, public.saved_list_items to authenticated;
grant select on public.exercise_weights, public.day_feels, public.member_credits to authenticated;
