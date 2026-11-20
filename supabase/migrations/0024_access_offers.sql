-- 0024 — Access states, previews, offers engine v2, plan & savings (spec 11: access guards + offers).
-- Builds on private.has_access / can_access. Members never write access, orders or offers; everything
-- here is security definer, reads only the caller's rows, and computes prices on the server (public.quote).

-- ------------------------------------------------------------------ previews
-- A lesson is a taste when Studio flags it (lessons.meta.preview = true) or it is the first lesson
-- of its program/path. Previews are watchable by any signed-in member.
create or replace function private.lesson_is_preview(p_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select coalesce((l.meta->>'preview')::boolean, false)
        or l.id = (select o.lesson_id from private.ordered_lessons(l.program_id, l.path_id) o order by o.ord limit 1)
    from public.lessons l
    join public.programs p on p.id = l.program_id and p.status = 'published'
    where l.id = p_lesson), false);
$$;

create or replace function public.lesson_is_preview(p_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.lesson_is_preview(p_lesson);
$$;

create or replace function private.preview_video_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  with firsts as (
    select (select o.lesson_id from private.ordered_lessons(x.program_id, x.path_id) o order by o.ord limit 1) as lesson_id
    from (select distinct program_id, path_id from public.lessons) x
  ), previews as (
    select l.id from public.lessons l where coalesce((l.meta->>'preview')::boolean, false) or l.id in (select lesson_id from firsts)
  )
  select s.video_id from public.steps s where s.video_id is not null and s.lesson_id in (select id from previews)
  union
  select sv.video_id from public.step_videos sv join public.steps s on s.id = sv.step_id where s.lesson_id in (select id from previews);
$$;

-- (created once; this migration never drops anything)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'steps' and policyname = 'preview_read') then
    create policy preview_read on public.steps for select to authenticated
      using ((select auth.uid()) is not null and private.lesson_is_preview(lesson_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'step_videos' and policyname = 'preview_read') then
    create policy preview_read on public.step_videos for select to authenticated
      using (exists (select 1 from public.steps s where s.id = step_videos.step_id and private.lesson_is_preview(s.lesson_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'videos' and policyname = 'preview_read') then
    create policy preview_read on public.videos for select to authenticated
      using (videos.id in (select private.preview_video_ids()));
  end if;
end $$;

-- lesson_state: previews open (read-only taste) for members without access.
create or replace function public.lesson_state(p_lesson uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_program uuid; v_path uuid; v_locked boolean; v_done uuid[]; v_open int := 0; r record; v_preview boolean := false;
begin
  select program_id, path_id into v_program, v_path from public.lessons where id = p_lesson;
  if v_program is null then return jsonb_build_object('access', false); end if;
  if not private.has_access(v_user, v_program) then
    v_preview := v_user is not null and private.lesson_is_preview(p_lesson);
    if not v_preview then return jsonb_build_object('access', false); end if;
  end if;
  v_locked := private.is_locked_order(v_user, v_program, v_path);
  select coalesce(array_agg(sp.step_id), '{}') into v_done
    from public.step_progress sp join public.steps st on st.id = sp.step_id
    where sp.user_id = v_user and st.lesson_id = p_lesson;
  for r in select id, is_required from public.steps where lesson_id = p_lesson order by position loop
    exit when r.is_required and not (r.id = any(v_done));
    v_open := v_open + 1;
  end loop;
  return jsonb_build_object(
    'access', true,
    'preview', v_preview,
    'locked_order', v_locked and not v_preview,
    'unlocked', v_preview or private.lesson_unlocked(v_user, p_lesson),
    'open_through', v_open,
    'completed_steps', to_jsonb(v_done),
    'done', private.lesson_done(v_user, p_lesson));
end $$;

-- ------------------------------------------------------------- access states
-- One row per published program: the member's state and what the CTA should say.
-- state: owned | included | upgrade | buy | free | apply | unavailable
create or replace function public.access_states(p_program uuid default null)
returns table(program_id uuid, slug text, state text, plan_id text, plan_name text, upgrade_plan_id text, upgrade_plan_name text,
              amount_cents int, base_cents int, currency text, enrolled boolean, started boolean, completed boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_admin boolean; v_plan text; v_rank int; v_plan_name text; p record; q jsonb;
  v_state text; v_up text; v_up_name text; v_amount int; v_base int; v_cur text; v_inc_plan text;
begin
  v_admin := v_user is not null and private.has_role(v_user, 'admin');
  if v_user is not null then select mp.plan_id, mp.rank into v_plan, v_rank from private.member_plan(v_user) mp; end if;
  v_plan := coalesce(v_plan, 'free'); v_rank := coalesce(v_rank, 0);
  select pl.name into v_plan_name from public.plans pl where pl.id = v_plan;

  for p in select pr.* from public.programs pr where pr.status = 'published' and (p_program is null or pr.id = p_program) order by pr.position loop
    v_state := null; v_up := null; v_up_name := null; v_amount := null; v_base := null; v_cur := 'usd'; v_inc_plan := null;
    -- the lightest active plan above the member's that includes it
    select pl.id, pl.name into v_up, v_up_name from public.plan_program_benefits b join public.plans pl on pl.id = b.plan_id
      where b.program_id = p.id and b.scope = 'content' and b.benefit = 'included' and pl.is_active and pl.rank > v_rank
      order by pl.rank limit 1;

    if v_admin then v_state := 'owned';
    elsif p.is_free then v_state := 'free';
    elsif v_user is not null and exists (select 1 from public.access_grants g where g.user_id = v_user and g.program_id = p.id and g.scope = 'content'
             and g.source not in ('organization', 'subscription') and g.revoked_at is null and g.starts_at <= now() and (g.ends_at is null or g.ends_at > now())) then
      v_state := 'owned';
    elsif v_user is not null and private.has_access(v_user, p.id, 'content') then
      v_state := 'included'; v_inc_plan := v_plan;
    elsif p.catalog_group = 'experiences' or p.type in ('coaching', 'retreat', 'live', 'challenge') then v_state := 'apply';
    else
      q := public.quote('program', p.id::text, 'one_time', null);
      if q->>'state' = 'purchasable' and (q->>'amount_cents') is not null then
        v_state := 'buy'; v_amount := (q->>'amount_cents')::int; v_base := (q->>'base_cents')::int; v_cur := coalesce(q->>'currency', 'usd');
      elsif v_up is not null then v_state := 'upgrade';
      else v_state := 'unavailable';
      end if;
    end if;

    program_id := p.id; slug := p.slug; state := v_state;
    plan_id := case when v_state = 'included' then v_inc_plan end;
    plan_name := case when v_state = 'included' then v_plan_name end;
    upgrade_plan_id := case when v_state in ('buy', 'upgrade', 'unavailable') then v_up end;
    upgrade_plan_name := case when v_state in ('buy', 'upgrade', 'unavailable') then v_up_name end;
    amount_cents := v_amount; base_cents := v_base; currency := v_cur;
    enrolled := v_user is not null and exists (select 1 from public.enrollments e where e.user_id = v_user and e.program_id = p.id);
    started := v_user is not null and exists (select 1 from public.step_progress sp join public.steps s on s.id = sp.step_id
                                              where sp.user_id = v_user and s.program_id = p.id);
    completed := v_user is not null and exists (select 1 from public.enrollments e where e.user_id = v_user and e.program_id = p.id and e.completed_at is not null);
    return next;
  end loop;
end $$;

-- ---------------------------------------------------------- plan & savings
-- What the member's plan includes vs what they bought à la carte, and what each plan would cover.
-- Purchases in the last 30 days are credited toward a plan (credit_cents).
create or replace function public.my_plan_savings()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
                 'credit_cents', coalesce((select sum(bb.paid_cents) from bought bb
                               join public.plan_program_benefits b on b.program_id = bb.program_id and b.plan_id = pl.id and b.scope = 'content' and b.benefit = 'included'
                               where bb.paid_at > now() - interval '30 days'), 0)
               ) order by pl.rank) from public.plans pl where pl.is_active and pl.rank > 0), '[]')
  ) into res;
  return res;
