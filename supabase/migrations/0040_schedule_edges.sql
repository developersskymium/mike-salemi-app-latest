-- 0040 Schedule edge cases: sessions of programs the member can no longer open (plan lapsed, grant ended).
-- Additive: same signatures and grants; existing callers keep working.
--   1. reminder_candidates: each of today's items carries `locked`; the web app (lib/email/reminders.ts) never
--      reminds about locked items. next_up skips locked items.
--   2. apply_missed_day_rule: locked sessions are not counted as missed (they are not the member's to do now).
--   3. locked_program_slugs(user): programs on the member's active plans they can no longer open, for the
--      token-protected calendar subscribe feed (service role only).

create or replace function public.reminder_candidates(p_now timestamp with time zone default now())
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with base as (
    select u.id as user_id, u.email,
           coalesce(nullif(p.first_name, ''), split_part(coalesce(p.display_name, ''), ' ', 1)) as first_name,
           case when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p.timezone) then p.timezone else 'UTC' end as tz,
           np.user_id is not null as has_prefs,
           np.email_enabled, np.push_enabled, np.in_app_enabled, np.reminders_enabled, np.frequency,
           np.reminder_time, np.reminder_days, np.reminder_times, np.quiet_start, np.quiet_end,
           np.streak_nudge, np.weekly_recap, np.snoozed_until, np.skip_date
    from auth.users u
    join public.profiles p on p.id = u.id
    left join public.notification_prefs np on np.user_id = u.id
    where u.email is not null
      and (np.user_id is not null
           or exists (select 1 from public.member_plans m where m.user_id = u.id and m.status = 'active')
           or exists (select 1 from public.enrollments e where e.user_id = u.id and e.completed_at is null and e.last_active_at > p_now - interval '60 days'))
  ), clock as (
    select b.*, (p_now at time zone b.tz) as local_ts, (p_now at time zone b.tz)::date as local_date from base b
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', c.user_id, 'email', c.email, 'first_name', nullif(c.first_name, ''), 'tz', c.tz,
    'local_date', c.local_date, 'local_time', to_char(c.local_ts, 'HH24:MI'), 'local_dow', extract(dow from c.local_ts)::int,
    'prefs', jsonb_build_object(
      'has_row', c.has_prefs,
      'email_enabled', coalesce(c.email_enabled, true), 'push_enabled', coalesce(c.push_enabled, false),
      'in_app_enabled', coalesce(c.in_app_enabled, true), 'reminders_enabled', coalesce(c.reminders_enabled, true),
      'frequency', coalesce(c.frequency, 'custom_days'), 'reminder_time', to_char(coalesce(c.reminder_time, '07:00'::time), 'HH24:MI'),
      'reminder_days', to_jsonb(coalesce(c.reminder_days, '{1,2,3,4,5}'::int[])), 'reminder_times', coalesce(c.reminder_times, '{}'::jsonb),
      'quiet_start', to_char(c.quiet_start, 'HH24:MI'), 'quiet_end', to_char(c.quiet_end, 'HH24:MI'),
      'streak_nudge', coalesce(c.streak_nudge, true), 'weekly_recap', coalesce(c.weekly_recap, true),
      'snoozed_until', c.snoozed_until, 'skip_date', c.skip_date),
    'today_items', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'title', coalesce(l.title, i.title, 'Training'), 'kind', i.kind, 'lesson_id', i.lesson_id,
                                          'program_slug', pr.slug, 'program_name', pr.name, 'minutes', l.estimated_minutes, 'done', i.done_at is not null,
                                          'plan_name', m.name,
                                          'locked', (l.program_id is not null and not private.has_access(c.user_id, l.program_id, 'content'))) order by i.position)
      from public.plan_items i join public.member_plans m on m.id = i.plan_id and m.status = 'active'
      left join public.lessons l on l.id = i.lesson_id left join public.programs pr on pr.id = l.program_id
      where i.user_id = c.user_id and i.on_date = c.local_date and i.kind <> 'rest' and i.skipped_at is null), '[]'::jsonb),
    'has_active_plan', exists (select 1 from public.member_plans m where m.user_id = c.user_id and m.status = 'active'),
    'enrollment', (
      select jsonb_build_object('program_name', pr.name, 'program_slug', pr.slug)
      from public.enrollments e join public.programs pr on pr.id = e.program_id
      where e.user_id = c.user_id and e.completed_at is null order by e.last_active_at desc limit 1),
    'streak', private.member_streak(c.user_id),
    'last_active', (select max((sp.completed_at at time zone c.tz)::date) from public.step_progress sp where sp.user_id = c.user_id),
    'week', jsonb_build_object(
      'days', (select count(distinct (sp.completed_at at time zone c.tz)::date) from public.step_progress sp
               where sp.user_id = c.user_id and sp.completed_at > p_now - interval '7 days'),
      'lessons', (select count(distinct sp.lesson_id) from public.step_progress sp
                  where sp.user_id = c.user_id and sp.completed_at > p_now - interval '7 days'),
      'minutes', (select coalesce(sum(ts.minutes), 0) from public.training_sessions ts
                  where ts.user_id = c.user_id and ts.started_at > p_now - interval '7 days'),
      'badges', coalesce((select jsonb_agg(b.name order by mb.earned_at) from public.member_badges mb join public.badges b on b.id = mb.badge_id
                          where mb.user_id = c.user_id and mb.earned_at > p_now - interval '7 days'), '[]'::jsonb)),
    'next_up', (
      select jsonb_build_object('title', coalesce(l.title, i.title), 'on_date', i.on_date)
      from public.plan_items i join public.member_plans m on m.id = i.plan_id and m.status = 'active'
      left join public.lessons l on l.id = i.lesson_id
      where i.user_id = c.user_id and i.on_date > c.local_date and i.done_at is null and i.skipped_at is null and i.kind <> 'rest'
        and (l.program_id is null or private.has_access(c.user_id, l.program_id, 'content'))
      order by i.on_date, i.position limit 1),
    'push_count', (select count(*) from public.push_tokens t where t.user_id = c.user_id and t.platform = 'web')
  )), '[]'::jsonb)
  from clock c;
