-- 0023 — Badges & rewards across ALL programs (spec 11), Moments with Mike (non-linear).
-- Additive only. Members never write badges, points, perks or coupons: every award comes from a
-- security definer function (private.evaluate_badges), fired by triggers on the existing progress,
-- session, enrollment, booking, application, video and readiness tables, and by
-- public.evaluate_my_badges() which the app calls after progress (announceProgress → syncAchievements).
--
-- Families: consistency · program (start / halfway / complete, per program, own enamel colour) ·
-- mastery · explorer · mike (Moments with Mike: a collection earned in any order — never a ladder).
-- Some badges carry a perk (bonus video, discount on the next program as a one-time coupon, free month).

-- ============================================================ 1. Badge columns
alter table public.badges add column if not exists family text not null default 'consistency'
  constraint badges_family_check check (family in ('consistency', 'program', 'mastery', 'explorer', 'mike'));
alter table public.badges add column if not exists program_id uuid references public.programs(id) on delete set null;
alter table public.badges add column if not exists medal_color text;
alter table public.badges add column if not exists perk jsonb;  -- {kind:'bonus_video'|'discount'|'free_month'|'coaching_credit', label, detail?, percent?, href?, applies?}
create index if not exists badges_program_idx on public.badges (program_id);

-- ============================================================ 2. Perks (stored rewards)
create table if not exists public.member_perks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  kind text not null check (kind in ('bonus_video', 'discount', 'free_month', 'coaching_credit')),
  label text not null,
  detail text,
  href text,
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,
  percent_off int,
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
create index if not exists member_perks_coupon_idx on public.member_perks (coupon_id);
alter table public.member_perks enable row level security;
revoke all on public.member_perks from anon, authenticated;
grant select on public.member_perks to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'member_perks' and policyname = 'own_read') then
    create policy own_read on public.member_perks for select to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;

