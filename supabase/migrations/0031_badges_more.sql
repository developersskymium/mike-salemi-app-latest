-- 0031 — More program badges (client: "A4L only has 3 badges"), 6–12 per program, built on each program's
-- real structure (sections, weeks, phases, levels, practice days). Additive only: create or replace + upserts.
-- Members never write badges: every award still comes from private.evaluate_badges (security definer),
-- which reaches the new rule kinds through private.badge_metric.
--
-- New rule kinds (all scoped to one program):
--   {kind:'prog_lessons', program, titles?:[ilike], ranges?:[[from,to]] (section positions), path?, count? | all:true | any_section:true}
--       lessons the member has actually completed (a step logged and every required step done) in the matching sections.
--       count → at least n · all → every lesson in the matching sections · any_section → one matching section fully done.
--   {kind:'prog_days', program, count}       distinct days with practice in the program (steps or sessions)
--   {kind:'prog_streak', program, days}      consecutive days practising inside the program
--   {kind:'next_step', program}              finished this program, then enrolled in a paid program

-- ============================================================ 1. Helpers
create or replace function private.badge_lesson_done(p_user uuid, p_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.step_progress sp where sp.user_id = p_user and sp.lesson_id = p_lesson)
     and private.lesson_done(p_user, p_lesson);
$$;

-- Sections of a program matching a rule (titles / position ranges / level path); never the "Home" page.
create or replace function private.badge_sections(p_prog uuid, p_rule jsonb)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.sections s
  left join public.program_paths pp on pp.id = s.path_id
  where s.program_id = p_prog
    and s.title !~* '^\s*home\s*$'
    and (p_rule->'titles' is null or exists (select 1 from jsonb_array_elements_text(p_rule->'titles') t where s.title ilike t))
    and (p_rule->'ranges' is null or exists (select 1 from jsonb_array_elements(p_rule->'ranges') r
                                             where s.position between (r->>0)::int and (r->>1)::int))
    and (p_rule->>'path' is null or pp.key = p_rule->>'path');
$$;