$function$;

create or replace function public.apply_missed_day_rule(p_plan uuid, p_today date default null::date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid()); v_plan record; v_rule text; v_today date; v_earliest date; v_offset int;
  v_count int := 0; v_changed int := 0; v_cursor date; v_item uuid; v_missed uuid[]; v_taken date[];
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_plan from public.member_plans where id = p_plan and user_id = v_user for update;
  if v_plan.id is null then raise exception 'plan not found'; end if;
  v_today := coalesce(p_today, private.member_today(v_user));
  v_rule := nullif(v_plan.inputs->>'missed_day_rule', '');
  if v_rule is null and v_plan.source = 'immersion_schedule' then
    select e.missed_day_rule into v_rule from public.enrollments e
      where e.id = (v_plan.inputs->>'enrollment_id')::uuid and e.user_id = v_user;
  end if;
  v_rule := coalesce(v_rule, 'shift');

  -- Missed = before today, open, a real session, not done elsewhere, and in a program the member can still open.
  select coalesce(array_agg(i.id order by i.on_date, i.position), '{}'), count(*), min(i.on_date)
    into v_missed, v_count, v_earliest
    from public.plan_items i
    left join public.lessons l on l.id = i.lesson_id
    where i.plan_id = p_plan and i.on_date < v_today and i.done_at is null and i.skipped_at is null and i.kind <> 'rest'
      and not (i.lesson_id is not null and private.lesson_done(v_user, i.lesson_id))
      and (l.program_id is null or private.has_access(v_user, l.program_id, 'content'));
  if v_count = 0 then return jsonb_build_object('rule', v_rule, 'missed', 0, 'changed', 0); end if;

  if v_rule = 'skip' then
    update public.plan_items set skipped_at = now() where id = any(v_missed);
  elsif v_rule = 'weekend' then
    select coalesce(array_agg(distinct on_date), '{}') into v_taken from public.plan_items
      where plan_id = p_plan and on_date >= v_today and skipped_at is null;
    v_cursor := v_today;
    foreach v_item in array v_missed loop
      loop
        v_cursor := v_cursor + 1;
        exit when extract(dow from v_cursor)::int in (0, 6) and not (v_cursor = any(v_taken));
      end loop;
      v_taken := v_taken || v_cursor;
      update public.plan_items set on_date = v_cursor where id = v_item;
    end loop;
  else
    v_offset := v_today - v_earliest;
    update public.plan_items set on_date = on_date + v_offset
      where plan_id = p_plan and on_date >= v_earliest and skipped_at is null;
    get diagnostics v_changed = row_count;
    return jsonb_build_object('rule', 'shift', 'missed', v_count, 'changed', v_changed, 'offset_days', v_offset);
  end if;
  return jsonb_build_object('rule', v_rule, 'missed', v_count, 'changed', v_count);
end $function$;

create or replace function public.locked_program_slugs(p_user uuid)
 returns text[]
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(array_agg(distinct pr.slug), '{}')
  from public.plan_items i
  join public.member_plans m on m.id = i.plan_id and m.status = 'active'
  join public.lessons l on l.id = i.lesson_id
  join public.programs pr on pr.id = l.program_id
  where i.user_id = p_user and not private.has_access(p_user, l.program_id, 'content');
$function$;

revoke all on function public.locked_program_slugs(uuid) from public, anon, authenticated;
grant execute on function public.locked_program_slugs(uuid) to service_role;
