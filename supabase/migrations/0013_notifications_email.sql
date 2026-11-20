-- Mike Salemi App v2 — W3: email outbox, notification events, reminder preferences, plan controls.
-- Additive only. Members never write the outbox; triggers and security definer functions do.
-- Sending happens in the web app: /api/cron/email drains email_outbox, /api/cron/reminders decides
-- training reminders, streak nudges and weekly summaries from public.reminder_candidates().

-- ================================================================= notification_prefs additions
alter table public.notification_prefs add column if not exists reminders_enabled boolean not null default true;
alter table public.notification_prefs add column if not exists frequency text not null default 'custom_days';
alter table public.notification_prefs add column if not exists reminder_times jsonb not null default '{}'::jsonb;
alter table public.notification_prefs add column if not exists new_content boolean not null default true;
alter table public.notification_prefs add column if not exists announcements boolean not null default true;
alter table public.notification_prefs add column if not exists in_app_enabled boolean not null default true;
alter table public.notification_prefs add column if not exists snoozed_until timestamptz;
alter table public.notification_prefs add column if not exists skip_date date;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'notification_prefs_frequency_check') then
    alter table public.notification_prefs add constraint notification_prefs_frequency_check
      check (frequency in ('every_day', 'weekdays', 'custom_days'));
  end if;
end $$;

comment on column public.notification_prefs.reminder_times is 'Per-weekday reminder time overrides, keys "0".."6" (0 = Sunday) → "HH:MM".';
comment on column public.notification_prefs.skip_date is 'Member skipped the training reminder for this local date (schedule untouched).';
comment on column public.notification_prefs.snoozed_until is 'Reminders muted until this moment.';

-- ================================================================= notification_events (reminder history)
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,               -- auth.users id (log table, no FK so account removal is never blocked)
  kind text not null,                       -- training_reminder | streak_nudge | weekly_summary | reward | …
  channel text not null check (channel in ('email', 'push', 'in_app')),
  status text not null default 'sent' check (status in ('queued', 'sent', 'opened', 'failed', 'skipped', 'snoozed')),
  title text not null,
  body text,
  detail text,
  url text,
  payload jsonb not null default '{}'::jsonb,
  error text,
  dedupe_key text,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  opened_at timestamptz,
  cleared_at timestamptz
);
create unique index if not exists notification_events_dedupe on public.notification_events (user_id, kind, channel, dedupe_key);
create index if not exists notification_events_user_created on public.notification_events (user_id, created_at desc);

alter table public.notification_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_events' and policyname = 'own_read') then
    create policy own_read on public.notification_events for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_events' and policyname = 'admin_all') then
    create policy admin_all on public.notification_events for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;
grant select on public.notification_events to authenticated;

-- ================================================================= email_outbox
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,               -- auth.users id (log table, no FK so account removal is never blocked)
  kind text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped', 'not_configured')),
  attempts int not null default 0,
  last_error text,
  provider_id text,
  to_email text,
  subject text,
  event_id uuid references public.notification_events(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, kind, dedupe_key)
);
create index if not exists email_outbox_status on public.email_outbox (status, created_at);
create index if not exists email_outbox_event on public.email_outbox (event_id);

alter table public.email_outbox enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'email_outbox' and policyname = 'admin_all') then
    create policy admin_all on public.email_outbox for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- ================================================================= enqueue helper (never fails the caller)