-- ============================================================ 3. Metrics for the new rule kinds
-- Returns (current, target) for one rule. Kinds handled here:
--   {kind:'first_session'}                         any session logged or step completed
--   {kind:'active_weeks', count}                   distinct ISO weeks with training
--   {kind:'program', program, stage:'start'|'halfway'|'complete'}
--   {kind:'programs_tried', count}                 distinct programs enrolled
--   {kind:'videos_watched', count}                 videos watched to 90%
--   {kind:'readiness_improved'}                    a later readiness band better than an earlier one
--   {kind:'stretch_improved'}                      a later Stretch Test score above an earlier one (or a retest)
--   {kind:'booking'} {kind:'live_call'} {kind:'mike_note'}   1:1 coaching with Mike
--   {kind:'program_complete'}                      any program or level finished
--   {kind:'retreat_apply'} {kind:'retreat_attend'} retreat applications / attendance
create or replace function private.badge_metric(p_user uuid, p_rule jsonb, out cur int, out target int)
language plpgsql stable security definer set search_path = '' as $$
declare v_kind text := p_rule->>'kind'; v_prog uuid; v_pct numeric;
begin
  cur := 0; target := greatest(coalesce((p_rule->>'count')::int, 1), 1);
  if v_kind = 'first_session' then
    cur := case when exists (select 1 from public.training_sessions t where t.user_id = p_user)
                  or exists (select 1 from public.step_progress sp where sp.user_id = p_user) then 1 else 0 end;
    target := 1;
  elsif v_kind = 'active_weeks' then
    select count(distinct w)::int into cur from (
      select date_trunc('week', sp.completed_at) w from public.step_progress sp where sp.user_id = p_user
      union all
      select date_trunc('week', t.started_at) from public.training_sessions t where t.user_id = p_user and coalesce(t.minutes, 0) > 0) x;
  elsif v_kind = 'program' then
    v_prog := private.resolve_program(p_rule->>'program');
    target := 1;
    if v_prog is null then cur := 0; return; end if;
    if p_rule->>'stage' = 'start' then
      cur := case when exists (select 1 from public.enrollments e where e.user_id = p_user and e.program_id = v_prog) then 1 else 0 end;
    else
      -- best share of lessons done on any enrolled path of the program
      select max(x.d::numeric / greatest(x.t, 1)) into v_pct from (
        select count(*) filter (where private.lesson_done(p_user, l.id)) d, count(*) t
        from public.enrollments e
        join public.lessons l on l.program_id = e.program_id and (e.path_id is null or l.path_id is null or l.path_id = e.path_id)
        where e.user_id = p_user and e.program_id = v_prog
        group by e.id) x;
      if p_rule->>'stage' = 'halfway' then
        target := 50; cur := least(50, floor(coalesce(v_pct, 0) * 100)::int);
      else
        target := 100;
        cur := case when exists (select 1 from public.enrollments e where e.user_id = p_user and e.program_id = v_prog and e.completed_at is not null)
                      or exists (select 1 from public.certificates c where c.user_id = p_user and c.program_id = v_prog)
                    then 100 else floor(coalesce(v_pct, 0) * 100)::int end;
      end if;
    end if;
  elsif v_kind = 'programs_tried' then
    select count(distinct e.program_id)::int into cur from public.enrollments e where e.user_id = p_user;
  elsif v_kind = 'videos_watched' then
    select count(*)::int into cur from public.video_positions vp
      where vp.user_id = p_user and vp.duration > 0 and vp.seconds >= vp.duration * 0.9;
  elsif v_kind = 'readiness_improved' then
    target := 1;
    cur := case when exists (
      select 1 from public.readiness_results a join public.readiness_results b
        on b.user_id = a.user_id and b.created_at > a.created_at
       and (case b.band when 'green' then 2 when 'amber' then 1 else 0 end) > (case a.band when 'green' then 2 when 'amber' then 1 else 0 end)
      where a.user_id = p_user) then 1 else 0 end;
  elsif v_kind = 'stretch_improved' then
    target := 1;
    cur := case when exists (
      select 1 from public.tool_results a join public.tool_results b
        on b.user_id = a.user_id and b.tool_id = a.tool_id and b.created_at > a.created_at
      where a.user_id = p_user and a.tool_id ilike '%stretch%'
        and coalesce((b.result->>'score')::numeric, 1) > coalesce((a.result->>'score')::numeric, 0)) then 1 else 0 end;
  elsif v_kind = 'booking' then
    target := 1;
    cur := case when exists (select 1 from public.coaching_bookings cb where cb.user_id = p_user and cb.status in ('booked', 'completed')) then 1 else 0 end;
  elsif v_kind = 'live_call' then
    target := 1;
    cur := case when exists (select 1 from public.coaching_bookings cb where cb.user_id = p_user and cb.status = 'completed')
                  or exists (select 1 from public.run_applications ra where ra.user_id = p_user and ra.call_done_at is not null) then 1 else 0 end;
  elsif v_kind = 'mike_note' then
    target := 1;
    cur := case when exists (select 1 from public.coaching_bookings cb where cb.user_id = p_user
                               and (nullif(btrim(cb.coach_note), '') is not null or nullif(btrim(cb.homework), '') is not null)) then 1 else 0 end;
  elsif v_kind = 'program_complete' then
    target := 1;
    cur := case when exists (select 1 from public.enrollments e where e.user_id = p_user and e.completed_at is not null)
                  or exists (select 1 from public.certificates c where c.user_id = p_user)
                  or exists (select 1 from public.points_ledger pl where pl.user_id = p_user and pl.reason = 'path') then 1 else 0 end;
  elsif v_kind = 'retreat_apply' then
    target := 1;
    cur := case when exists (select 1 from public.run_applications ra where ra.user_id = p_user and ra.status <> 'cancelled') then 1 else 0 end;
  elsif v_kind = 'retreat_attend' then
    target := 1;
    cur := case when exists (select 1 from public.run_applications ra join public.program_runs r on r.id = ra.run_id
                             where ra.user_id = p_user and ra.status = 'booked'
                               and (r.status in ('in_progress', 'past') or r.starts_at <= now())) then 1 else 0 end;
  else
    cur := null; target := null;  -- not a kind handled here
  end if;
