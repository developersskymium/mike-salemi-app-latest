-- 0028 · Coaching plus (additive; spec 12 "Coaching").
-- 3 pre-call questions on the booking's prep · daily ticks for Mike's homework (read by the schedule later)
-- · async message thread with Mike · Zen Savage live schedule, reminders and replays · King Within podcast shelf.
-- Members write only their own messages, prep, ticks and reminders. Admins (Mike) write everything else.

------------------------------------------------------------------------------------------------
-- 1. Pre-call form: three questions, merged into coaching_bookings.prep
------------------------------------------------------------------------------------------------
comment on column public.coaching_bookings.prep is
  'Member prep before the call: {goals (Q1 what to leave with), since_last (Q2 how the last homework went), watch (Q3 what Mike should look at), footage_url, updated_at}.';

create or replace function public.save_coaching_prep_form(p_booking uuid, p_goals text, p_since_last text default null, p_watch text default null, p_footage_url text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_b record; v_url text := nullif(trim(coalesce(p_footage_url, '')), '');
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if length(coalesce(p_goals, '')) > 2000 or length(coalesce(p_since_last, '')) > 2000 or length(coalesce(p_watch, '')) > 2000 then
    raise exception 'keep each answer under 2,000 characters';
  end if;
  if v_url is not null and (v_url !~* '^https?://' or length(v_url) > 600) then raise exception 'footage link must be a web address'; end if;
  select * into v_b from public.coaching_bookings where id = p_booking and user_id = v_user for update;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.status <> 'booked' then raise exception 'this session is not booked'; end if;
  update public.coaching_bookings
     set prep = coalesce(prep, '{}'::jsonb) || jsonb_build_object(
           'goals', nullif(trim(coalesce(p_goals, '')), ''),
           'since_last', nullif(trim(coalesce(p_since_last, '')), ''),
           'watch', nullif(trim(coalesce(p_watch, '')), ''),
           'footage_url', v_url,
           'updated_at', now())
   where id = v_b.id;
  return jsonb_build_object('saved', true);
end $$;
revoke all on function public.save_coaching_prep_form(uuid, text, text, text, text) from public, anon;
grant execute on function public.save_coaching_prep_form(uuid, text, text, text, text) to authenticated;

------------------------------------------------------------------------------------------------
-- 2. Homework ticks: one row per member, session (its homework) and day
------------------------------------------------------------------------------------------------
create table if not exists public.coaching_homework_ticks (
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references public.coaching_bookings(id) on delete cascade,
  on_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, booking_id, on_date)
);
comment on table public.coaching_homework_ticks is 'Daily ticks for Mike''s homework (coaching_bookings.homework). The schedule reads these via packages/api coachingHomeworkDays().';
create index if not exists coaching_homework_ticks_booking_idx on public.coaching_homework_ticks (booking_id);
alter table public.coaching_homework_ticks enable row level security;
grant select, insert, delete on public.coaching_homework_ticks to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_homework_ticks' and policyname = 'own_read') then
    create policy own_read on public.coaching_homework_ticks for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_homework_ticks' and policyname = 'own_insert') then
    create policy own_insert on public.coaching_homework_ticks for insert to authenticated
      with check (user_id = (select auth.uid())
        and exists (select 1 from public.coaching_bookings b where b.id = booking_id and b.user_id = (select auth.uid()) and b.homework is not null));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_homework_ticks' and policyname = 'own_untick') then
    create policy own_untick on public.coaching_homework_ticks for delete to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_homework_ticks' and policyname = 'admin_all') then
    create policy admin_all on public.coaching_homework_ticks for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

------------------------------------------------------------------------------------------------
-- 3. Message thread with Mike (one thread per member; Mike replies within 48 hours)
------------------------------------------------------------------------------------------------
create table if not exists public.coaching_messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  from_coach boolean not null default false,
  body text not null check (length(trim(body)) between 1 and 4000),
  attachment_url text check (attachment_url is null or (attachment_url ~* '^https?://' and length(attachment_url) <= 600)),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
comment on table public.coaching_messages is 'Async thread between a member and Mike. Members insert their own (from_coach=false); Mike (admin) replies.';
create index if not exists coaching_messages_member_idx on public.coaching_messages (member_id, created_at);
alter table public.coaching_messages enable row level security;
grant select, insert on public.coaching_messages to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_messages' and policyname = 'own_read') then
    create policy own_read on public.coaching_messages for select to authenticated using (member_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_messages' and policyname = 'own_insert') then
    create policy own_insert on public.coaching_messages for insert to authenticated
      with check (member_id = (select auth.uid()) and author_id = (select auth.uid()) and from_coach = false and read_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_messages' and policyname = 'admin_all') then
    create policy admin_all on public.coaching_messages for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- Members mark Mike's replies read (only read_at, only their own thread).
create or replace function public.mark_coaching_messages_read()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); n integer;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  update public.coaching_messages set read_at = now() where member_id = v_user and from_coach and read_at is null;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.mark_coaching_messages_read() from public, anon;
grant execute on function public.mark_coaching_messages_read() to authenticated;

------------------------------------------------------------------------------------------------
-- 4. Zen Savage: live calls, reminders, replays
------------------------------------------------------------------------------------------------
create table if not exists public.coaching_live_sessions (
  id uuid primary key default gen_random_uuid(),
  series text not null default 'zen-savage',
  title text not null,
  summary text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 240),
  join_url text,
  replay_url text,
  replay_thumb text,
  is_published boolean not null default true,
  draft_note text,
  created_at timestamptz not null default now()
);
comment on table public.coaching_live_sessions is 'Zen Savage group lives (replaces group coaching). Past rows with replay_url form the replay library.';
create index if not exists coaching_live_sessions_series_idx on public.coaching_live_sessions (series, starts_at);
alter table public.coaching_live_sessions enable row level security;
grant select on public.coaching_live_sessions to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_live_sessions' and policyname = 'read_published') then
    create policy read_published on public.coaching_live_sessions for select to authenticated using (is_published);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_live_sessions' and policyname = 'admin_all') then
    create policy admin_all on public.coaching_live_sessions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