create or replace function private.enqueue_email(p_user uuid, p_kind text, p_dedupe text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.email_outbox (user_id, kind, dedupe_key, payload)
  values (p_user, p_kind, p_dedupe, coalesce(p_payload, '{}'::jsonb))
  on conflict (user_id, kind, dedupe_key) do nothing;
exception when others then
  raise warning 'enqueue_email failed: %', sqlerrm;
end $$;

-- Badges earned in one transaction become ONE reward email.
create or replace function private.outbox_on_badge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    insert into public.email_outbox (user_id, kind, dedupe_key, payload)
    values (new.user_id, 'reward', 'tx:' || txid_current()::text, jsonb_build_object('badge_ids', jsonb_build_array(new.badge_id)))
    on conflict (user_id, kind, dedupe_key) do update
      set payload = jsonb_set(public.email_outbox.payload, '{badge_ids}',
                              coalesce(public.email_outbox.payload->'badge_ids', '[]'::jsonb) || to_jsonb(new.badge_id)),
          updated_at = now()
      where public.email_outbox.status = 'pending';
  exception when others then
    raise warning 'reward email not queued: %', sqlerrm;
  end;
  return new;
end $$;

create or replace function private.outbox_on_certificate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue_email(new.user_id, 'certificate', new.id::text, jsonb_build_object('certificate_id', new.id));
  return new;
end $$;

create or replace function private.outbox_on_tool_result() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue_email(new.user_id, 'tool_result', new.id::text, jsonb_build_object('tool_result_id', new.id, 'tool_id', new.tool_id));
  return new;
end $$;

-- A new schedule: Mike's templates, Immersion schedules, created (ai) and saved self-guided plans.
-- The plain "My plan" bucket that collects single added lessons is not a schedule.
create or replace function private.outbox_on_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and (new.source <> 'custom' or new.inputs ? 'kind') then
    perform private.enqueue_email(new.user_id, 'schedule_created', new.id::text, jsonb_build_object('plan_id', new.id));
  end if;
  return new;
end $$;

create or replace trigger outbox_reward after insert on public.member_badges for each row execute function private.outbox_on_badge();
create or replace trigger outbox_certificate after insert on public.certificates for each row execute function private.outbox_on_certificate();
create or replace trigger outbox_tool_result after insert on public.tool_results for each row execute function private.outbox_on_tool_result();
create or replace trigger outbox_schedule after insert on public.member_plans for each row execute function private.outbox_on_plan();

-- Welcome email on a new account's first sign-in (password, magic link, confirmation link or OAuth).
create or replace function private.outbox_on_first_sign_in() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and new.created_at > now() - interval '7 days' then
    perform private.enqueue_email(new.id, 'welcome', 'once', '{}'::jsonb);
  end if;
  return new;
end $$;

create or replace trigger welcome_on_first_sign_in
  after update of last_sign_in_at on auth.users
  for each row when (old.last_sign_in_at is null and new.last_sign_in_at is not null)
  execute function private.outbox_on_first_sign_in();

-- ================================================================= member functions
-- Welcome email, once per account, for accounts created in the last 7 days (first sign-in).
create or replace function public.queue_welcome_email()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_new int;
begin
  if v_user is null then return false; end if;
  if not exists (select 1 from auth.users u where u.id = v_user and u.created_at > now() - interval '7 days') then return false; end if;
  insert into public.email_outbox (user_id, kind, dedupe_key, payload)
  values (v_user, 'welcome', 'once', '{}'::jsonb)
  on conflict (user_id, kind, dedupe_key) do nothing;
  get diagnostics v_new = row_count;
  return v_new > 0;
end $$;

-- Skip today / snooze / resume. Mutes reminders without touching the schedule; logged to history.
create or replace function public.reminder_control(p_action text, p_minutes int default 60)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_today date; v_until timestamptz; r record; v_tz text;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  v_today := private.member_today(v_user);
  select case when exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p.timezone) then p.timezone else 'UTC' end
    into v_tz from public.profiles p where p.id = v_user;
  v_tz := coalesce(v_tz, 'UTC');
  insert into public.notification_prefs (user_id) values (v_user) on conflict (user_id) do nothing;
  if p_action = 'skip_today' then
    update public.notification_prefs set skip_date = v_today, updated_at = now() where user_id = v_user;
    insert into public.notification_events (user_id, kind, channel, status, title, body, detail)
    values (v_user, 'training_reminder', 'in_app', 'skipped', 'Today''s reminder skipped', 'Your schedule is untouched — reminders resume tomorrow.', 'Skipped today''s reminder');
  elsif p_action = 'snooze' then
    if p_minutes is null or p_minutes < 5 or p_minutes > 1440 then raise exception 'snooze between 5 minutes and a day'; end if;
    v_until := now() + make_interval(mins => p_minutes);
    update public.notification_prefs set snoozed_until = v_until, updated_at = now() where user_id = v_user;
    insert into public.notification_events (user_id, kind, channel, status, title, body, detail, scheduled_for)
    values (v_user, 'training_reminder', 'in_app', 'snoozed', 'Reminders snoozed',
            'Reminders are back on at ' || to_char(v_until at time zone v_tz, 'HH24:MI') || '.',
            'Snoozed ' || case when p_minutes < 60 then p_minutes || ' min' when p_minutes = 60 then '1 hour' else (p_minutes / 60) || ' hours' end,
            v_until);
  elsif p_action = 'resume' then
    update public.notification_prefs set snoozed_until = null, skip_date = null, updated_at = now() where user_id = v_user;
  else
    raise exception 'unknown action';
  end if;
  select snoozed_until, skip_date into r from public.notification_prefs where user_id = v_user;
  return jsonb_build_object('snoozed_until', r.snoozed_until, 'skip_date', r.skip_date, 'today', v_today);
end $$;

-- "Clear history": hides the member's events (rows stay for delivery diagnostics).
create or replace function public.clear_notification_history()
returns int language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_n int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  update public.notification_events set cleared_at = now() where user_id = v_user and cleared_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Push and in-app notifications the member has not seen yet (last 12 hours).
create or replace function public.pending_notifications()
returns setof public.notification_events language sql stable security definer set search_path = '' as $$
  select * from public.notification_events
  where user_id = (select auth.uid()) and channel in ('push', 'in_app') and status in ('sent', 'queued')
    and seen_at is null and cleared_at is null and created_at > now() - interval '12 hours'
  order by created_at desc limit 5;
$$;

-- Mark notifications seen (shown) and optionally opened (tapped).
create or replace function public.ack_notifications(p_ids uuid[], p_opened boolean default false)
returns int language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_n int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  update public.notification_events
     set seen_at = coalesce(seen_at, now()),
         opened_at = case when p_opened then coalesce(opened_at, now()) else opened_at end,
         status = case when p_opened and status in ('sent', 'queued') then 'opened' else status end
   where user_id = v_user and id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Guided schedule: re-flow the plan's remaining sessions (in order) onto a weekday pattern from a date.
