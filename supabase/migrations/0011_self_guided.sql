-- Mike Salemi App v2 — advanced Self-Guided: training session log, smart next, quick and custom
-- sessions, day completions (repeats counted), notes per day, stats/heatmap, history, continue points,
-- self-guided plan builder.
-- Additive only. Members read their own rows; every write goes through the security-definer
-- functions below (and the step_progress trigger, which logs sessions automatically).
-- The pure TypeScript twins of the classification, rotation and assembly rules live in
-- packages/core/src/selfguided.ts and are tested there; keep both in step.

-- ================================================================= tables
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  path_id uuid references public.program_paths(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,      -- day/lesson sessions
  video_id uuid references public.videos(id) on delete set null,        -- library sessions
  source text not null default 'day' check (source in ('day', 'quick', 'custom', 'library', 'repeat')),
  title text not null default '',
  intent text check (intent in ('workout', 'recovery', 'skill', 'mobility', 'overview')),
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes int check (minutes is null or minutes between 0 and 600),
  readiness_result_id uuid references public.readiness_results(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 4000),
  plan jsonb not null default '[]'::jsonb,        -- quick/custom/library: [{step_id?|video_id?, lesson_id?, role, minutes, title}]
  progress jsonb not null default '{}'::jsonb,    -- {done:[item ids], active:item id, seconds:{video provider id: s}}
  planned_minutes int,
  favourite boolean not null default false,
  day_completed_at timestamptz,                   -- this session finished every required step of lesson_id
  repeat_of uuid references public.training_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists training_sessions_user_idx on public.training_sessions (user_id, started_at desc);
create index if not exists training_sessions_user_lesson_idx on public.training_sessions (user_id, lesson_id, day_completed_at);
create index if not exists training_sessions_program_idx on public.training_sessions (program_id);
create index if not exists training_sessions_path_idx on public.training_sessions (path_id);
create index if not exists training_sessions_lesson_idx on public.training_sessions (lesson_id);
create index if not exists training_sessions_video_idx on public.training_sessions (video_id);
create index if not exists training_sessions_readiness_idx on public.training_sessions (readiness_result_id);
create index if not exists training_sessions_repeat_idx on public.training_sessions (repeat_of);

create table if not exists public.day_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists day_notes_lesson_idx on public.day_notes (lesson_id);

alter table public.training_sessions enable row level security;
alter table public.day_notes enable row level security;
revoke all on public.training_sessions, public.day_notes from anon, authenticated;
grant select on public.training_sessions, public.day_notes to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_sessions' and policyname = 'own_read') then
    create policy own_read on public.training_sessions for select to authenticated
      using ((select private.can_view_member((select auth.uid()), user_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'training_sessions' and policyname = 'admin_all') then
    create policy admin_all on public.training_sessions for all to authenticated
      using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'day_notes' and policyname = 'own_read') then
    create policy own_read on public.day_notes for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'day_notes' and policyname = 'admin_all') then
    create policy admin_all on public.day_notes for all to authenticated
      using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- ================================================================= classification (mirrors core/selfguided.ts)
-- Intent of a lesson: from its authored day type; courses ('general') by keywords in the titles.
create or replace function private.sg_lesson_intent(p_day_type text, p_page_type text, p_title text, p_section text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_page_type is not null then 'overview'
    when coalesce(p_day_type, '') ~* 'overview|preparation' then 'overview'
    when coalesce(p_day_type, '') ~* 'recovery' then 'recovery'
    when coalesce(p_day_type, '') ~* 'skill' then 'skill'
    when coalesce(p_day_type, '') ~* 'workout|challenge|on ramp' then 'workout'
    when coalesce(p_title, '') ~* '^(home|intro|introduction|download|ebook pdf|playlist|book recommendations|want to learn more\?)$'
      or coalesce(p_title, '') ~* 'call recording|q ?& ?a|archive|pre-course|certification' then 'overview'
    when (coalesce(p_title, '') || ' ' || coalesce(p_section, '')) ~* 'breath|meditat|working in|recovery|energy push|rest' then 'recovery'
    when (coalesce(p_title, '') || ' ' || coalesce(p_section, '')) ~* 'mobility|stretch|flexib|halo|roll down|butterfly' then 'mobility'
    when (coalesce(p_title, '') || ' ' || coalesce(p_section, '')) ~* 'workout|program|circuit|challenge' then 'workout'
    else 'skill' end;
$$;

-- Role of a step inside an assembled session (null = not usable on its own).
create or replace function private.sg_step_role(p_kind text, p_special public.step_special, p_title text, p_section text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_special in ('readiness', 'completion', 'overview') then null
    when p_special = 'workout' or p_kind = 'workout' then 'workout'
    when p_kind = 'warmup' then 'warmup'
    when p_kind = 'mobility' then 'mobility'
    when p_kind = 'recovery' then 'recovery'
    when p_kind = 'skill' then 'skill'
    when p_kind in ('lifestyle', 'text') then null
    when coalesce(p_title, '') ~* '^(home|download|review checklist|additional resources)$|call recording|q ?& ?a|playwork' then null
    when (coalesce(p_title, '') || ' ' || coalesce(p_section, '')) ~* 'warm|pre-check|preparation' then 'warmup'
    when (coalesce(p_title, '') || ' ' || coalesce(p_section, '')) ~* 'breath|meditat|working in|recovery|energy push' then 'recovery'
    when (coalesce(p_title, '') || ' ' || coalesce(p_section, '')) ~* 'mobility|stretch|flexib|halo|roll down|butterfly' then 'mobility'
    when (coalesce(p_title, '') || ' ' || coalesce(p_section, '')) ~* 'workout|circuit' then 'workout'
    else 'skill' end;
$$;

-- Minutes of a step: "9 min" label, else video length, else a default by role.
create or replace function private.sg_step_minutes(p_label text, p_seconds int, p_role text)
returns int language sql immutable set search_path = '' as $$
  select coalesce(
    nullif(substring(coalesce(p_label, '') from '^\s*(\d+)\s*min'), '')::int,
    case when p_seconds > 0 then greatest(1, ceil(p_seconds / 60.0)::int) end,
    case p_role when 'warmup' then 6 when 'mobility' then 8 when 'recovery' then 6 when 'skill' then 8 when 'workout' then 20 else 5 end);
$$;

create or replace function private.sg_elapsed(p_from timestamptz, p_to timestamptz)
returns int language sql immutable set search_path = '' as $$
  select case when p_to is null or p_to <= p_from then 0
    else least(180, greatest(1, ceil(extract(epoch from (p_to - p_from)) / 60.0)::int)) end;
$$;

-- Minutes a session counts for (logged, or elapsed so far).
create or replace function private.sg_session_minutes(s public.training_sessions)
returns int language sql immutable set search_path = '' as $$
  select coalesce(s.minutes, private.sg_elapsed(s.started_at, s.last_activity_at));
$$;

create or replace function private.sg_tz(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select p.timezone from public.profiles p where p.id = p_user
                   and exists (select 1 from pg_catalog.pg_timezone_names n where n.name = p.timezone)), 'UTC');
$$;

-- Lessons of a path in order, with intent, done flag and completion counts for a member.
create or replace function private.sg_lessons(p_user uuid, p_program uuid, p_path uuid)
returns table (lesson_id uuid, ord bigint, key text, title text, day_number int, day_type text, page_type text,
               section_id uuid, section_title text, intent text, done boolean, completions int, last_done_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.id, row_number() over (order by s.position, l.position), l.key, l.title, l.day_number, l.day_type, l.page_type,
         s.id, s.title, private.sg_lesson_intent(l.day_type, l.page_type, l.title, s.title),
         private.lesson_done(p_user, l.id),
         (select count(*)::int from public.training_sessions t where t.user_id = p_user and t.lesson_id = l.id and t.day_completed_at is not null),
         (select max(t.day_completed_at) from public.training_sessions t where t.user_id = p_user and t.lesson_id = l.id)
  from public.lessons l join public.sections s on s.id = l.section_id
  where l.program_id = p_program and l.path_id is not distinct from p_path;
$$;

-- ================================================================= session lifecycle
create or replace function private.sg_close_stale(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.training_sessions t
     set ended_at = t.last_activity_at,
         minutes = coalesce(t.minutes, private.sg_elapsed(t.started_at, t.last_activity_at))
   where t.user_id = p_user and t.ended_at is null and t.last_activity_at < now() - interval '3 hours';
$$;

create or replace function private.sg_open_session(p_user uuid, p_lesson uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select t.id from public.training_sessions t
  where t.user_id = p_user and t.lesson_id = p_lesson and t.ended_at is null
    and t.last_activity_at > now() - interval '3 hours'
  order by t.started_at desc limit 1;
$$;

-- Latest readiness result for a lesson taken around a session.
create or replace function private.sg_readiness_for(p_user uuid, p_lesson uuid, p_since timestamptz)
returns uuid language sql stable security definer set search_path = '' as $$
  select r.id from public.readiness_results r
  where r.user_id = p_user and r.lesson_id = p_lesson and r.created_at >= p_since - interval '12 hours'
  order by r.created_at desc limit 1;
$$;

-- Log one completion of a day. A completion within 20 minutes of the last one is the same run.
create or replace function private.sg_log_completion(p_user uuid, p_lesson uuid, p_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_l record; v_id uuid; v_prior int; v_count int; v_recent uuid;
begin
  select l.id, l.program_id, l.path_id, l.title, l.day_type, l.page_type, s.title as stitle
    into v_l from public.lessons l join public.sections s on s.id = l.section_id where l.id = p_lesson;
  select t.id into v_recent from public.training_sessions t
    where t.user_id = p_user and t.lesson_id = p_lesson and t.day_completed_at > now() - interval '20 minutes'
    order by t.day_completed_at desc limit 1;
  if v_recent is not null then
    select count(*)::int into v_count from public.training_sessions t
      where t.user_id = p_user and t.lesson_id = p_lesson and t.day_completed_at is not null;
    return jsonb_build_object('logged', false, 'session_id', v_recent, 'count', v_count, 'first', v_count = 1);
  end if;
  select count(*)::int into v_prior from public.training_sessions t
    where t.user_id = p_user and t.lesson_id = p_lesson and t.day_completed_at is not null;

  if p_session is not null then
    select t.id into v_id from public.training_sessions t
      where t.id = p_session and t.user_id = p_user and t.lesson_id = p_lesson and t.day_completed_at is null;
  end if;
  if v_id is null then v_id := private.sg_open_session(p_user, p_lesson); end if;
  if v_id is null then
    select t.id into v_id from public.training_sessions t
      where t.user_id = p_user and t.lesson_id = p_lesson and t.day_completed_at is null
        and t.last_activity_at > now() - interval '6 hours'
      order by t.last_activity_at desc limit 1;
  end if;
  if v_id is null then
    insert into public.training_sessions (user_id, program_id, path_id, lesson_id, source, title, intent, started_at, last_activity_at)
    values (p_user, v_l.program_id, v_l.path_id, p_lesson, case when v_prior > 0 then 'repeat' else 'day' end, v_l.title,
            private.sg_lesson_intent(v_l.day_type, v_l.page_type, v_l.title, v_l.stitle), now(), now())
    returning id into v_id;
  end if;
  update public.training_sessions t
     set day_completed_at = now(),
         last_activity_at = greatest(t.last_activity_at, now()),
         source = case when v_prior > 0 and t.source = 'day' then 'repeat' else t.source end,
         readiness_result_id = coalesce(t.readiness_result_id, private.sg_readiness_for(p_user, p_lesson, t.started_at))
   where t.id = v_id;
  return jsonb_build_object('logged', true, 'session_id', v_id, 'count', v_prior + 1, 'first', v_prior = 0);
end $$;

-- Every step a member completes keeps a day session alive (or starts one), links the readiness
-- result and, when the day becomes done, logs the completion. Imports ('sync', 'admin') are ignored.
create or replace function private.sg_on_step_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_l record; v_step record; v_prior int;
begin
  if new.via not in ('button', 'watched', 'readiness') then return new; end if;
  perform private.sg_close_stale(new.user_id);
  v_id := private.sg_open_session(new.user_id, new.lesson_id);
  if v_id is null then
    select l.program_id, l.path_id, l.title, l.day_type, l.page_type, s.title as stitle
      into v_l from public.lessons l join public.sections s on s.id = l.section_id where l.id = new.lesson_id;
    select st.duration_label, st.kind, st.special, st.title, v.duration_seconds
      into v_step from public.steps st left join public.videos v on v.id = st.video_id where st.id = new.step_id;
    select count(*)::int into v_prior from public.training_sessions t
      where t.user_id = new.user_id and t.lesson_id = new.lesson_id and t.day_completed_at is not null;
    insert into public.training_sessions (user_id, program_id, path_id, lesson_id, source, title, intent, started_at, last_activity_at)
    values (new.user_id, v_l.program_id, v_l.path_id, new.lesson_id, case when v_prior > 0 then 'repeat' else 'day' end, v_l.title,
            private.sg_lesson_intent(v_l.day_type, v_l.page_type, v_l.title, v_l.stitle),
            now() - make_interval(mins => least(30, private.sg_step_minutes(v_step.duration_label, v_step.duration_seconds,
                                    private.sg_step_role(v_step.kind, v_step.special, v_step.title, null)))),
            now())
    returning id into v_id;
  else
    update public.training_sessions set last_activity_at = now() where id = v_id;
  end if;
  if new.via = 'readiness' then
    update public.training_sessions t set readiness_result_id = private.sg_readiness_for(new.user_id, new.lesson_id, t.started_at)
     where t.id = v_id;
  end if;
  if private.lesson_done(new.user_id, new.lesson_id) then
    perform private.sg_log_completion(new.user_id, new.lesson_id, v_id);
  end if;
  return new;
end $$;

create or replace trigger step_progress_session_log after insert on public.step_progress
  for each row execute function private.sg_on_step_progress();

-- Opening a day (or lesson) starts a session; reopening within 3 hours resumes the same one.
create or replace function public.start_session(p_lesson uuid, p_source text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_l record; v_id uuid; v_prior int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select l.id, l.program_id, l.path_id, l.title, l.day_type, l.page_type, s.title as stitle
    into v_l from public.lessons l join public.sections s on s.id = l.section_id where l.id = p_lesson;
  if v_l.id is null then raise exception 'lesson not found'; end if;
  if not private.has_access(v_user, v_l.program_id) then raise exception 'no access'; end if;
  if p_source is not null and p_source not in ('day', 'repeat') then raise exception 'invalid source'; end if;
  perform private.sg_close_stale(v_user);
  v_id := private.sg_open_session(v_user, p_lesson);
  if v_id is not null then return v_id; end if;
  select count(*)::int into v_prior from public.training_sessions t
    where t.user_id = v_user and t.lesson_id = p_lesson and t.day_completed_at is not null;
  insert into public.training_sessions (user_id, program_id, path_id, lesson_id, source, title, intent)
  values (v_user, v_l.program_id, v_l.path_id, p_lesson,
          coalesce(p_source, case when v_prior > 0 or private.lesson_done(v_user, p_lesson) then 'repeat' else 'day' end),
          v_l.title, private.sg_lesson_intent(v_l.day_type, v_l.page_type, v_l.title, v_l.stitle))
  returning id into v_id;
  update public.enrollments set last_active_at = now()
    where user_id = v_user and program_id = v_l.program_id and path_id is not distinct from v_l.path_id;
  return v_id;
end $$;

create or replace function private.sg_streak(p_user uuid, p_program uuid)
returns table (current_days int, best_days int)
language sql stable security definer set search_path = '' as $$
  with tz as (select private.sg_tz(p_user) as z),
  d as (
    select distinct (t.started_at at time zone (select z from tz))::date as day from public.training_sessions t
      where t.user_id = p_user and (p_program is null or t.program_id = p_program)
        and (t.day_completed_at is not null or private.sg_session_minutes(t) > 0)
    union
    select distinct (sp.completed_at at time zone (select z from tz))::date from public.step_progress sp
      join public.lessons l on l.id = sp.lesson_id
      where sp.user_id = p_user and (p_program is null or l.program_id = p_program)),
  g as (select day, day - (row_number() over (order by day))::int as grp from d),
  runs as (select max(day) as last_day, count(*)::int as n from g group by grp)
  select
    coalesce((select r.n from runs r where r.last_day >= (now() at time zone (select z from tz))::date - 1
              order by r.last_day desc limit 1), 0),
    coalesce((select max(r.n) from runs r), 0);
$$;

-- Finish a session: minutes (given, else elapsed), notes, readiness link. Safe to call twice.
create or replace function public.end_session(p_session uuid, p_minutes int default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_t public.training_sessions; v_streak record; v_today int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_t from public.training_sessions where id = p_session and user_id = v_user;
  if v_t.id is null then raise exception 'session not found'; end if;
  if p_minutes is not null and (p_minutes < 0 or p_minutes > 600) then raise exception 'minutes out of range'; end if;
  update public.training_sessions t
     set ended_at = coalesce(t.ended_at, now()),
         last_activity_at = case when t.ended_at is null then greatest(t.last_activity_at, now()) else t.last_activity_at end,
         minutes = coalesce(p_minutes, t.minutes, private.sg_elapsed(t.started_at, case when t.ended_at is null then now() else t.last_activity_at end)),
         notes = coalesce(nullif(btrim(p_notes), ''), t.notes),
         readiness_result_id = coalesce(t.readiness_result_id,
           case when t.lesson_id is not null then private.sg_readiness_for(v_user, t.lesson_id, t.started_at) end)
   where t.id = p_session
   returning * into v_t;
  select * into v_streak from private.sg_streak(v_user, null);
  select count(*)::int into v_today from public.training_sessions t
    where t.user_id = v_user
      and (t.started_at at time zone private.sg_tz(v_user))::date = (now() at time zone private.sg_tz(v_user))::date
      and (t.day_completed_at is not null or private.sg_session_minutes(t) > 0);
  return jsonb_build_object('session_id', v_t.id, 'minutes', v_t.minutes, 'notes', v_t.notes,
    'sessions_today', v_today, 'streak', v_streak.current_days, 'best_streak', v_streak.best_days);
end $$;

-- Count a completion of a day whose required steps are done (repeats count each time).
create or replace function public.log_day_completion(p_lesson uuid, p_session uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_program uuid;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select program_id into v_program from public.lessons where id = p_lesson;
  if v_program is null then raise exception 'lesson not found'; end if;
  if not private.has_access(v_user, v_program) then raise exception 'no access'; end if;
  if not private.lesson_done(v_user, p_lesson) then raise exception 'finish the required steps first'; end if;
  return private.sg_log_completion(v_user, p_lesson, p_session);
end $$;

-- Progress inside a quick/custom/library session (cross-device resume).
create or replace function public.session_progress(p_session uuid, p_item text, p_done boolean default null,
                                                   p_video text default null, p_seconds int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_p jsonb; v_done jsonb;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select progress into v_p from public.training_sessions where id = p_session and user_id = v_user;
  if v_p is null then raise exception 'session not found'; end if;
  v_done := coalesce(v_p->'done', '[]'::jsonb);
  if p_done is true and not v_done ? p_item then v_done := v_done || to_jsonb(p_item); end if;
  if p_done is false then v_done := coalesce((select jsonb_agg(x) from jsonb_array_elements(v_done) x where x <> to_jsonb(p_item)), '[]'::jsonb); end if;
  v_p := v_p || jsonb_build_object('done', v_done, 'active', p_item);
  if p_video is not null and p_seconds is not null then
    v_p := jsonb_set(v_p, '{seconds}', coalesce(v_p->'seconds', '{}'::jsonb) || jsonb_build_object(p_video, greatest(0, p_seconds)));
  end if;
  update public.training_sessions set progress = v_p, last_activity_at = now(), ended_at = null
    where id = p_session and (ended_at is null or p_done is true);
  return v_p;
end $$;

create or replace function public.set_session_favourite(p_session uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.training_sessions set favourite = coalesce(p_on, false) where id = p_session and user_id = (select auth.uid());
  if not found then raise exception 'session not found'; end if;
end $$;

create or replace function public.save_day_note(p_lesson uuid, p_body text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_program uuid; v_at timestamptz := now();
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select program_id into v_program from public.lessons where id = p_lesson;
  if v_program is null or not private.has_access(v_user, v_program) then raise exception 'no access'; end if;
  insert into public.day_notes (user_id, lesson_id, body, updated_at) values (v_user, p_lesson, left(coalesce(p_body, ''), 4000), v_at)
    on conflict (user_id, lesson_id) do update set body = excluded.body, updated_at = excluded.updated_at;
  return v_at;
end $$;

-- ================================================================= smart next (mirrors core smartNext)
create or replace function public.smart_next(p_program uuid, p_path uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_type public.program_type; v_lbl text;
  v_last record; v_ready record; v_want text; v_kind text; v_pick record; v_n bigint; v_last_ord bigint := 0;
  v_reason text; v_rotate boolean;
begin
  if v_user is null or not private.has_access(v_user, p_program) then return null; end if;
  select null::int as score, null::text as band, null::text as band_name, null::text as outcome into v_ready;
  select null::uuid as lesson_id into v_pick;
  select type, coalesce(nullif(lesson_label, ''), 'Day') into v_type, v_lbl from public.programs where id = p_program;
  v_rotate := v_type = 'day_program';
  select count(*) into v_n from public.lessons where program_id = p_program and path_id is not distinct from p_path;
  if v_n = 0 then return null; end if;

  -- last trained lesson of this path: session activity, else the latest completed step
  select x.lesson_id, x.ord, x.intent into v_last
    from public.training_sessions t join private.sg_lessons(v_user, p_program, p_path) x on x.lesson_id = t.lesson_id
    where t.user_id = v_user and (t.day_completed_at is not null or t.last_activity_at > t.started_at)
    order by greatest(t.last_activity_at, coalesce(t.day_completed_at, t.last_activity_at)) desc limit 1;
  if v_last.lesson_id is null then
    select x.lesson_id, x.ord, x.intent into v_last
      from public.step_progress sp join private.sg_lessons(v_user, p_program, p_path) x on x.lesson_id = sp.lesson_id
      where sp.user_id = v_user order by sp.completed_at desc limit 1;
  end if;
  v_last_ord := coalesce(v_last.ord, 0);

  if v_rotate then
    select r.score, r.band, r.band_name, r.outcome::text as outcome into v_ready from public.readiness_results r
      where r.user_id = v_user and r.created_at > now() - interval '3 days' order by r.created_at desc limit 1;
  end if;

  if v_last.lesson_id is null then
    v_kind := 'start';
  elsif v_rotate and v_ready.band is not null and (v_ready.band = 'red' or v_ready.outcome in ('recovery', 'rest')) then
    v_kind := 'readiness'; v_want := 'recovery';
  elsif v_rotate and v_ready.band = 'amber' then
    v_kind := 'readiness'; v_want := 'mobility';
  elsif v_rotate and v_last.intent in ('workout', 'recovery', 'skill', 'mobility') then
    v_kind := 'rotation';
    v_want := case v_last.intent when 'workout' then 'recovery' when 'recovery' then 'skill' else 'workout' end;
  else
    v_kind := 'order';
  end if;

  if v_kind = 'start' then
    select * into v_pick from private.sg_lessons(v_user, p_program, p_path) x where not x.done order by x.ord limit 1;
  else
    if v_want is not null then
      select * into v_pick from private.sg_lessons(v_user, p_program, p_path) x
        where not x.done and x.intent <> 'overview'
          and (x.intent = v_want or (v_want = 'mobility' and x.intent = 'recovery') or (v_want = 'recovery' and x.intent = 'mobility'))
        order by (x.ord - v_last_ord - 1 + v_n) % v_n limit 1;
    end if;
    if v_pick.lesson_id is null then
      if v_kind = 'rotation' then v_kind := 'order'; end if;
      select * into v_pick from private.sg_lessons(v_user, p_program, p_path) x
        where not x.done and x.intent <> 'overview' order by (x.ord - v_last_ord - 1 + v_n) % v_n limit 1;
    end if;
    if v_pick.lesson_id is null then
      select * into v_pick from private.sg_lessons(v_user, p_program, p_path) x
        where not x.done order by (x.ord - v_last_ord - 1 + v_n) % v_n limit 1;
    end if;
  end if;
  if v_pick.lesson_id is null then
    v_kind := 'repeat';
    select * into v_pick from private.sg_lessons(v_user, p_program, p_path) x
      where x.intent <> 'overview'
      order by (case when v_want is not null and (x.intent = v_want or (v_want = 'mobility' and x.intent = 'recovery')
                                                  or (v_want = 'recovery' and x.intent = 'mobility')) then 0 else 1 end),
               x.completions, x.ord limit 1;
  end if;
  if v_pick.lesson_id is null then return null; end if;

  v_reason := case v_kind
    when 'start' then 'A good place to begin.'
    when 'readiness' then format('Your last check-in scored %s (%s). A %s day lets you bounce back.', v_ready.score, v_ready.band_name, v_pick.intent)
    when 'rotation' then format('You did a %s day last. A %s day keeps the week balanced.', v_last.intent, v_pick.intent)
    when 'repeat' then 'Everything''s done. This is the one you''ve repeated least.'
    else format('The next %s you haven''t done yet.', lower(v_lbl)) end;

  return jsonb_build_object(
    'lesson_id', v_pick.lesson_id, 'key', v_pick.key, 'title', v_pick.title, 'day_number', v_pick.day_number,
    'day_type', v_pick.day_type, 'page_type', v_pick.page_type, 'section_title', v_pick.section_title,
    'intent', v_pick.intent, 'kind', v_kind, 'reason', v_reason, 'want', v_want, 'last_intent', v_last.intent,
    'last_lesson_id', v_last.lesson_id, 'completions', v_pick.completions,
    'readiness', case when v_ready.band is null then null
                      else jsonb_build_object('score', v_ready.score, 'band', v_ready.band, 'band_name', v_ready.band_name) end);
end $$;

-- ================================================================= quick and custom sessions
-- Usable steps of a program (or one path), one per distinct video, in curriculum order.
create or replace function private.sg_pool(p_user uuid, p_program uuid, p_path uuid)
returns table (step_id uuid, lesson_id uuid, role text, minutes int, title text, lesson_title text, lesson_key text, ord bigint)
language sql stable security definer set search_path = '' as $$
  with c as (
    select st.id, st.lesson_id, private.sg_step_role(st.kind, st.special, st.title, s.title) as role,
           st.duration_label, v.duration_seconds, st.title, l.title as ltitle, l.key as lkey, st.video_id,
           row_number() over (order by coalesce(pp.position, 0), s.position, l.position, st.position) as ord
    from public.steps st
    join public.lessons l on l.id = st.lesson_id
    join public.sections s on s.id = l.section_id
    left join public.program_paths pp on pp.id = l.path_id
    left join public.videos v on v.id = st.video_id
    where st.program_id = p_program and (p_path is null or l.path_id = p_path)
      and (st.video_id is not null or st.special = 'workout')
      and private.has_access(p_user, p_program)),
  d as (
    select c.*, row_number() over (partition by coalesce(c.video_id::text, lower(c.title)) order by c.ord) as dup
    from c where c.role is not null)
  select d.id, d.lesson_id, d.role, private.sg_step_minutes(d.duration_label, d.duration_seconds, d.role), d.title, d.ltitle, d.lkey, d.ord
  from d where d.dup = 1 order by d.ord;
$$;

create or replace function public.session_pool(p_program uuid, p_path uuid default null)
returns table (step_id uuid, lesson_id uuid, role text, minutes int, title text, lesson_title text, lesson_key text, ord bigint)
language sql stable security definer set search_path = '' as $$
  select * from private.sg_pool((select auth.uid()), p_program, p_path);
$$;

-- Rotated list of a role's pool: start at (seed * 3) mod n (mirrors core rotate()).
create or replace function private.sg_rotated(p_pool jsonb, p_role text, p_seed int)
returns jsonb language sql immutable set search_path = '' as $$
  with r as (select x.e, row_number() over (order by x.o) - 1 as i
             from jsonb_array_elements(p_pool) with ordinality as x(e, o) where x.e->>'role' = p_role),
  n as (select count(*) as n from r)
  select coalesce(jsonb_agg(r.e order by (r.i - ((p_seed * 3) % greatest((select n from n), 1)) + (select n from n)) % greatest((select n from n), 1)), '[]'::jsonb) from r;
$$;

-- First candidate (in order) that fits the budget and isn't used yet.
create or replace function private.sg_pick(p_list jsonb, p_budget numeric, p_used text[])
returns jsonb language sql immutable set search_path = '' as $$
  select e from jsonb_array_elements(p_list) with ordinality as x(e, i)
  where (e->>'minutes')::numeric <= p_budget and not ((e->>'step_id') = any(p_used))
  order by i limit 1;
$$;

-- Warm-up + main + stretch from a pool for a time budget (mirrors core assembleQuickSession).
create or replace function private.sg_assemble(p_pool jsonb, p_minutes int, p_intent text, p_seed int)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  t int := least(90, greatest(5, p_minutes)); v_intent text := coalesce(p_intent, 'workout');
  v_warm jsonb; v_stretch jsonb; v_main jsonb := '[]'::jsonb; v_c jsonb; v_used text[] := '{}'; v_left numeric;
  v_mainpool jsonb; v_stretchpool jsonb; v_all jsonb;
begin
  if v_intent not in ('workout', 'recovery', 'skill', 'mobility') then v_intent := 'workout'; end if;
  v_mainpool := case v_intent
    when 'workout' then private.sg_rotated(p_pool, 'workout', p_seed) || private.sg_rotated(p_pool, 'skill', p_seed)
    when 'skill' then private.sg_rotated(p_pool, 'skill', p_seed) || private.sg_rotated(p_pool, 'workout', p_seed)
    when 'recovery' then private.sg_rotated(p_pool, 'recovery', p_seed) || private.sg_rotated(p_pool, 'mobility', p_seed)
    else private.sg_rotated(p_pool, 'mobility', p_seed) || private.sg_rotated(p_pool, 'recovery', p_seed) end;
  v_stretchpool := case when v_intent in ('recovery', 'mobility') then private.sg_rotated(p_pool, 'recovery', p_seed + 1)
    else private.sg_rotated(p_pool, 'recovery', p_seed) || private.sg_rotated(p_pool, 'mobility', p_seed) end;

  -- warm-up (~30%; for 10+ minutes, up to 60% when nothing shorter exists)
  v_c := private.sg_pick(private.sg_rotated(p_pool, 'warmup', p_seed) || private.sg_rotated(p_pool, 'mobility', p_seed), t * 0.35, v_used);
  if v_c is null and t >= 10 then
    v_c := private.sg_pick(private.sg_rotated(p_pool, 'warmup', p_seed) || private.sg_rotated(p_pool, 'mobility', p_seed), t * 0.6, v_used);
  end if;
  if v_c is not null then v_warm := v_c || '{"slot":"warmup"}'; v_used := v_used || (v_c->>'step_id'); end if;

  -- stretch (~25%, sessions of 20+ minutes)
  if t >= 20 then
    v_c := private.sg_pick(v_stretchpool, t * 0.25, v_used);
    if v_c is not null then v_stretch := v_c || '{"slot":"stretch"}'; v_used := v_used || (v_c->>'step_id'); end if;
  end if;

  v_left := t - coalesce((v_warm->>'minutes')::int, 0) - coalesce((v_stretch->>'minutes')::int, 0);
  loop
    exit when v_left < 3 or jsonb_array_length(v_main) >= 6;
    v_c := private.sg_pick(v_mainpool, v_left + 2, v_used);
    exit when v_c is null;
    v_main := v_main || jsonb_build_array(v_c || '{"slot":"main"}');
    v_used := v_used || (v_c->>'step_id');
    v_left := v_left - (v_c->>'minutes')::int;
  end loop;
  if jsonb_array_length(v_main) = 0 then
    v_all := v_mainpool || private.sg_rotated(p_pool, 'recovery', p_seed) || private.sg_rotated(p_pool, 'mobility', p_seed)
             || private.sg_rotated(p_pool, 'skill', p_seed) || private.sg_rotated(p_pool, 'warmup', p_seed);
    v_c := private.sg_pick(v_all, greatest(v_left, 0) + 3, v_used);
    if v_c is not null then v_main := jsonb_build_array(v_c || '{"slot":"main"}'); end if;
  end if;

  return (case when v_warm is null then '[]'::jsonb else jsonb_build_array(v_warm) end) || v_main
      || (case when v_stretch is null then '[]'::jsonb else jsonb_build_array(v_stretch) end);
end $$;

create or replace function private.sg_title_for(p_intent text, p_minutes int)
returns text language sql immutable set search_path = '' as $$
  select format('%s-minute %s', p_minutes, case coalesce(p_intent, 'workout')
    when 'recovery' then 'recovery' when 'mobility' then 'mobility' when 'skill' then 'skill session' else 'workout' end);
$$;

-- Assemble a quick session (10/20/30/45 minutes) and save it as a session ready to play.
create or replace function public.quick_session(p_program uuid, p_minutes int, p_intent text default null, p_path uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_pool jsonb; v_seed int; v_items jsonb; v_id uuid; v_total int; v_intent text := coalesce(p_intent, 'workout');
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if not private.has_access(v_user, p_program) then raise exception 'no access'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 90 then raise exception 'choose between 5 and 90 minutes'; end if;
  if v_intent not in ('workout', 'recovery', 'skill', 'mobility') then raise exception 'invalid intent'; end if;
  select coalesce(jsonb_agg(to_jsonb(p) order by p.ord), '[]'::jsonb) into v_pool from private.sg_pool(v_user, p_program, p_path) p;
  if jsonb_array_length(v_pool) = 0 then raise exception 'this program has no videos to build a session from'; end if;
  select count(*)::int into v_seed from public.training_sessions where user_id = v_user and program_id = p_program and source = 'quick';
  v_items := private.sg_assemble(v_pool, p_minutes, v_intent, v_seed);
  select coalesce(sum((e->>'minutes')::int), 0) into v_total from jsonb_array_elements(v_items) e;
  perform private.sg_close_stale(v_user);
  insert into public.training_sessions (user_id, program_id, path_id, source, title, intent, plan, planned_minutes)
  values (v_user, p_program, p_path, 'quick', private.sg_title_for(v_intent, p_minutes), v_intent, v_items, v_total)
  returning id into v_id;
  return jsonb_build_object('session_id', v_id, 'minutes', v_total, 'target', p_minutes, 'intent', v_intent, 'items', v_items);
end $$;

-- Build your own session from chosen steps (in the order given).
create or replace function public.custom_session(p_program uuid, p_steps uuid[], p_title text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_items jsonb; v_id uuid; v_total int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if not private.has_access(v_user, p_program) then raise exception 'no access'; end if;
  if coalesce(array_length(p_steps, 1), 0) = 0 or array_length(p_steps, 1) > 20 then raise exception 'choose between 1 and 20 steps'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('step_id', st.id, 'lesson_id', st.lesson_id, 'role', coalesce(private.sg_step_role(st.kind, st.special, st.title, s.title), 'skill'),
           'minutes', private.sg_step_minutes(st.duration_label, v.duration_seconds, coalesce(private.sg_step_role(st.kind, st.special, st.title, s.title), 'skill')),
           'title', st.title, 'lesson_title', l.title, 'lesson_key', l.key, 'slot', 'main') order by u.i), '[]'::jsonb)
    into v_items
    from unnest(p_steps) with ordinality as u(id, i)
    join public.steps st on st.id = u.id and st.program_id = p_program
    join public.lessons l on l.id = st.lesson_id join public.sections s on s.id = l.section_id
    left join public.videos v on v.id = st.video_id;
  if jsonb_array_length(v_items) = 0 then raise exception 'those steps are not in this program'; end if;
  select coalesce(sum((e->>'minutes')::int), 0) into v_total from jsonb_array_elements(v_items) e;
  insert into public.training_sessions (user_id, program_id, source, title, intent, plan, planned_minutes)
  values (v_user, p_program, 'custom', coalesce(nullif(btrim(left(p_title, 120)), ''), format('My %s-minute session', v_total)), 'workout', v_items, v_total)
  returning id into v_id;
  return jsonb_build_object('session_id', v_id, 'minutes', v_total, 'items', v_items);
end $$;

-- Any library video as a session.
create or replace function public.library_session(p_video uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_v record; v_program uuid; v_id uuid; v_min int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select id, title, duration_seconds into v_v from public.videos where id = p_video;
  if v_v.id is null or not private.can_view_video(v_user, p_video) then raise exception 'no access'; end if;
  select pv.program_id into v_program from public.program_videos pv
    where pv.video_id = p_video and private.has_access(v_user, pv.program_id) limit 1;
  v_min := private.sg_step_minutes(null, v_v.duration_seconds, 'skill');
  insert into public.training_sessions (user_id, program_id, video_id, source, title, intent, plan, planned_minutes)
  values (v_user, v_program, p_video, 'library', v_v.title, 'skill',
          jsonb_build_array(jsonb_build_object('video_id', p_video, 'role', 'skill', 'minutes', v_min, 'title', v_v.title, 'slot', 'main')), v_min)
  returning id into v_id;
  return jsonb_build_object('session_id', v_id, 'minutes', v_min);
end $$;

-- Repeat a favourite or past session: sessions with a plan are copied; day sessions return the day.
create or replace function public.repeat_session(p_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_t public.training_sessions; v_id uuid; v_key text;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_t from public.training_sessions where id = p_session and user_id = v_user;
  if v_t.id is null then raise exception 'session not found'; end if;
  if not private.has_access(v_user, v_t.program_id) then raise exception 'no access'; end if;
  if jsonb_array_length(v_t.plan) > 0 then
    insert into public.training_sessions (user_id, program_id, path_id, video_id, source, title, intent, plan, planned_minutes, repeat_of)
    values (v_user, v_t.program_id, v_t.path_id, v_t.video_id, 'repeat', v_t.title, v_t.intent, v_t.plan, v_t.planned_minutes, v_t.id)
    returning id into v_id;
    return jsonb_build_object('session_id', v_id);
  end if;
  select key into v_key from public.lessons where id = v_t.lesson_id;
  return jsonb_build_object('lesson_id', v_t.lesson_id, 'lesson_key', v_key);
end $$;

-- ================================================================= stats, history, continue
create or replace function public.my_training_stats(p_program uuid default null, p_weeks int default 26)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_tz text; v_today date; v_from date; v_weekstart date;
  v_tot record; v_week record; v_streak record; v_heat jsonb; v_programs jsonb; v_completions jsonb; v_ready jsonb; v_intents jsonb;
begin
  if v_user is null then return null; end if;
  v_tz := private.sg_tz(v_user);
  v_today := (now() at time zone v_tz)::date;
  v_from := v_today - (least(greatest(coalesce(p_weeks, 26), 1), 104) * 7 - 1);
  v_weekstart := v_today - ((extract(isodow from v_today)::int) - 1);

  select coalesce(sum(private.sg_session_minutes(t)), 0)::int as minutes,
         count(*) filter (where t.day_completed_at is not null or private.sg_session_minutes(t) > 0)::int as sessions,
         count(*) filter (where t.day_completed_at is not null)::int as completions,
         count(distinct (t.started_at at time zone v_tz)::date) filter (where t.day_completed_at is not null or private.sg_session_minutes(t) > 0)::int as days
    into v_tot from public.training_sessions t
    where t.user_id = v_user and (p_program is null or t.program_id = p_program);
  select coalesce(sum(private.sg_session_minutes(t)), 0)::int as minutes,
         count(*) filter (where t.day_completed_at is not null or private.sg_session_minutes(t) > 0)::int as sessions
    into v_week from public.training_sessions t
    where t.user_id = v_user and (p_program is null or t.program_id = p_program) and (t.started_at at time zone v_tz)::date >= v_weekstart;
  select * into v_streak from private.sg_streak(v_user, p_program);

  -- sparse heatmap: one entry per active day (minutes, sessions, steps)
  with s as (
    select (t.started_at at time zone v_tz)::date as d, sum(private.sg_session_minutes(t))::int as m,
           count(*) filter (where t.day_completed_at is not null or private.sg_session_minutes(t) > 0)::int as n
    from public.training_sessions t
    where t.user_id = v_user and (p_program is null or t.program_id = p_program) and (t.started_at at time zone v_tz)::date >= v_from
    group by 1),
  sp as (
    select (x.completed_at at time zone v_tz)::date as d, count(*)::int as k
    from public.step_progress x join public.lessons l on l.id = x.lesson_id
    where x.user_id = v_user and (p_program is null or l.program_id = p_program) and (x.completed_at at time zone v_tz)::date >= v_from
    group by 1),
  j as (select coalesce(s.d, sp.d) as d, coalesce(s.m, 0) as m, coalesce(s.n, 0) as n, coalesce(sp.k, 0) as k
        from s full join sp on sp.d = s.d)
  select coalesce(jsonb_agg(jsonb_build_object('date', j.d, 'minutes', j.m, 'sessions', j.n, 'steps', j.k) order by j.d), '[]'::jsonb)
    into v_heat from j where j.m > 0 or j.n > 0 or j.k > 0;

  -- per program (enrolled, or with activity): % of lessons done per path and per section
  with progs as (
    select distinct e.program_id, e.path_id from public.enrollments e where e.user_id = v_user and (p_program is null or e.program_id = p_program)
    union
    select distinct t.program_id, l.path_id from public.training_sessions t join public.lessons l on l.id = t.lesson_id
      where t.user_id = v_user and (p_program is null or t.program_id = p_program)),
  rws as (
    select pr.program_id, pr.path_id, x.section_id, x.section_title, x.done
    from progs pr cross join lateral private.sg_lessons(v_user, pr.program_id, pr.path_id) x
    where private.has_access(v_user, pr.program_id)),
  secs as (
    select r.program_id, r.path_id, r.section_id, min(r.section_title) as title,
           count(*) filter (where r.done)::int as done, count(*)::int as total,
           (select sc.position from public.sections sc where sc.id = r.section_id) as pos
    from rws r group by 1, 2, 3),
  per as (
    select s.program_id, s.path_id, sum(s.done)::int as done, sum(s.total)::int as total,
           jsonb_agg(jsonb_build_object('section_id', s.section_id, 'title', s.title, 'done', s.done, 'total', s.total,
                                        'pct', round(100.0 * s.done / greatest(s.total, 1))::int) order by s.pos) as phases
    from secs s group by 1, 2)
  select coalesce(jsonb_agg(jsonb_build_object(
      'program_id', p.id, 'slug', p.slug, 'name', p.name, 'path_id', per.path_id, 'path_name', pp.name,
      'done', per.done, 'total', per.total, 'pct', round(100.0 * per.done / greatest(per.total, 1))::int,
      'minutes', (select coalesce(sum(private.sg_session_minutes(t)), 0)::int from public.training_sessions t
                  where t.user_id = v_user and t.program_id = p.id and (t.path_id is not distinct from per.path_id or t.path_id is null)),
      'phases', per.phases) order by p.position, pp.position), '[]'::jsonb)
    into v_programs
    from per join public.programs p on p.id = per.program_id left join public.program_paths pp on pp.id = per.path_id;

  select coalesce(jsonb_agg(jsonb_build_object('lesson_id', c.lesson_id, 'count', c.n, 'last_at', c.last_at)), '[]'::jsonb) into v_completions
    from (select t.lesson_id, count(*)::int as n, max(t.day_completed_at) as last_at from public.training_sessions t
          where t.user_id = v_user and t.day_completed_at is not null and (p_program is null or t.program_id = p_program)
          group by t.lesson_id) c;

  select coalesce(jsonb_agg(jsonb_build_object('at', r.created_at, 'score', r.score, 'band', r.band, 'band_name', r.band_name) order by r.created_at), '[]'::jsonb)
    into v_ready from (select * from public.readiness_results r where r.user_id = v_user order by r.created_at desc limit 14) r;

  select coalesce(jsonb_object_agg(i.intent, i.n), '{}'::jsonb) into v_intents
    from (select coalesce(t.intent, 'workout') as intent, count(*)::int as n from public.training_sessions t
          where t.user_id = v_user and (p_program is null or t.program_id = p_program)
            and (t.day_completed_at is not null or private.sg_session_minutes(t) > 0) group by 1) i;

  return jsonb_build_object(
    'today', v_today, 'from', v_from, 'timezone', v_tz,
    'minutes', v_tot.minutes, 'sessions', v_tot.sessions, 'completions', v_tot.completions, 'active_days', v_tot.days,
    'week', jsonb_build_object('minutes', v_week.minutes, 'sessions', v_week.sessions, 'starts', v_weekstart),
    'streak', jsonb_build_object('current', v_streak.current_days, 'best', v_streak.best_days),
    'heatmap', v_heat, 'programs', v_programs, 'completions_by_lesson', v_completions, 'readiness', v_ready, 'intents', v_intents);
end $$;

create or replace function public.training_history(p_program uuid default null, p_before timestamptz default null, p_limit int default 20)
returns table (
  session_id uuid, source text, title text, intent text, program_id uuid, program_slug text, program_name text,
  lesson_id uuid, lesson_key text, lesson_title text, day_number int, started_at timestamptz, ended_at timestamptz,
  minutes int, planned_minutes int, items int, items_done int, notes text, favourite boolean, day_completed boolean,
  readiness_score int, readiness_band text, readiness_name text)
language sql stable security definer set search_path = '' as $$
  select t.id, t.source, t.title, t.intent, p.id, p.slug, p.name, l.id, l.key, l.title, l.day_number, t.started_at, t.ended_at,
         private.sg_session_minutes(t), t.planned_minutes, jsonb_array_length(t.plan),
         coalesce(jsonb_array_length(t.progress->'done'), 0), t.notes, t.favourite, t.day_completed_at is not null,
         r.score, r.band, r.band_name
  from public.training_sessions t
  join public.programs p on p.id = t.program_id
  left join public.lessons l on l.id = t.lesson_id
  left join public.readiness_results r on r.id = t.readiness_result_id
  where t.user_id = (select auth.uid()) and (p_program is null or t.program_id = p_program)
    and (p_before is null or t.started_at < p_before)
    and (t.day_completed_at is not null or private.sg_session_minutes(t) > 0 or t.favourite
         or coalesce(jsonb_array_length(t.progress->'done'), 0) > 0)
  order by t.started_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

-- Where to pick up, per program: unfinished quick session, saved lesson position, else the enrollment's current lesson.
create or replace function public.my_continue(p_program uuid default null, p_limit int default 8)
returns table (
  kind text, program_id uuid, program_slug text, program_name text, program_type public.program_type, mode public.learning_mode,
  path_id uuid, path_name text, lesson_id uuid, lesson_key text, lesson_title text, day_number int, day_type text, section_title text,
  session_id uuid, session_title text, step_id uuid, step_title text, step_index int, step_count int, steps_done int,
  video_provider_id text, video_seconds int, video_duration int, poster text, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then return; end if;
  return query
  with sess as (
    select distinct on (t.program_id) t.program_id, t.path_id, t.id as session_id, t.title as stitle,
           t.plan, t.progress, t.last_activity_at as at
    from public.training_sessions t
    where t.user_id = v_user and t.ended_at is null and jsonb_array_length(t.plan) > 0
      and coalesce(jsonb_array_length(t.progress->'done'), 0) < jsonb_array_length(t.plan)
      and t.last_activity_at > now() - interval '2 days'
    order by t.program_id, t.last_activity_at desc),
  pos as (
    select distinct on (l.program_id) l.program_id, l.path_id, l.id as lesson_id, lp.active_step_id, lp.video_seconds, lp.updated_at as at
    from public.lesson_positions lp join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = v_user and not private.lesson_done(v_user, l.id)
    order by l.program_id, lp.updated_at desc),
  enr as (
    select distinct on (e.program_id) e.program_id, e.path_id,
           private.current_lesson(v_user, e.program_id, e.path_id) as lesson_id, e.last_active_at as at
    from public.enrollments e where e.user_id = v_user and e.completed_at is null
    order by e.program_id, e.last_active_at desc),
  pick as (
    select x.* from (
      select coalesce(s.program_id, p.program_id, e.program_id) as prog,
             case when s.session_id is not null and (p.at is null or s.at >= p.at) then 'session' else 'lesson' end as k,
             s.session_id as sid, s.stitle, s.plan, s.progress, s.path_id as s_path,
             coalesce(p.lesson_id, e.lesson_id) as lid, coalesce(p.path_id, e.path_id) as l_path,
             p.active_step_id, p.video_seconds as vsec,
             greatest(s.at, p.at, e.at) as at
      from sess s full join pos p on p.program_id = s.program_id
      full join enr e on e.program_id = coalesce(s.program_id, p.program_id)
    ) x
    where (p_program is null or x.prog = p_program) and private.has_access(v_user, x.prog)
      and (x.k = 'session' or x.lid is not null)
  )
  select pk.k, pr.id, pr.slug, pr.name, pr.type,
         (select e.mode from public.enrollments e where e.user_id = v_user and e.program_id = pr.id
            and e.path_id is not distinct from (case when pk.k = 'session' then pk.s_path else pk.l_path end) limit 1),
         case when pk.k = 'session' then pk.s_path else pk.l_path end, pp.name,
         case when pk.k = 'lesson' then l.id end, case when pk.k = 'lesson' then l.key end, case when pk.k = 'lesson' then l.title end,
         case when pk.k = 'lesson' then l.day_number end, case when pk.k = 'lesson' then l.day_type end, case when pk.k = 'lesson' then sc.title end,
         case when pk.k = 'session' then pk.sid end, case when pk.k = 'session' then pk.stitle end,
         st.id, st.title, st.idx, st.cnt, st.done_n,
         v.provider_id,
         case when v.provider_id is not null then coalesce(((case when pk.k = 'session' then pk.progress->'seconds' else pk.vsec end)->>v.provider_id)::numeric, 0)::int end,
         v.duration_seconds,
         coalesce(v.thumbnail_url, (select m.url from public.program_media m where m.program_id = pr.id order by m.position limit 1)),
         pk.at
  from pick pk
  join public.programs pr on pr.id = pk.prog
  left join public.program_paths pp on pp.id = (case when pk.k = 'session' then pk.s_path else pk.l_path end)
  left join public.lessons l on l.id = pk.lid
  left join public.sections sc on sc.id = l.section_id
  left join lateral (
    -- lesson: saved step, else first incomplete required step; session: active item, else first not done
    select q.id, q.title, q.video_id, q.idx, q.cnt, q.done_n from (
      select st2.id, st2.title, st2.video_id, ((row_number() over (order by st2.position))::int - 1) as idx, (count(*) over ())::int as cnt,
             (count(sp.step_id) over ())::int as done_n,
             case when st2.id = pk.active_step_id then 0 when sp.step_id is null and st2.is_required then 1 else 2 end as pref, st2.position as pos
      from public.steps st2 left join public.step_progress sp on sp.step_id = st2.id and sp.user_id = v_user
      where pk.k = 'lesson' and st2.lesson_id = pk.lid
      union all
      select st3.id, st3.title, st3.video_id, (e.i - 1)::int, jsonb_array_length(pk.plan)::int, coalesce(jsonb_array_length(pk.progress->'done'), 0)::int,
             case when (e.item->>'step_id') = pk.progress->>'active' and not coalesce(pk.progress->'done', '[]'::jsonb) ? (e.item->>'step_id') then 0
                  when not coalesce(pk.progress->'done', '[]'::jsonb) ? (e.item->>'step_id') then 1 else 2 end, e.i::int
      from jsonb_array_elements(case when pk.k = 'session' then pk.plan else '[]'::jsonb end) with ordinality as e(item, i)
      join public.steps st3 on st3.id = (e.item->>'step_id')::uuid
    ) q order by q.pref, q.pos limit 1
  ) st on true
  left join public.videos v on v.id = st.video_id
  order by pk.at desc nulls last
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
end $$;

-- ================================================================= self-guided plan builder ("creator")
-- Saves a plan built on the device (core buildTrainingPlan) after checking every lesson is open to the member.
-- p_items: [{on_date:'YYYY-MM-DD', lesson_id, kind:'training'|'recovery', note}]
create or replace function public.save_training_plan(p_name text, p_inputs jsonb, p_items jsonb, p_starts_on date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_plan uuid; v_bad int; v_n int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  v_n := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  if v_n = 0 or v_n > 120 then raise exception 'a plan needs between 1 and 120 sessions'; end if;
  select count(*) into v_bad from jsonb_array_elements(p_items) e
    left join public.lessons l on l.id = (e->>'lesson_id')::uuid
    where l.id is null or not private.has_access(v_user, l.program_id)
       or coalesce(e->>'kind', 'training') not in ('training', 'recovery')
       or (e->>'on_date') !~ '^\d{4}-\d{2}-\d{2}$';
  if v_bad > 0 then raise exception 'some sessions are not available to you'; end if;
  insert into public.member_plans (user_id, name, source, status, starts_on, inputs, overview)
  values (v_user, left(coalesce(nullif(btrim(p_name), ''), 'My Self-Guided plan'), 100), 'custom', 'active',
          coalesce(p_starts_on, (select min((e->>'on_date')::date) from jsonb_array_elements(p_items) e)),
          coalesce(p_inputs, '{}'::jsonb) || '{"kind":"self_guided"}', left(p_inputs->>'overview', 600))
  returning id into v_plan;
  insert into public.plan_items (plan_id, user_id, on_date, kind, lesson_id, title, note, position)
  select v_plan, v_user, (x.e->>'on_date')::date, coalesce(x.e->>'kind', 'training'), (x.e->>'lesson_id')::uuid, l.title, left(x.e->>'note', 300), (x.i - 1)::int
  from jsonb_array_elements(p_items) with ordinality as x(e, i) join public.lessons l on l.id = (x.e->>'lesson_id')::uuid;
  return v_plan;
end $$;

-- ================================================================= grants
do $$ declare f text; begin
  foreach f in array array[
    'public.start_session(uuid, text)', 'public.end_session(uuid, int, text)', 'public.log_day_completion(uuid, uuid)',
    'public.session_progress(uuid, text, boolean, text, int)', 'public.set_session_favourite(uuid, boolean)',
    'public.save_day_note(uuid, text)', 'public.smart_next(uuid, uuid)', 'public.session_pool(uuid, uuid)',
    'public.quick_session(uuid, int, text, uuid)', 'public.custom_session(uuid, uuid[], text)', 'public.library_session(uuid)',
    'public.repeat_session(uuid)', 'public.my_training_stats(uuid, int)', 'public.training_history(uuid, timestamptz, int)',
    'public.my_continue(uuid, int)', 'public.save_training_plan(text, jsonb, jsonb, date)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