end $$;

-- ============================================================ 4. Perk granting
create or replace function private.grant_badge_perk(p_user uuid, p_badge text)
returns void language plpgsql security definer set search_path = '' as $$
declare b record; v_coupon uuid; v_code text; v_pct int; v_exp timestamptz;
begin
  select * into b from public.badges where id = p_badge;
  if b.perk is null or b.perk->>'kind' is null then return; end if;
  if exists (select 1 from public.member_perks mp where mp.user_id = p_user and mp.badge_id = p_badge) then return; end if;
  if b.perk->>'kind' = 'discount' then
    v_pct := least(greatest(coalesce((b.perk->>'percent')::int, 10), 1), 50);
    v_exp := now() + interval '90 days';
    v_code := 'MS' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    insert into public.coupons (code, percent_off, applies_to, max_redemptions, expires_at, is_active)
      values (v_code, v_pct, jsonb_build_object('kinds', coalesce(b.perk->'applies', '["program"]'::jsonb), 'user_id', p_user), 1, v_exp, true)
      returning id into v_coupon;
  end if;
  insert into public.member_perks (user_id, badge_id, kind, label, detail, href, coupon_id, coupon_code, percent_off, expires_at)
    values (p_user, p_badge, b.perk->>'kind', coalesce(b.perk->>'label', b.name), b.perk->>'detail', b.perk->>'href',
            v_coupon, v_code, v_pct, v_exp)
    on conflict (user_id, badge_id) do nothing;
end $$;

-- ============================================================ 5. Evaluator (old kinds kept as in 0007, new kinds via badge_metric)
create or replace function private.evaluate_badges(p_user uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  b record; v_ok boolean; v_kind text; v_n int; v_prog uuid; v_new text[] := '{}';
  v_streak_best int; v_tools int; v_tools_all int; m record;
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
    else
      select * into m from private.badge_metric(p_user, b.rule);
      v_ok := m.cur is not null and m.cur >= m.target;
    end if;

    if v_ok then
      insert into public.member_badges (user_id, badge_id) values (p_user, b.id) on conflict do nothing;
      if found then
        v_new := v_new || b.id;
        if b.points > 0 then perform private.award_points(p_user, b.points, 'badge', b.id); end if;
        perform private.grant_badge_perk(p_user, b.id);
      end if;
    end if;
  end loop;
  return v_new;
end $$;

-- ============================================================ 6. Triggers on existing tables
create or replace function private.on_activity_eval_badges()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform private.evaluate_badges(new.user_id);
  exception when others then
    raise warning 'badge evaluation skipped: %', sqlerrm;  -- never block the member's action
  end;
  return null;
end $$;

create or replace trigger badges_training_sessions after insert or update of ended_at, day_completed_at, minutes on public.training_sessions
  for each row execute function private.on_activity_eval_badges();
create or replace trigger badges_enrollments after insert or update of completed_at on public.enrollments
  for each row execute function private.on_activity_eval_badges();
create or replace trigger badges_coaching_bookings after insert or update of status, coach_note, homework on public.coaching_bookings
  for each row execute function private.on_activity_eval_badges();
create or replace trigger badges_run_applications after insert or update of status, call_done_at on public.run_applications
  for each row execute function private.on_activity_eval_badges();
create or replace trigger badges_readiness after insert on public.readiness_results
  for each row execute function private.on_activity_eval_badges();
create or replace trigger badges_certificates after insert on public.certificates
  for each row execute function private.on_activity_eval_badges();
-- Videos: only when a video crosses 90% watched (positions are saved often).
create or replace trigger badges_video_positions after insert or update of seconds on public.video_positions
  for each row when (new.duration > 0 and new.seconds >= new.duration * 0.9)
  execute function private.on_activity_eval_badges();

-- ============================================================ 7. Member-callable: evaluate my badges (only for the caller)
create or replace function public.evaluate_my_badges()
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then return '{}'; end if;
  return private.evaluate_badges(v_user);
end $$;

-- my_rewards: badges now carry family, colour and program slug (keys only added).
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
      select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'tier', b.tier, 'icon', b.icon, 'earned_at', mb.earned_at,
                                          'family', b.family, 'medal_color', b.medal_color, 'program_slug', p.slug)
                       order by mb.earned_at, b.position)
      from public.member_badges mb join public.badges b on b.id = mb.badge_id
      left join public.programs p on p.id = b.program_id
      where mb.user_id = v_user), '[]'::jsonb));