create or replace function public.reflow_plan(p_plan uuid, p_days int[], p_from date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_plan record; v_days int[] := private.norm_weekdays(p_days);
        v_cursor date; r record; v_n int := 0;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if coalesce(array_length(v_days, 1), 0) = 0 then raise exception 'choose at least one training day'; end if;
  select * into v_plan from public.member_plans where id = p_plan and user_id = v_user for update;
  if v_plan.id is null then raise exception 'plan not found'; end if;
  v_cursor := coalesce(p_from, private.member_today(v_user));
  -- Rest placeholders give way to the weekday pattern (off days are the rest).
  update public.plan_items set skipped_at = now()
   where plan_id = p_plan and kind = 'rest' and done_at is null and skipped_at is null;
  for r in select id from public.plan_items
            where plan_id = p_plan and kind <> 'rest' and done_at is null and skipped_at is null
            order by on_date, position loop
    while not (extract(dow from v_cursor)::int = any(v_days)) loop v_cursor := v_cursor + 1; end loop;
    update public.plan_items set on_date = v_cursor where id = r.id;
    v_cursor := v_cursor + 1;
    v_n := v_n + 1;
  end loop;
  update public.member_plans set inputs = coalesce(inputs, '{}'::jsonb) || jsonb_build_object('days', to_jsonb(v_days)) where id = p_plan;
  if v_plan.source = 'immersion_schedule' and v_plan.inputs ? 'enrollment_id' then
    update public.enrollments set training_days = v_days
     where id = (v_plan.inputs->>'enrollment_id')::uuid and user_id = v_user;
  end if;
  return jsonb_build_object('moved', v_n, 'days', to_jsonb(v_days), 'ends_on', v_cursor - 1);
end $$;

-- "If you miss a day" chooser: stored per plan (and on the enrollment for Immersion schedules).
create or replace function public.set_missed_day_rule(p_plan uuid, p_rule text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_plan record;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if p_rule not in ('shift', 'skip', 'weekend') then raise exception 'unknown rule'; end if;
  select * into v_plan from public.member_plans where id = p_plan and user_id = v_user for update;
  if v_plan.id is null then raise exception 'plan not found'; end if;
  update public.member_plans set inputs = coalesce(inputs, '{}'::jsonb) || jsonb_build_object('missed_day_rule', p_rule) where id = p_plan;
  if v_plan.source = 'immersion_schedule' and v_plan.inputs ? 'enrollment_id' then
    update public.enrollments set missed_day_rule = p_rule where id = (v_plan.inputs->>'enrollment_id')::uuid and user_id = v_user;
  end if;
  return p_rule;
end $$;

-- "Fix my plan" now honours the plan's chosen rule (falls back to the enrollment rule, then shift).
create or replace function public.apply_missed_day_rule(p_plan uuid, p_today date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
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

  select coalesce(array_agg(i.id order by i.on_date, i.position), '{}'), count(*), min(i.on_date)
    into v_missed, v_count, v_earliest
    from public.plan_items i
    where i.plan_id = p_plan and i.on_date < v_today and i.done_at is null and i.skipped_at is null and i.kind <> 'rest'
      and not (i.lesson_id is not null and private.lesson_done(v_user, i.lesson_id));
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
end $$;

-- ================================================================= cron data (service role only)
-- One row per member who could receive a reminder: prefs (with defaults), local clock, today's plan,
-- streak and last week's numbers. The web app decides what to send (apps/web/src/lib/email/reminders.ts).
create or replace function public.reminder_candidates(p_now timestamptz default now())
returns jsonb language sql stable security definer set search_path = '' as $$
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
                                          'plan_name', m.name) order by i.position)
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
      order by i.on_date, i.position limit 1),
    'push_count', (select count(*) from public.push_tokens t where t.user_id = c.user_id and t.platform = 'web')
  )), '[]'::jsonb)
  from clock c;
$$;

-- ================================================================= grants
revoke all on function public.reminder_candidates(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_candidates(timestamptz) to service_role;
revoke all on function public.queue_welcome_email() from public, anon;
revoke all on function public.reminder_control(text, int) from public, anon;
revoke all on function public.clear_notification_history() from public, anon;
revoke all on function public.pending_notifications() from public, anon;
revoke all on function public.ack_notifications(uuid[], boolean) from public, anon;
revoke all on function public.reflow_plan(uuid, int[], date) from public, anon;
revoke all on function public.set_missed_day_rule(uuid, text) from public, anon;
grant execute on function public.queue_welcome_email() to authenticated;
grant execute on function public.reminder_control(text, int) to authenticated;
grant execute on function public.clear_notification_history() to authenticated;
grant execute on function public.pending_notifications() to authenticated;
grant execute on function public.ack_notifications(uuid[], boolean) to authenticated;
grant execute on function public.reflow_plan(uuid, int[], date) to authenticated;
grant execute on function public.set_missed_day_rule(uuid, text) to authenticated;
revoke all on function private.enqueue_email(uuid, text, text, jsonb) from public, anon, authenticated;