end $$;

-- ------------------------------------------------------------ offers engine v2
alter table public.offers add column if not exists reason text;
alter table public.offers add column if not exists view_window_days int not null default 14;
alter table public.offers alter column max_views set default 3;
alter table public.offers alter column cooldown_days set default 30;
-- Spec caps: same offer ≤ 3 views per 14 days; dismissed → hidden 30 days.
update public.offers set max_views = 3, cooldown_days = 30 where max_views <> 3 or cooldown_days <> 30;

create or replace function private.offer_trigger_ok(p_user uuid, t jsonb, ctx jsonb)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_kind text := coalesce(t->>'kind', 'always'); v_prog uuid; v_path uuid; v_scope text; x jsonb; v_n int;
begin
  ctx := coalesce(ctx, '{}'::jsonb);
  if v_kind = 'always' then return true; end if;

  -- any: [trigger, …] (OR); all: [trigger, …] (AND)
  if v_kind = 'any' then
    for x in select jsonb_array_elements(coalesce(t->'of', '[]')) loop
      if private.offer_trigger_ok(p_user, x, ctx) then return true; end if;
    end loop;
    return false;
  end if;
  if v_kind = 'all' then
    for x in select jsonb_array_elements(coalesce(t->'of', '[]')) loop
      if not private.offer_trigger_ok(p_user, x, ctx) then return false; end if;
    end loop;
    return true;
  end if;

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

  -- finished any free program (free series, Swing Is Missing…)
  if v_kind = 'finished_free' then
    if ctx->>'completed' = 'program' and exists (select 1 from public.programs p where p.id = private.resolve_program(ctx->>'program_id') and p.is_free) then
      return true;
    end if;
    return p_user is not null and exists (select 1 from public.enrollments e join public.programs p on p.id = e.program_id
                                          where e.user_id = p_user and p.is_free and e.completed_at is not null);
  end if;

  -- viewing a program page (Pairs well with): program_ids = [slug|uuid, …]
  if v_kind = 'viewing' then
    v_prog := private.resolve_program(ctx->>'program_id');
    return v_prog is not null and exists (select 1 from jsonb_array_elements_text(coalesce(t->'program_ids', '[]')) s where private.resolve_program(s) = v_prog);
  end if;

  if v_kind = 'tool_result' then
    if ctx->>'tool_id' = t->>'tool_id' and (t->>'result' is null or ctx->>'result' = t->>'result') then return true; end if;
    return p_user is not null and exists (
      select 1 from public.tool_results tr where tr.user_id = p_user and tr.tool_id = t->>'tool_id'
        and (t->>'result' is null or tr.result->>'result' = t->>'result' or tr.result->>'key' = t->>'result'));
  end if;

  -- low readiness (amber/red band) at least `times` (2) in the last `days` (7)
  if v_kind = 'low_readiness' then
    return p_user is not null and (select count(*) from public.readiness_results r where r.user_id = p_user
             and r.band in ('amber', 'red') and r.created_at > now() - make_interval(days => coalesce((t->>'days')::int, 7)))
           >= coalesce((t->>'times')::int, 2);
  end if;

  -- trained in each of the last `weeks` (4) seven-day windows
  if v_kind = 'streak_weeks' then
    if p_user is null then return false; end if;
    v_n := coalesce((t->>'weeks')::int, 4);
    return (select count(distinct floor(extract(epoch from (now() - sp.completed_at)) / 604800))
            from public.step_progress sp where sp.user_id = p_user and sp.completed_at > now() - make_interval(days => 7 * v_n)) >= v_n;
  end if;

  -- bought at least `min` (2) programs à la carte
  if v_kind = 'purchases_min' then
    return p_user is not null and (select count(distinct g.program_id) from public.access_grants g
             where g.user_id = p_user and g.scope = 'content' and g.source = 'purchase' and g.revoked_at is null)
           >= coalesce((t->>'min')::int, 2);
  end if;

  -- has (had) 1:1 coaching
  if v_kind = 'coaching_client' then
    return p_user is not null and exists (select 1 from public.coaching_bookings b where b.user_id = p_user and b.status <> 'cancelled');
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

  -- an open retreat run exists (retreats are available any time, not a level)
  if v_kind = 'retreat_open' then
    return exists (select 1 from public.program_runs r join public.programs p on p.id = r.program_id
                   where p.type = 'retreat' and p.status = 'published' and r.starts_at > now());
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

