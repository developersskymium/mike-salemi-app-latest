-- Mike Salemi App v2 — 0025: one schedule + one training profile (spec 11, client feedback #1). Additive only.
--
-- 1. training_profiles: one row per member with the answers every intake shares (goal, days a week,
--    training weekdays, session length, equipment, bell weights, kettlebell experience/level,
--    limitations). Intakes prefill from it and write back to it. Backfilled from the latest
--    intake answers already on file (nothing is lost; intake_responses stay the history).
-- 2. save_training_profile(p_patch, p_source): the only write path (whitelisted keys, merge).
-- 3. One schedule: plan_items of every active member plan ARE the main schedule. Programs feed it.
--    schedule_conflicts(p_from) lists days with more than one main session;
--    resolve_schedule_conflicts(p_plan, p_mode) moves a plan's clashing sessions to the next free day
--    ('next_free') or records that the member keeps both ('keep').
-- 4. schedule_mtk_plan(p_mtk_plan, p_days, p_starts_on): puts an MTK learning plan (previously
--    unscheduled) onto the main schedule as a member plan, one session per learning day.

-- ================================================================= 1. training_profiles
create table if not exists public.training_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- {goal_kind, target_date, days_per_week, training_days[], session_minutes, equipment[], bell_weights,
  --  kb_experience (0 new … 3 advanced), kb_level, focus_areas[], limitations}
  data jsonb not null default '{}'::jsonb,
  -- key → source form key ('goal-setting', 'a4l-intake', 'profile', …)
  sources jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.training_profiles enable row level security;
revoke all on public.training_profiles from anon, authenticated;
grant select on public.training_profiles to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_profiles' and policyname = 'own_read') then
    create policy own_read on public.training_profiles for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_profiles' and policyname = 'admin_all') then
    create policy admin_all on public.training_profiles for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- ================================================================= 2. save_training_profile
create or replace function public.save_training_profile(p_patch jsonb, p_source text default 'profile')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_keys text[] := array['goal_kind','target_date','days_per_week','training_days','session_minutes','equipment','bell_weights',
                         'kb_experience','kb_level','focus_areas','limitations'];
  v_clean jsonb := '{}'::jsonb; v_src jsonb := '{}'::jsonb; k text; v jsonb; v_out jsonb;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if jsonb_typeof(coalesce(p_patch, '{}'::jsonb)) <> 'object' then raise exception 'bad profile'; end if;
  for k, v in select * from jsonb_each(coalesce(p_patch, '{}'::jsonb)) loop
    continue when not (k = any (v_keys));
    continue when v is null or v = 'null'::jsonb;
    if length(v::text) > 1200 then raise exception 'value too long: %', k; end if;
    v_clean := v_clean || jsonb_build_object(k, v);
    v_src := v_src || jsonb_build_object(k, left(coalesce(p_source, 'profile'), 64));
  end loop;
  insert into public.training_profiles as t (user_id, data, sources, updated_at)
    values (v_user, v_clean, v_src, now())
  on conflict (user_id) do update set data = t.data || excluded.data, sources = t.sources || excluded.sources, updated_at = now()
  returning data into v_out;
  return v_out;
end $$;
revoke all on function public.save_training_profile(jsonb, text) from public, anon;
grant execute on function public.save_training_profile(jsonb, text) to authenticated;

-- Backfill (migrate forward): the shared answers members already gave, latest intake wins per key.
with latest as (
  select distinct on (r.user_id, f.key) r.user_id, f.key, r.answers, r.created_at
  from public.intake_responses r join public.intake_forms f on f.id = r.form_id
  order by r.user_id, f.key, r.created_at desc
), parts as (
  select user_id, created_at, key,
    jsonb_strip_nulls(jsonb_build_object(
      'goal_kind', case when key = 'goal-setting' then answers->>'goal_kind' end,
      'target_date', case when key = 'goal-setting' then nullif(answers->>'target_date', '') end,
      'days_per_week', case
        when key = 'goal-setting' and (answers->>'days_per_week') ~ '^\d$' then to_jsonb((answers->>'days_per_week')::int)
        when (answers->>'days') ~ '^\d' then to_jsonb(substring(answers->>'days' from '^(\d)')::int)
        when answers->>'days' = 'Every day' then to_jsonb(7) end,
      'session_minutes', case when key = 'goal-setting' and (answers->>'session_length') ~ '^\d+$' then to_jsonb((answers->>'session_length')::int) end,
      'equipment', case when key = 'goal-setting' and jsonb_typeof(answers->'equipment') = 'array' then answers->'equipment' end,
      'limitations', coalesce(nullif(answers->>'injuries', ''), nullif(answers->>'constraints', '')),
      'kb_level', case when key = 'kbl-intake' then answers->>'kettlebell_level' end,
      'focus_areas', case when key = 'kbl-intake' and jsonb_typeof(answers->'focus_areas') = 'array' then answers->'focus_areas' end
    )) as d
  from latest
), merged as (
  select user_id, jsonb_object_agg(e.key, e.value) as data, jsonb_object_agg(e.key, to_jsonb(p.key)) as sources
  from (select * from parts order by created_at) p, jsonb_each(p.d) e
  group by user_id
)
insert into public.training_profiles (user_id, data, sources)
select user_id, data, sources from merged
on conflict (user_id) do nothing;

-- ================================================================= 3. one schedule: conflicts
-- Days (from p_from) where the member has more than one main session (training/recovery) across active plans.
create or replace function public.schedule_conflicts(p_from date default current_date)
returns table (on_date date, items int, plan_ids uuid[]) language sql stable security definer set search_path = '' as $$
  select i.on_date, count(*)::int, array_agg(distinct i.plan_id)
  from public.plan_items i join public.member_plans p on p.id = i.plan_id
  where i.user_id = (select auth.uid()) and p.status = 'active' and i.kind <> 'rest'
    and i.on_date >= coalesce(p_from, current_date) and i.done_at is null and i.skipped_at is null
  group by i.on_date having count(*) > 1 and count(distinct i.plan_id) > 1
  order by i.on_date;
$$;
revoke all on function public.schedule_conflicts(date) from public, anon;
grant execute on function public.schedule_conflicts(date) to authenticated;

-- 'next_free': each of the plan's open sessions on a clashing day moves to the next day with no main
-- session (the plan's order is kept; later sessions of the same plan shift along only if they clash).
-- 'keep': the member keeps both; stored on the plan so the app stops asking.
create or replace function public.resolve_schedule_conflicts(p_plan uuid, p_mode text default 'next_free')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_moved int := 0; r record; v_day date;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.member_plans where id = p_plan and user_id = v_user) then raise exception 'plan not found'; end if;
  if p_mode = 'keep' then
    update public.member_plans set inputs = inputs || '{"conflicts":"keep"}'::jsonb where id = p_plan;
    return jsonb_build_object('mode', 'keep', 'moved', 0);
  end if;
  if p_mode <> 'next_free' then raise exception 'unknown mode'; end if;
  for r in
    select i.id, i.on_date from public.plan_items i
    where i.plan_id = p_plan and i.kind <> 'rest' and i.done_at is null and i.skipped_at is null and i.on_date >= current_date
    order by i.on_date, i.position
  loop
    if exists (
      select 1 from public.plan_items o join public.member_plans p on p.id = o.plan_id
      where o.user_id = v_user and p.status = 'active' and o.plan_id <> p_plan and o.kind <> 'rest' and o.on_date = r.on_date
    ) then
      v_day := r.on_date + 1;
      while exists (
        select 1 from public.plan_items o join public.member_plans p on p.id = o.plan_id
        where o.user_id = v_user and p.status = 'active' and o.kind <> 'rest' and o.on_date = v_day and o.id <> r.id
      ) and v_day < r.on_date + 60 loop
        v_day := v_day + 1;
      end loop;
      update public.plan_items set on_date = v_day where id = r.id;
      v_moved := v_moved + 1;
    end if;
  end loop;
  update public.member_plans set inputs = inputs - 'conflicts' where id = p_plan;
  return jsonb_build_object('mode', 'next_free', 'moved', v_moved);
end $$;
revoke all on function public.resolve_schedule_conflicts(uuid, text) from public, anon;
grant execute on function public.resolve_schedule_conflicts(uuid, text) to authenticated;

-- ================================================================= 4. MTK plan → main schedule
-- p_days: training weekdays (0 = Sunday). One session per MTK learning day, in plan order, on those
-- weekdays from p_starts_on; any earlier MTK schedule for the same MTK plan is archived (kept).
create or replace function public.schedule_mtk_plan(p_mtk_plan uuid, p_days int[], p_starts_on date default current_date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_mtk record; v_plan uuid; v_day date; d jsonb; v_pos int := 0; v_lesson uuid;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if p_days is null or cardinality(p_days) = 0 or exists (select 1 from unnest(p_days) x where x < 0 or x > 6) then raise exception 'choose training days'; end if;
  select * into v_mtk from public.mtk_plans where id = p_mtk_plan and user_id = v_user and status = 'active';
  if v_mtk.id is null then raise exception 'plan not found'; end if;
  update public.member_plans set status = 'archived'
    where user_id = v_user and status = 'active' and inputs->>'mtk_plan_id' = p_mtk_plan::text;
  insert into public.member_plans (user_id, name, source, status, starts_on, inputs, overview)
    values (v_user, 'Mastering the Kettlebell · My plan', 'custom', 'active', coalesce(p_starts_on, current_date),
            jsonb_build_object('kind', 'mtk', 'mtk_plan_id', p_mtk_plan, 'program_id', v_mtk.program_id, 'days', to_jsonb(p_days)),
            v_mtk.result->>'summary')
    returning id into v_plan;
  v_day := coalesce(p_starts_on, current_date);
  for d in select * from jsonb_array_elements(v_mtk.days) loop
    while not (extract(dow from v_day)::int = any (p_days)) loop v_day := v_day + 1; end loop;
    v_lesson := nullif(d->'lesson_ids'->>0, '')::uuid;
    insert into public.plan_items (plan_id, user_id, on_date, kind, lesson_id, title, note, position)
      values (v_plan, v_user, v_day, 'training', v_lesson, coalesce(d->>'title', 'MTK learning day'),
              case when jsonb_array_length(coalesce(d->'lesson_ids', '[]'::jsonb)) > 1 then jsonb_array_length(d->'lesson_ids') || ' lessons' end, v_pos);
    v_pos := v_pos + 1;
    v_day := v_day + 1;
  end loop;
  return v_plan;
end $$;
revoke all on function public.schedule_mtk_plan(uuid, int[], date) from public, anon;
grant execute on function public.schedule_mtk_plan(uuid, int[], date) to authenticated;