create or replace function private.badge_metric_more(p_user uuid, p_rule jsonb, out cur int, out target int)
language plpgsql stable security definer set search_path = '' as $$
declare v_kind text := p_rule->>'kind'; v_prog uuid; v_total int; v_done int; v_complete boolean;
begin
  cur := 0; target := greatest(coalesce((p_rule->>'count')::int, (p_rule->>'days')::int, 1), 1);
  v_prog := private.resolve_program(p_rule->>'program');
  if v_prog is null then return; end if;

  if v_kind = 'prog_lessons' then
    if coalesce((p_rule->>'any_section')::boolean, false) then
      -- best single section: done / total (target = that section's size)
      select x.d, x.t into cur, target from (
        select count(*) filter (where private.badge_lesson_done(p_user, l.id))::int d, count(*)::int t
        from public.lessons l
        where l.section_id in (select private.badge_sections(v_prog, p_rule)) and l.page_type is null
        group by l.section_id) x
      order by (x.d = x.t) desc, x.d::numeric / greatest(x.t, 1) desc, x.t limit 1;
      cur := coalesce(cur, 0); target := greatest(coalesce(target, 1), 1);
    else
      select count(*) filter (where private.badge_lesson_done(p_user, l.id))::int, count(*)::int into v_done, v_total
        from public.lessons l
        where l.section_id in (select private.badge_sections(v_prog, p_rule)) and l.page_type is null;
      cur := coalesce(v_done, 0);
      if coalesce((p_rule->>'all')::boolean, false) then target := greatest(coalesce(v_total, 0), 1);
      else target := greatest(coalesce((p_rule->>'count')::int, 1), 1); end if;
      if coalesce(v_total, 0) = 0 then cur := 0; end if;
    end if;

  elsif v_kind = 'prog_days' then
    select count(*)::int into cur from (
      select (sp.completed_at at time zone 'utc')::date from public.step_progress sp
        join public.lessons l on l.id = sp.lesson_id
        where sp.user_id = p_user and l.program_id = v_prog
      union
      select (t.started_at at time zone 'utc')::date from public.training_sessions t
        where t.user_id = p_user and t.program_id = v_prog) d;

  elsif v_kind = 'prog_streak' then
    select coalesce(max(c), 0)::int into cur from (
      select count(*) c from (
        select dd, dd - (row_number() over (order by dd))::int grp from (
          select (sp.completed_at at time zone 'utc')::date dd from public.step_progress sp
            join public.lessons l on l.id = sp.lesson_id
            where sp.user_id = p_user and l.program_id = v_prog
          union
          select (t.started_at at time zone 'utc')::date from public.training_sessions t
            where t.user_id = p_user and t.program_id = v_prog) d) g
      group by grp) x;

  elsif v_kind = 'next_step' then
    target := 1;
    select count(*) filter (where private.badge_lesson_done(p_user, l.id))::int, count(*)::int into v_done, v_total
      from public.lessons l where l.program_id = v_prog and l.page_type is null;
    v_complete := exists (select 1 from public.enrollments e where e.user_id = p_user and e.program_id = v_prog and e.completed_at is not null)
               or exists (select 1 from public.certificates c where c.user_id = p_user and c.program_id = v_prog)
               or (coalesce(v_total, 0) > 0 and v_done >= v_total);
    cur := case when v_complete and exists (
                  select 1 from public.enrollments e join public.programs p on p.id = e.program_id
                  where e.user_id = p_user and e.program_id <> v_prog and not coalesce(p.is_free, false)) then 1 else 0 end;
  else
    cur := null; target := null;
  end if;
end $$;

-- ============================================================ 2. badge_metric: 0023 body + the new kinds
create or replace function private.badge_metric(p_user uuid, p_rule jsonb, out cur int, out target int)
language plpgsql stable security definer set search_path = '' as $$
declare v_kind text := p_rule->>'kind'; v_prog uuid; v_pct numeric; m record;
begin
  cur := 0; target := greatest(coalesce((p_rule->>'count')::int, 1), 1);
  if v_kind in ('prog_lessons', 'prog_days', 'prog_streak', 'next_step') then
    select * into m from private.badge_metric_more(p_user, p_rule);
    cur := m.cur; target := m.target;
  elsif v_kind = 'first_session' then
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
    cur := null; target := null;
  end if;
end $$;

revoke all on function private.badge_lesson_done(uuid, uuid), private.badge_sections(uuid, jsonb),
  private.badge_metric_more(uuid, jsonb), private.badge_metric(uuid, jsonb) from public, anon, authenticated;

-- ============================================================ 3. Definitions
-- Program-family badges that pre-date 0023 get clearer descriptions (no blank or terse copy anywhere).
update public.badges set description = 'Finish the On Ramp phase of Kettlebell Lifestyle.' where id = 'on-ramp';
update public.badges set description = 'Finish Phase 1 of Kettlebell Lifestyle.' where id = 'phase-1';
update public.badges set description = 'Finish Phase 2 of Kettlebell Lifestyle.' where id = 'phase-2';
update public.badges set description = 'Finish Phase 3 of Kettlebell Lifestyle.' where id = 'phase-3';
update public.badges set description = 'Complete Level I (Beginner) of Kettlebell Lifestyle.' where id = 'level-1';
update public.badges set description = 'Complete Level II (Intermediate) of Kettlebell Lifestyle.' where id = 'level-2';
-- Every badge has a description and a family-appropriate icon.
update public.badges set description = name || '.' where nullif(btrim(description), '') is null;
update public.badges set icon = case family when 'program' then 'trophy' when 'mastery' then 'target' when 'explorer' then 'compass'
                                            when 'mike' then 'sparkles' else 'flame' end
  where icon is null;

-- Re-order KBL's legacy badges into the program block.
update public.badges set position = 602 where id = 'on-ramp';
update public.badges set position = 603 where id = 'phase-1';
update public.badges set position = 604 where id = 'phase-2';
update public.badges set position = 605 where id = 'phase-3';
update public.badges set position = 607 where id = 'level-1';
update public.badges set position = 608 where id = 'level-2';

with defs(id, slug, color, name, description, tier, icon, rule, points, pos) as (values
  -- Kettlebell Lifestyle (per level: On Ramp → Phase 1/2/3 → Level; both levels)
  ('prog-kettlebell-lifestyle-start', 'kettlebell-lifestyle', '#E2551F', 'Started', 'You started Kettlebell Lifestyle.', 'bronze', 'sparkles', '{"kind":"program","program":"kettlebell-lifestyle","stage":"start"}', 25, 600),
  ('kbl-first-session', 'kettlebell-lifestyle', '#E2551F', 'First Session', 'Complete your first Kettlebell Lifestyle day.', 'bronze', 'kettlebell', '{"kind":"prog_lessons","program":"kettlebell-lifestyle","count":1}', 25, 601),
  ('kbl-streak-7', 'kettlebell-lifestyle', '#E2551F', 'Seven Straight', 'Train Kettlebell Lifestyle 7 days in a row.', 'silver', 'flame', '{"kind":"prog_streak","program":"kettlebell-lifestyle","days":7}', 100, 606),
  ('prog-kettlebell-lifestyle-halfway', 'kettlebell-lifestyle', '#E2551F', 'Halfway', 'Halfway through your Kettlebell Lifestyle level.', 'silver', 'compass', '{"kind":"program","program":"kettlebell-lifestyle","stage":"halfway"}', 100, 609),
  ('prog-kettlebell-lifestyle-complete', 'kettlebell-lifestyle', '#E2551F', 'Finished', 'You finished Kettlebell Lifestyle.', 'gold', 'trophy', '{"kind":"program","program":"kettlebell-lifestyle","stage":"complete"}', 300, 610),
  ('kbl-both-levels', 'kettlebell-lifestyle', '#E2551F', 'Both Levels', 'Complete Level I and Level II — every phase, every day.', 'platinum', 'mountain', '{"kind":"prog_lessons","program":"kettlebell-lifestyle","all":true}', 500, 611),

  -- Athleticism 4 Life (Getting Started → Weeks 1–2 Foundations → Weeks 3–4 Performance Integration → Final Days)
  ('prog-athleticism-4-life-start', 'athleticism-4-life', '#1F9D6A', 'Started', 'You started Athleticism 4 Life.', 'bronze', 'sparkles', '{"kind":"program","program":"athleticism-4-life","stage":"start"}', 25, 620),
  ('a4l-first-day', 'athleticism-4-life', '#1F9D6A', 'First Day', 'Complete your first Athleticism 4 Life day.', 'bronze', 'kettlebell', '{"kind":"prog_lessons","program":"athleticism-4-life","titles":["Getting Started","Week %"],"count":1}', 25, 621),
  ('a4l-week-1', 'athleticism-4-life', '#1F9D6A', 'Week 1 Done', 'Finish every day of Week 1: Foundations.', 'bronze', 'calendar', '{"kind":"prog_lessons","program":"athleticism-4-life","titles":["Week 1:%"],"all":true}', 50, 622),
  ('a4l-first-workout', 'athleticism-4-life', '#1F9D6A', 'First Workout Logged', 'Log your first full workout from the Workouts library.', 'bronze', 'dumbbell', '{"kind":"prog_lessons","program":"athleticism-4-life","titles":["Workout %","Preparation Workout%"],"count":1}', 25, 623),
  ('a4l-perfect-week', 'athleticism-4-life', '#1F9D6A', 'Perfect Week', 'Every day of one training week, done.', 'silver', 'star', '{"kind":"prog_lessons","program":"athleticism-4-life","titles":["Week %"],"any_section":true}', 100, 624),
  ('a4l-block-1', 'athleticism-4-life', '#1F9D6A', 'Block 1: Foundations', 'Finish Weeks 1 and 2 — the Foundations block.', 'silver', 'target', '{"kind":"prog_lessons","program":"athleticism-4-life","titles":["Week 1:%","Week 2:%"],"all":true}', 150, 625),
  ('prog-athleticism-4-life-halfway', 'athleticism-4-life', '#1F9D6A', 'Halfway', 'Halfway through Athleticism 4 Life.', 'silver', 'compass', '{"kind":"program","program":"athleticism-4-life","stage":"halfway"}', 100, 626),
  ('a4l-block-2', 'athleticism-4-life', '#1F9D6A', 'Block 2: Performance', 'Finish Weeks 3 and 4 — Performance Integration.', 'gold', 'bolt', '{"kind":"prog_lessons","program":"athleticism-4-life","titles":["Week 3:%","Week 4:%"],"all":true}', 200, 627),
  ('prog-athleticism-4-life-complete', 'athleticism-4-life', '#1F9D6A', 'Finished', 'You finished Athleticism 4 Life.', 'gold', 'trophy', '{"kind":"program","program":"athleticism-4-life","stage":"complete"}', 300, 628),

  -- Mastering the Kettlebell (tiers by section block)
  ('prog-mastering-the-kettlebell-start', 'mastering-the-kettlebell', '#1A85D6', 'Started', 'You started Mastering the Kettlebell.', 'bronze', 'sparkles', '{"kind":"program","program":"mastering-the-kettlebell","stage":"start"}', 25, 640),
  ('mtk-first-lesson', 'mastering-the-kettlebell', '#1A85D6', 'First Lesson', 'Complete your first Mastering the Kettlebell lesson.', 'bronze', 'kettlebell', '{"kind":"prog_lessons","program":"mastering-the-kettlebell","count":1}', 25, 641),
  ('mtk-foundations', 'mastering-the-kettlebell', '#1A85D6', 'Foundations Mastered', 'Finish Starting Up and Grips and Positions.', 'silver', 'target', '{"kind":"prog_lessons","program":"mastering-the-kettlebell","ranges":[[2,3]],"all":true}', 100, 642),
  ('mtk-streak-7', 'mastering-the-kettlebell', '#1A85D6', 'Plan Streak', 'Practise Mastering the Kettlebell 7 days in a row.', 'silver', 'flame', '{"kind":"prog_streak","program":"mastering-the-kettlebell","days":7}', 100, 643),
  ('mtk-grinds', 'mastering-the-kettlebell', '#1A85D6', 'Grinds Mastered', 'Deadlift, squat, lunge and row — every lesson done.', 'gold', 'dumbbell', '{"kind":"prog_lessons","program":"mastering-the-kettlebell","ranges":[[4,8],[37,48]],"all":true}', 250, 644),
  ('prog-mastering-the-kettlebell-halfway', 'mastering-the-kettlebell', '#1A85D6', 'Halfway', 'Halfway through Mastering the Kettlebell.', 'silver', 'compass', '{"kind":"program","program":"mastering-the-kettlebell","stage":"halfway"}', 100, 645),
  ('mtk-ballistics', 'mastering-the-kettlebell', '#1A85D6', 'Ballistics Mastered', 'Swing, clean and snatch — every lesson done.', 'gold', 'bolt', '{"kind":"prog_lessons","program":"mastering-the-kettlebell","ranges":[[9,26]],"all":true}', 250, 646),
  ('mtk-overhead', 'mastering-the-kettlebell', '#1A85D6', 'Overhead Mastered', 'Press, jerk, get-up and windmill — every lesson done.', 'gold', 'mountain', '{"kind":"prog_lessons","program":"mastering-the-kettlebell","ranges":[[27,36]],"all":true}', 250, 647),
  ('prog-mastering-the-kettlebell-complete', 'mastering-the-kettlebell', '#1A85D6', 'Finished', 'You finished Mastering the Kettlebell.', 'gold', 'trophy', '{"kind":"program","program":"mastering-the-kettlebell","stage":"complete"}', 300, 648),

  -- Working-In (a practice: counted in days practised)
  ('prog-working-in-start', 'working-in', '#7A5BC7', 'Started', 'You started Working-In.', 'bronze', 'sparkles', '{"kind":"program","program":"working-in","stage":"start"}', 25, 660),
  ('wi-practice-1', 'working-in', '#7A5BC7', 'First Practice', 'Do your first Working-In practice.', 'bronze', 'heart', '{"kind":"prog_days","program":"working-in","count":1}', 25, 661),
  ('wi-practice-7', 'working-in', '#7A5BC7', 'Seven Practices', 'Practise Working-In on 7 different days.', 'silver', 'calendar', '{"kind":"prog_days","program":"working-in","count":7}', 100, 662),
  ('prog-working-in-halfway', 'working-in', '#7A5BC7', 'Halfway', 'Halfway through Working-In.', 'silver', 'compass', '{"kind":"program","program":"working-in","stage":"halfway"}', 100, 663),
  ('wi-practice-21', 'working-in', '#7A5BC7', 'Twenty-One Practices', 'Practise Working-In on 21 different days — a habit now.', 'gold', 'flame', '{"kind":"prog_days","program":"working-in","count":21}', 250, 664),
  ('prog-working-in-complete', 'working-in', '#7A5BC7', 'Finished', 'You finished Working-In.', 'gold', 'trophy', '{"kind":"program","program":"working-in","stage":"complete"}', 300, 665),

  -- The Path to Inspired Action (10 weeks of reflections)
  ('prog-the-path-to-inspired-action-start', 'the-path-to-inspired-action', '#C2410C', 'Started', 'You started The Path.', 'bronze', 'sparkles', '{"kind":"program","program":"the-path-to-inspired-action","stage":"start"}', 25, 680),
  ('path-first-reflection', 'the-path-to-inspired-action', '#C2410C', 'First Reflection', 'Complete your first reflection on The Path.', 'bronze', 'book', '{"kind":"prog_lessons","program":"the-path-to-inspired-action","count":1}', 25, 681),
  ('path-week-1', 'the-path-to-inspired-action', '#C2410C', 'Week 1 Reflected', 'Finish every reflection in Week 1.', 'bronze', 'calendar', '{"kind":"prog_lessons","program":"the-path-to-inspired-action","titles":["Week 1"],"all":true}', 50, 682),
  ('prog-the-path-to-inspired-action-halfway', 'the-path-to-inspired-action', '#C2410C', 'Halfway', 'Halfway through The Path.', 'silver', 'compass', '{"kind":"program","program":"the-path-to-inspired-action","stage":"halfway"}', 100, 683),
  ('path-streak-7', 'the-path-to-inspired-action', '#C2410C', 'Seven Days of Action', 'Show up on The Path 7 days in a row.', 'silver', 'flame', '{"kind":"prog_streak","program":"the-path-to-inspired-action","days":7}', 100, 684),
  ('path-all-reflections', 'the-path-to-inspired-action', '#C2410C', 'All Reflections', 'Every reflection across all 10 weeks, done.', 'gold', 'star', '{"kind":"prog_lessons","program":"the-path-to-inspired-action","titles":["Week %"],"all":true}', 250, 685),
  ('prog-the-path-to-inspired-action-complete', 'the-path-to-inspired-action', '#C2410C', 'Finished', 'You finished The Path.', 'gold', 'trophy', '{"kind":"program","program":"the-path-to-inspired-action","stage":"complete"}', 300, 686),

  -- Men of Movement (retreat prep: the Start Here pillars)
  ('prog-men-of-movement-start', 'men-of-movement', '#2F4B72', 'Started', 'You started Men of Movement.', 'bronze', 'sparkles', '{"kind":"program","program":"men-of-movement","stage":"start"}', 25, 700),
  ('mom-pillar-1', 'men-of-movement', '#2F4B72', 'First Pillar', 'Watch your first Men of Movement pillar.', 'bronze', 'book', '{"kind":"prog_lessons","program":"men-of-movement","titles":["Start Here"],"count":1}', 25, 701),
  ('prog-men-of-movement-halfway', 'men-of-movement', '#2F4B72', 'Halfway', 'Halfway through Men of Movement.', 'silver', 'compass', '{"kind":"program","program":"men-of-movement","stage":"halfway"}', 100, 702),
  ('mom-pillars-4', 'men-of-movement', '#2F4B72', 'Four Pillars', 'Watch four of the Men of Movement pillars.', 'silver', 'people', '{"kind":"prog_lessons","program":"men-of-movement","titles":["Start Here"],"count":4}', 100, 703),
  ('mom-all-pillars', 'men-of-movement', '#2F4B72', 'Every Pillar', 'Every pillar watched — ready for the mountain.', 'gold', 'mountain', '{"kind":"prog_lessons","program":"men-of-movement","titles":["Start Here"],"all":true}', 250, 704),
  ('prog-men-of-movement-complete', 'men-of-movement', '#2F4B72', 'Finished', 'You finished Men of Movement.', 'gold', 'trophy', '{"kind":"program","program":"men-of-movement","stage":"complete"}', 300, 705),

  -- What Your Kettlebell Swing Is Missing
  ('prog-what-your-kettlebell-swing-is-missing-start', 'what-your-kettlebell-swing-is-missing', '#B8860B', 'Started', 'You started the Swing series.', 'bronze', 'sparkles', '{"kind":"program","program":"what-your-kettlebell-swing-is-missing","stage":"start"}', 25, 720),
  ('swing-step-1', 'what-your-kettlebell-swing-is-missing', '#B8860B', 'First Step', 'Complete the first of the 7 swing steps.', 'bronze', 'kettlebell', '{"kind":"prog_lessons","program":"what-your-kettlebell-swing-is-missing","titles":["7 Steps"],"count":1}', 25, 721),
  ('prog-what-your-kettlebell-swing-is-missing-halfway', 'what-your-kettlebell-swing-is-missing', '#B8860B', 'Halfway', 'Halfway through the Swing series.', 'silver', 'compass', '{"kind":"program","program":"what-your-kettlebell-swing-is-missing","stage":"halfway"}', 100, 722),
  ('swing-7-steps', 'what-your-kettlebell-swing-is-missing', '#B8860B', 'All 7 Steps', 'Every one of the 7 swing steps, done.', 'silver', 'target', '{"kind":"prog_lessons","program":"what-your-kettlebell-swing-is-missing","titles":["7 Steps"],"all":true}', 100, 723),
  ('swing-two-week', 'what-your-kettlebell-swing-is-missing', '#B8860B', 'Two-Week Swing Plan', 'Open the bonus two-week swing program.', 'silver', 'calendar', '{"kind":"prog_lessons","program":"what-your-kettlebell-swing-is-missing","titles":["Bonus 3%"],"count":1}', 50, 724),
  ('prog-what-your-kettlebell-swing-is-missing-complete', 'what-your-kettlebell-swing-is-missing', '#B8860B', 'Finished', 'You finished the Swing series.', 'gold', 'trophy', '{"kind":"program","program":"what-your-kettlebell-swing-is-missing","stage":"complete"}', 300, 725),
  ('swing-next-step', 'what-your-kettlebell-swing-is-missing', '#B8860B', 'Next Step Taken', 'Finished the Swing series and joined a full program.', 'gold', 'flag', '{"kind":"next_step","program":"what-your-kettlebell-swing-is-missing"}', 200, 726),

  -- Free 6-video mini series
  ('prog-free-6-video-kettlebell-mini-series-start', 'free-6-video-kettlebell-mini-series', '#0E7490', 'Started', 'You started the Mini Series.', 'bronze', 'sparkles', '{"kind":"program","program":"free-6-video-kettlebell-mini-series","stage":"start"}', 25, 740),
  ('mini-first-video', 'free-6-video-kettlebell-mini-series', '#0E7490', 'First Video', 'Finish the first Mini Series video.', 'bronze', 'kettlebell', '{"kind":"prog_lessons","program":"free-6-video-kettlebell-mini-series","count":1}', 25, 741),
  ('prog-free-6-video-kettlebell-mini-series-halfway', 'free-6-video-kettlebell-mini-series', '#0E7490', 'Halfway', 'Halfway through the Mini Series.', 'silver', 'compass', '{"kind":"program","program":"free-6-video-kettlebell-mini-series","stage":"halfway"}', 100, 742),
  ('prog-free-6-video-kettlebell-mini-series-complete', 'free-6-video-kettlebell-mini-series', '#0E7490', 'Finished', 'You finished the Mini Series.', 'gold', 'trophy', '{"kind":"program","program":"free-6-video-kettlebell-mini-series","stage":"complete"}', 300, 743),
  ('mini-streak-3', 'free-6-video-kettlebell-mini-series', '#0E7490', 'Three in a Row', 'Watch the Mini Series 3 days in a row.', 'bronze', 'flame', '{"kind":"prog_streak","program":"free-6-video-kettlebell-mini-series","days":3}', 50, 744),
  ('mini-next-step', 'free-6-video-kettlebell-mini-series', '#0E7490', 'Next Step Taken', 'Finished the Mini Series and joined a full program.', 'gold', 'flag', '{"kind":"next_step","program":"free-6-video-kettlebell-mini-series"}', 200, 745),

  -- Kettlebell Roadmap
  ('prog-kettlebell-roadmap-start', 'kettlebell-roadmap', '#64748B', 'Started', 'You started the Kettlebell Roadmap.', 'bronze', 'sparkles', '{"kind":"program","program":"kettlebell-roadmap","stage":"start"}', 25, 760),
  ('roadmap-phase-1', 'kettlebell-roadmap', '#64748B', 'The Foundation', 'Finish Phase 1 of the Roadmap.', 'bronze', 'compass', '{"kind":"prog_lessons","program":"kettlebell-roadmap","titles":["Phase 1%"],"all":true}', 25, 761),
  ('roadmap-all-phases', 'kettlebell-roadmap', '#64748B', 'Whole Roadmap', 'All four Roadmap phases read.', 'silver', 'mountain', '{"kind":"prog_lessons","program":"kettlebell-roadmap","titles":["Phase %"],"all":true}', 100, 762),
  ('prog-kettlebell-roadmap-complete', 'kettlebell-roadmap', '#64748B', 'Finished', 'You finished the Kettlebell Roadmap.', 'gold', 'trophy', '{"kind":"program","program":"kettlebell-roadmap","stage":"complete"}', 300, 763),
  ('roadmap-next-step', 'kettlebell-roadmap', '#64748B', 'Next Step Taken', 'Finished the Roadmap and joined a full program.', 'gold', 'flag', '{"kind":"next_step","program":"kettlebell-roadmap"}', 200, 764)
)
insert into public.badges (id, name, description, tier, icon, rule, points, position, family, program_id, medal_color)
select d.id, d.name, d.description, d.tier, d.icon, d.rule::jsonb, d.points, d.pos, 'program', private.resolve_program(d.slug), d.color
from defs d
where private.resolve_program(d.slug) is not null
on conflict (id) do update set name = excluded.name, description = excluded.description, tier = excluded.tier, icon = excluded.icon,
  rule = excluded.rule, points = excluded.points, position = excluded.position, family = excluded.family,
  program_id = excluded.program_id, medal_color = excluded.medal_color;

-- Roadmap finish carries the same next-program reward as the others.
update public.badges set perk = jsonb_build_object('kind', 'discount', 'percent', 20, 'label', '20% off your next program',
    'detail', 'For finishing the Kettlebell Roadmap. One use, 90 days.', 'href', '/programs', 'applies', jsonb_build_array('program'))
  where id = 'prog-kettlebell-roadmap-complete' and perk is null;

-- ============================================================ 4. Backfill (idempotent; awards only, never removes)
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

-- Stage medals keep the program in their name (toasts and the rewards page show them out of context).
update public.badges b set name = (case when b.id like '%-start' then 'Started' when b.id like '%-halfway' then 'Halfway' else 'Finished' end)
    || ' · ' || m.short
  from (values ('kettlebell-lifestyle', 'Kettlebell Lifestyle'), ('mastering-the-kettlebell', 'Mastering the Kettlebell'),
               ('athleticism-4-life', 'Athleticism 4 Life'), ('working-in', 'Working-In'), ('the-path-to-inspired-action', 'The Path'),
               ('men-of-movement', 'Men of Movement'), ('what-your-kettlebell-swing-is-missing', 'the Swing series'),
               ('free-6-video-kettlebell-mini-series', 'the Mini Series'), ('kettlebell-roadmap', 'the Roadmap')) m(slug, short)
  where b.id in ('prog-' || m.slug || '-start', 'prog-' || m.slug || '-halfway', 'prog-' || m.slug || '-complete');