-- get_offer v2: windowed view caps, 30-day dismiss, never offers the program being viewed, returns the reason.
create or replace function public.get_offer(p_placement text, p_context jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_plan text; v_rank int; o record; v_viewing uuid;
begin
  if v_user is not null then select mp.plan_id, mp.rank into v_plan, v_rank from private.member_plan(v_user) mp; end if;
  v_plan := coalesce(v_plan, 'free');
  v_rank := coalesce(v_rank, (select pl.rank from public.plans pl where pl.id = 'free'), 0);
  v_viewing := private.resolve_program(coalesce(p_context, '{}'::jsonb)->>'program_id');

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
      continue when (select count(*) from public.offer_events e where e.user_id = v_user and e.offer_id = o.id and e.event = 'view'
                       and e.created_at > now() - make_interval(days => o.view_window_days)) >= o.max_views;
    end if;
    continue when o.target_kind = 'program' and v_viewing is not null and private.resolve_program(o.target_ref) = v_viewing;
    continue when not private.offer_audience_ok(v_user, v_plan, o.audience);
    continue when not private.offer_trigger_ok(v_user, o.trigger, p_context);
    continue when not private.offer_target_open(v_user, v_rank, o.target_kind, o.target_ref);

    return jsonb_build_object(
      'id', o.id, 'placement', p_placement, 'headline', o.headline, 'body', o.body, 'cta_label', o.cta_label, 'reason', o.reason,
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

-- ------------------------------------------------------------- seed rules
-- Real catalog, by slug (resolve_program accepts slugs). Idempotent on name.
insert into public.offers (name, is_active, priority, trigger, audience, placements, target_kind, target_ref, headline, body, cta_label, reason, max_views, cooldown_days, view_window_days)
select * from (values
  ('Low readiness → Working-In', true, 5,
    '{"kind":"low_readiness","times":2,"days":7}'::jsonb, '{"lacks_program":["working-in"]}'::jsonb, array['today','day_complete'],
    'program', 'working-in', 'Recover with Working-In', 'Short, calm sessions with Paul Chek and Mike that rebuild energy instead of spending it.', 'See Working-In',
    'Because your readiness was low twice this week', 3, 30, 14),
  ('Low readiness → lighter day', true, 6,
    '{"kind":"low_readiness","times":2,"days":7}'::jsonb, '{"has_program":["working-in"]}'::jsonb, array['today'],
    'url', '/programs/working-in/course/resume', 'Take a Working-In day', 'Swap today''s session for 15 minutes of restorative work. Training will still be here tomorrow.', 'Open Working-In',
    'Because your readiness was low twice this week', 3, 30, 14),
  ('Bought 2+ programs → plan math', true, 8,
    '{"kind":"purchases_min","min":2}'::jsonb, '{"plans":["free","pro"]}'::jsonb, array['today','program_complete'],
    'plan', 'max', 'Your programs, plus everything else', 'Max includes what you bought and every other program. Purchases from the last 30 days count toward your first payment.', 'See plan math',
    'Because you own 2 programs', 3, 30, 14),
  ('Finished free → Kettlebell Lifestyle', true, 12,
    '{"kind":"any","of":[{"kind":"finished_free"},{"kind":"tool_result","tool_id":"kettlebell-roadmap"}]}'::jsonb, '{}'::jsonb, array['today','program_complete','tool_result'],
    'program', 'kettlebell-lifestyle', 'Your next step: Kettlebell Lifestyle', 'A day-by-day plan that adapts to how you feel. Day 1 is open: try it free.', 'Try Day 1',
    'Because you finished a free series', 3, 30, 14),
  ('KBL complete → Athleticism 4 Life', true, 21,
    '{"kind":"completed","scope":"program","program_id":"kettlebell-lifestyle"}'::jsonb, '{}'::jsonb, array['program_complete','today'],
    'program', 'athleticism-4-life', 'Build on it with a strength block', 'Athleticism 4 Life turns your kettlebell base into speed, power and athletic strength.', 'See Athleticism 4 Life',
    'Because you finished Kettlebell Lifestyle', 3, 30, 14),
  ('4-week streak → 1:1 with Mike', true, 25,
    '{"kind":"any","of":[{"kind":"streak_weeks","weeks":4},{"kind":"completed","scope":"program"}]}'::jsonb, '{}'::jsonb, array['today','program_complete'],
    'url', '/coaching', 'Review your progress with Mike', 'A 45-minute 1:1 on Tuesdays: what''s working, what to change, and your next block.', 'Book a call',
    'Because you''ve trained 4 weeks in a row', 3, 30, 14),
  ('Coaching client → retreat', true, 30,
    '{"kind":"all","of":[{"kind":"coaching_client"},{"kind":"retreat_open"}]}'::jsonb, '{}'::jsonb, array['today'],
    'url', '/experiences', 'Join Mike at a Men of Movement retreat', 'Four days of movement, breathwork and nature. Open to apply any time.', 'See retreats',
    'Because you''re coaching with Mike', 3, 30, 14),
  ('Pairs: KBL → MTK', true, 40, '{"kind":"viewing","program_ids":["kettlebell-lifestyle"]}'::jsonb, '{}'::jsonb, array['program_page'],
    'program', 'mastering-the-kettlebell', 'Mastering the Kettlebell', 'Technique fixes for every lift you train in Kettlebell Lifestyle.', 'See the course',
    'Pairs well with Kettlebell Lifestyle', 3, 30, 14),
  ('Pairs: MTK → A4L', true, 40, '{"kind":"viewing","program_ids":["mastering-the-kettlebell"]}'::jsonb, '{}'::jsonb, array['program_page'],
    'program', 'athleticism-4-life', 'Athleticism 4 Life', 'Put your technique to work: a strength and power block.', 'See the program',
    'Pairs well with Mastering the Kettlebell', 3, 30, 14),
  ('Pairs: A4L → Working-In', true, 40, '{"kind":"viewing","program_ids":["athleticism-4-life"]}'::jsonb, '{}'::jsonb, array['program_page'],
    'program', 'working-in', 'Working-In', 'Restorative sessions that balance hard training days.', 'See the program',
    'Pairs well with Athleticism 4 Life', 3, 30, 14),
  ('Pairs: Working-In → KBL', true, 40, '{"kind":"viewing","program_ids":["working-in"]}'::jsonb, '{}'::jsonb, array['program_page'],
    'program', 'kettlebell-lifestyle', 'Kettlebell Lifestyle', 'Daily training that adapts to your readiness, the work to Working-In''s rest.', 'See the program',
    'Pairs well with Working-In', 3, 30, 14),
  ('Pairs: free series → KBL', true, 40, '{"kind":"viewing","program_ids":["what-your-kettlebell-swing-is-missing","free-6-video-kettlebell-mini-series","kettlebell-roadmap"]}'::jsonb, '{}'::jsonb, array['program_page'],
    'program', 'kettlebell-lifestyle', 'Kettlebell Lifestyle', 'The full day-by-day program. Day 1 is open to try.', 'Try Day 1',
    'The next step after the free series', 3, 30, 14),
  ('Pairs: Path → coaching', true, 40, '{"kind":"viewing","program_ids":["the-path-to-inspired-action"]}'::jsonb, '{}'::jsonb, array['program_page'],
    'url', '/coaching', '1:1 coaching with Mike', 'Take the inner work further with a 45-minute session.', 'See coaching',
    'Pairs well with The Path to Inspired Action', 3, 30, 14)
) v(name, is_active, priority, trigger, audience, placements, target_kind, target_ref, headline, body, cta_label, reason, max_views, cooldown_days, view_window_days)
where not exists (select 1 from public.offers f where f.name = v.name);

update public.offers set reason = 'Because you finished Level I' where name = 'KBL Level I done → Level II' and reason is null;
update public.offers set reason = 'Because you finished Kettlebell Lifestyle' where name = 'KBL done → MTK' and reason is null;
update public.offers set reason = 'Because you finished the swing series' where name = 'Swing Is Missing done → MTK' and reason is null;
update public.offers set reason = 'Because your retreat is booked' where name = 'Retreat booked → prep + coaching' and reason is null;
update public.offers set reason = 'Because you''re on the Free plan' where name = 'Free member on Today → Pro' and reason is null;

-- ------------------------------------------------------------- grants
revoke all on function public.access_states(uuid) from public;
grant execute on function public.access_states(uuid) to anon, authenticated;
revoke all on function public.my_plan_savings() from public;
grant execute on function public.my_plan_savings() to authenticated;
revoke all on function public.lesson_is_preview(uuid) from public;
grant execute on function public.lesson_is_preview(uuid) to anon, authenticated;