create table if not exists public.coaching_live_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  live_id uuid not null references public.coaching_live_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, live_id)
);
create index if not exists coaching_live_reminders_live_idx on public.coaching_live_reminders (live_id);
alter table public.coaching_live_reminders enable row level security;
grant select, insert, delete on public.coaching_live_reminders to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_live_reminders' and policyname = 'own_all') then
    create policy own_all on public.coaching_live_reminders for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_live_reminders' and policyname = 'admin_all') then
    create policy admin_all on public.coaching_live_reminders for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- Draft live schedule (Thursdays) until Mike confirms; admins edit.
insert into public.coaching_live_sessions (series, title, summary, starts_at, duration_minutes, draft_note)
select 'zen-savage', v.title, v.summary, v.starts_at, 60, 'Draft schedule; awaiting Mike'
  from (values
    ('Grounded awareness: the morning reset', 'Breath, a short flow and one decision for the day.', timestamptz '2026-11-26 17:00+00'),
    ('Decisive action under pressure', 'Kettlebell complex, then the one thing you have been avoiding.', timestamptz '2026-12-03 17:00+00'),
    ('Antifragile: training the nervous system', 'Contrast work, breath holds and recovery you can repeat.', timestamptz '2026-12-10 17:00+00')
  ) as v(title, summary, starts_at)
 where not exists (select 1 from public.coaching_live_sessions where series = 'zen-savage');

------------------------------------------------------------------------------------------------
-- 5. King Within podcast (public metadata; admin-editable)
------------------------------------------------------------------------------------------------
create table if not exists public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  show text not null default 'king-within',
  title text not null,
  published_on date,
  url text not null check (url ~* '^https?://'),
  image_url text,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (show, url)
);
comment on table public.podcast_episodes is 'The King Within podcast (Apple Podcasts id1643622665). Shelf hides when empty.';
alter table public.podcast_episodes enable row level security;
grant select on public.podcast_episodes to anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'podcast_episodes' and policyname = 'read_published') then
    create policy read_published on public.podcast_episodes for select to anon, authenticated using (is_published);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'podcast_episodes' and policyname = 'admin_all') then
    create policy admin_all on public.podcast_episodes for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

insert into public.podcast_episodes (show, title, published_on, url, position)
values
  ('king-within', 'The Truth About Health Habits for CEOs: Why Generic Advice Fails', '2026-03-26', 'https://podcasts.apple.com/us/podcast/the-truth-about-health-habits-for-ceos-why-generic/id1643622665?i=1000757448739', 1),
  ('king-within', 'How Jason Olivea Discovered the Influence of Childhood Patterns to Deepen Connection', '2026-03-19', 'https://podcasts.apple.com/us/podcast/how-jason-olivea-discovered-the-influence-of/id1643622665?i=1000756100623', 2),
  ('king-within', 'The Importance of Naming Your Real Needs in Breaking Free from Resentment', '2026-03-12', 'https://podcasts.apple.com/us/podcast/the-importance-of-naming-your-real-needs-in/id1643622665?i=1000754811849', 3),
  ('king-within', 'How Preston Woody Discovered the Core 9 Framework to Achieve Life Balance', '2026-03-05', 'https://podcasts.apple.com/us/podcast/how-preston-woody-discovered-the-core-9-framework-to/id1643622665?i=1000753185437', 4),
  ('king-within', 'The Importance of Modeling Repair in Transforming Family Dynamics with Stefanos Sifandos', '2026-02-26', 'https://podcasts.apple.com/us/podcast/the-importance-of-modeling-repair-in-transforming/id1643622665?i=1000751717957', 5),
  ('king-within', 'Why Reconnecting With Physicality Holds the Key to Deeper Self-Trust with Marco Dinh', '2026-02-19', 'https://podcasts.apple.com/us/podcast/why-reconnecting-with-physicality-holds-the-key-to/id1643622665?i=1000750456455', 6),
  ('king-within', 'Why Integrating Childhood Wounds Is a Must For Becoming a Present Partner', '2026-02-12', 'https://podcasts.apple.com/us/podcast/153-why-integrating-childhood-wounds-is-a-must-for/id1643622665?i=1000749402703', 7),
  ('king-within', 'How Ani Manian Tapped into the Mathematics of the Universe to Overcome Burnout', '2026-02-05', 'https://podcasts.apple.com/us/podcast/how-ani-manian-tapped-into-the-mathematics-of/id1643622665?i=1000748342679', 8)
on conflict (show, url) do nothing;