end $$;

-- my_badge_progress: new kinds report their metric too.
create or replace function public.my_badge_progress()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  b record; v_kind text; v_key text; v_cur int; v_target int; m record;
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
      v_key := coalesce(b.rule->>'key', b.rule->>'phase');
      if v_key is null then
        -- count-based (e.g. MTK skills, A4L blocks): completed sections of the program
        select count(distinct s.id)::int into v_cur from public.points_ledger pl
          join public.sections s on s.id::text = split_part(pl.ref, ':', 1)
          where pl.user_id = v_user and pl.reason = 'section'
            and (private.resolve_program(b.rule->>'program') is null or s.program_id = private.resolve_program(b.rule->>'program'));
        v_target := coalesce((b.rule->>'count')::int, 1);
      else
        select x.d, x.t into v_cur, v_target from (
          select count(*) filter (where private.lesson_done(v_user, l.id))::int as d, count(*)::int as t
          from public.sections s
          join public.enrollments e on e.user_id = v_user and e.program_id = s.program_id
                                   and (s.path_id is null or s.path_id is not distinct from e.path_id)
          join public.lessons l on l.section_id = s.id
          where s.key = v_key or s.key like '%-' || v_key
          group by s.id) x
        order by x.d::numeric / greatest(x.t, 1) desc, x.t limit 1;
      end if;
    elsif v_kind in ('path', 'level') then
      v_key := coalesce(b.rule->>'key', b.rule->>'path');
      select count(*) filter (where private.lesson_done(v_user, l.id))::int, count(*)::int into v_cur, v_target
        from public.lessons l join public.program_paths pp on pp.id = l.path_id where pp.key = v_key;
    else
      select * into m from private.badge_metric(v_user, b.rule);
      v_cur := m.cur; v_target := m.target;
    end if;
    v_cur := coalesce(v_cur, 0); v_target := greatest(coalesce(v_target, 1), 1);
    v_out := v_out || jsonb_build_object(
      'id', b.id, 'current', least(v_cur, v_target), 'target', v_target,
      'earned', exists (select 1 from public.member_badges mb where mb.user_id = v_user and mb.badge_id = b.id));
  end loop;
  return v_out;
end $$;

revoke all on function private.badge_metric(uuid, jsonb), private.grant_badge_perk(uuid, text),
  private.evaluate_badges(uuid), private.on_activity_eval_badges() from public, anon, authenticated;
revoke all on function public.evaluate_my_badges(), public.my_rewards(), public.my_badge_progress() from public, anon;
grant execute on function public.evaluate_my_badges(), public.my_rewards(), public.my_badge_progress() to authenticated;

-- ============================================================ 8. Definitions
-- Existing badges get their family.
update public.badges set family = 'consistency' where id in ('first-day', 'day-7', 'day-30', 'streak-3', 'streak-7', 'streak-30');
update public.badges set family = 'explorer' where id in ('tool-first', 'tool-all');
update public.badges set family = 'program', program_id = private.resolve_program('kettlebell-lifestyle'), medal_color = '#E2551F'
  where id in ('on-ramp', 'phase-1', 'phase-2', 'phase-3', 'level-1', 'level-2');

insert into public.badges (id, name, description, tier, icon, rule, points, position, family, perk) values
  ('first-session', 'First Session', 'Log your first session in any program.', 'bronze', 'sparkles', '{"kind":"first_session"}', 25, 100, 'consistency', null),
  ('weeks-4', 'Four Good Weeks', 'Train in 4 different weeks.', 'silver', 'calendar', '{"kind":"active_weeks","count":4}', 100, 101, 'consistency', null),
  ('weeks-12', 'Twelve Good Weeks', 'Train in 12 different weeks. Mike has a bonus session for you.', 'gold', 'calendar', '{"kind":"active_weeks","count":12}', 300, 102, 'consistency',
     '{"kind":"bonus_video","label":"Bonus: Mike''s 20-minute mobility reset","detail":"An extra session from Mike, yours to keep.","href":"/library"}'),
  ('mastery-mtk-skill', 'First Skill Unlocked', 'Finish your first stage in Mastering the Kettlebell.', 'silver', 'target', '{"kind":"phase","program":"mastering-the-kettlebell","count":1}', 100, 200, 'mastery', null),
  ('mastery-mtk-skills-5', 'Skilled Hands', 'Finish five stages in Mastering the Kettlebell.', 'gold', 'target', '{"kind":"phase","program":"mastering-the-kettlebell","count":5}', 300, 201, 'mastery', null),
  ('mastery-a4l-block', 'Block Done', 'Finish a training block in Athleticism 4 Life.', 'silver', 'dumbbell', '{"kind":"phase","program":"athleticism-4-life","count":1}', 100, 202, 'mastery', null),
  ('mastery-readiness', 'Readiness Up', 'Your readiness check came back better than before.', 'silver', 'heart', '{"kind":"readiness_improved"}', 50, 203, 'mastery', null),
  ('mastery-stretch', 'More Mobile', 'Retest the Stretch Test and beat your last score.', 'silver', 'compass', '{"kind":"stretch_improved"}', 50, 204, 'mastery', null),
  ('explore-3-programs', 'Explorer', 'Try three different programs.', 'silver', 'compass', '{"kind":"programs_tried","count":3}', 100, 300, 'explorer', null),
  ('explore-both-tools', 'Both Tools', 'Use the Kettlebell Selector and the Stretch Test.', 'bronze', 'heart', '{"kind":"tools","count":2}', 25, 301, 'explorer', null),
  ('explore-25-videos', 'Library Regular', 'Watch 25 videos from the library to the end.', 'silver', 'sparkles', '{"kind":"videos_watched","count":25}', 100, 302, 'explorer',
     '{"kind":"bonus_video","label":"Bonus: Mike''s favourite flow","detail":"Unlocked for watching the library.","href":"/library"}'),
  ('mike-book-1on1', 'Booked a 1:1', 'You booked a call with Mike.', 'gold', 'calendar', '{"kind":"booking"}', 100, 400, 'mike', null),
  ('mike-live-call', 'On a Call with Mike', 'You joined a live call with Mike.', 'gold', 'people', '{"kind":"live_call"}', 100, 401, 'mike', null),
  ('mike-note', 'A Note from Mike', 'Mike wrote you a note after a call.', 'gold', 'sparkles', '{"kind":"mike_note"}', 50, 402, 'mike', null),
  ('mike-finish-program', 'Finished a Program', 'You finished a program or level.', 'gold', 'trophy', '{"kind":"program_complete"}', 200, 403, 'mike',
     '{"kind":"discount","percent":15,"label":"15% off a 1:1 call with Mike","detail":"Review your progress with Mike.","href":"/coaching","applies":["coaching"]}'),
  ('mike-retreat-apply', 'Applied to a Retreat', 'You applied to train with Mike in person.', 'gold', 'compass', '{"kind":"retreat_apply"}', 100, 404, 'mike', null),
  ('mike-retreat-attend', 'On the Mountain', 'You trained with Mike at a retreat.', 'platinum', 'trophy', '{"kind":"retreat_attend"}', 500, 405, 'mike', null),
  ('mike-refer', 'Brought a Friend', 'A friend you invited joined.', 'gold', 'people', '{"kind":"referral","count":1}', 0, 406, 'mike',
     '{"kind":"free_month","label":"A free month","detail":"Added to your membership when your friend joined.","href":"/you/referrals"}')
on conflict (id) do update set name = excluded.name, description = excluded.description, tier = excluded.tier, icon = excluded.icon,
  rule = excluded.rule, points = excluded.points, position = excluded.position, family = excluded.family, perk = excluded.perk;

-- Program milestones: start · halfway · complete for every training program, in its own enamel colour.
with progs(slug, color, short, next_perk) as (values
  ('kettlebell-lifestyle', '#E2551F', 'Kettlebell Lifestyle', true),
  ('mastering-the-kettlebell', '#1A85D6', 'Mastering the Kettlebell', true),
  ('athleticism-4-life', '#1F9D6A', 'Athleticism 4 Life', true),
  ('working-in', '#7A5BC7', 'Working-In', true),
  ('the-path-to-inspired-action', '#C2410C', 'The Path', true),
  ('men-of-movement', '#2F4B72', 'Men of Movement', false),
  ('what-your-kettlebell-swing-is-missing', '#B8860B', 'the Swing series', true),
  ('free-6-video-kettlebell-mini-series', '#0E7490', 'the Mini Series', true)
), stages(stage, tier, icon, pts, ord, verb) as (values
  ('start', 'bronze', 'sparkles', 25, 0, 'Started'),
  ('halfway', 'silver', 'compass', 100, 1, 'Halfway'),
  ('complete', 'gold', 'trophy', 300, 2, 'Finished')
)
insert into public.badges (id, name, description, tier, icon, rule, points, position, family, program_id, medal_color, perk)
select 'prog-' || p.slug || '-' || s.stage,
       s.verb || ' · ' || p.short,
       case s.stage when 'start' then 'You started ' || p.short || '.'
                    when 'halfway' then 'Halfway through ' || p.short || '.'
                    else 'You finished ' || p.short || '.' end,
       s.tier, s.icon,
       jsonb_build_object('kind', 'program', 'program', p.slug, 'stage', s.stage),
       s.pts, 500 + (dense_rank() over (order by p.slug))::int * 3 + s.ord, 'program', private.resolve_program(p.slug), p.color,
       case when s.stage = 'complete' and p.next_perk then
         jsonb_build_object('kind', 'discount', 'percent', 20, 'label', '20% off your next program',
                            'detail', 'For finishing ' || p.short || '. One use, 90 days.', 'href', '/programs', 'applies', jsonb_build_array('program'))
       end
from progs p cross join stages s
where private.resolve_program(p.slug) is not null
on conflict (id) do update set name = excluded.name, description = excluded.description, tier = excluded.tier, icon = excluded.icon,
  rule = excluded.rule, points = excluded.points, position = excluded.position, family = excluded.family, program_id = excluded.program_id,
  medal_color = excluded.medal_color, perk = excluded.perk;

-- ============================================================ 9. Backfill (safe: idempotent awards for existing members)
do $$ declare u record; begin
  for u in select distinct user_id from (
    select user_id from public.enrollments union select user_id from public.step_progress
    union select user_id from public.training_sessions union select user_id from public.tool_results) x
  loop
    begin
      perform private.evaluate_badges(u.user_id);
    exception when others then raise warning 'backfill skipped for %: %', u.user_id, sqlerrm;
    end;
  end loop;
end $$;
