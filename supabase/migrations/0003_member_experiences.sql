-- Mike Salemi App v2 — member progress, planning, rewards, experiences, coaching, saves.

-- ---------------------------------------------------------------- enrollment and progress
-- One active enrollment per member per program path (KBL Level I and Level II are separate).
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  path_id uuid references public.program_paths(id) on delete cascade,
  mode public.learning_mode not null default 'immersion',
  pace text not null default 'free' check (pace in ('free', 'scheduled')),   -- Immersion: Free pace vs Scheduled pace
  training_days int[] not null default '{1,3,5}',                           -- 0=Sun..6=Sat, for scheduled pace
  missed_day_rule text not null default 'shift' check (missed_day_rule in ('shift', 'skip', 'weekend')),
  run_number int not null default 1,
  recommended_path_id uuid references public.program_paths(id) on delete set null,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index enrollments_user_program_path_uidx on public.enrollments (user_id, program_id, coalesce(path_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index enrollments_program_idx on public.enrollments (program_id);
create index enrollments_path_idx on public.enrollments (path_id);
create index enrollments_recommended_idx on public.enrollments (recommended_path_id);

create table public.step_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  step_id uuid not null references public.steps(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  via text not null default 'button' check (via in ('button', 'watched', 'readiness', 'sync', 'admin')),
  primary key (user_id, step_id)
);
create index step_progress_lesson_idx on public.step_progress (user_id, lesson_id);
create index step_progress_step_idx on public.step_progress (step_id);
create index step_progress_lesson_fk_idx on public.step_progress (lesson_id);

-- Where the member is inside a lesson/day (cross-device resume) + unsent answers
create table public.lesson_positions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  active_step_id uuid references public.steps(id) on delete set null,
  video_seconds jsonb not null default '{}'::jsonb,   -- {video_id: seconds}
  draft_answers jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_positions_lesson_idx on public.lesson_positions (lesson_id);
create index lesson_positions_step_idx on public.lesson_positions (active_step_id);

-- Readiness submissions; the prescription is snapshotted so later table edits never rewrite history
create table public.readiness_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  form_id text not null references public.forms(id),
  answers jsonb not null,
  score int not null,
  band_name text not null,
  band text not null,
  outcome public.band_outcome not null,
  table_id text references public.workout_tables(id),
  prescription jsonb,                   -- copy of workout_tables.rows/notes at submission time
  created_at timestamptz not null default now()
);
create index readiness_results_user_idx on public.readiness_results (user_id, lesson_id, created_at desc);
create index readiness_results_lesson_idx on public.readiness_results (lesson_id);
create index readiness_results_form_idx on public.readiness_results (form_id);
create index readiness_results_table_idx on public.readiness_results (table_id);

-- Finished or restarted runs, kept forever
create table public.run_archive (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  path_id uuid references public.program_paths(id) on delete cascade,
  run_number int not null,
  started_at timestamptz,
  archived_at timestamptz not null default now(),
  completed boolean not null default false,
  lessons_completed int not null default 0,
  steps_completed int not null default 0
);
create index run_archive_user_idx on public.run_archive (user_id, program_id);
create index run_archive_program_idx on public.run_archive (program_id);
create index run_archive_path_idx on public.run_archive (path_id);

-- Celebrations, start/end-of-day screens and other "seen once" markers, shared across devices
create table public.seen_markers (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,                    -- 'milestone:phase:<section_id>:run2' | 'gate:start:<lesson_id>'
  seen_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------------------------------------------------------------- goals and plans
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                   -- strength | technique | mobility | conditioning | mindset | retreat_prep | custom
  title text not null,
  target_date date,
  program_ids uuid[] not null default '{}',
  approach text not null default 'guided' check (approach in ('guided', 'custom')),
  status text not null default 'active' check (status in ('active', 'done', 'archived')),
  created_at timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id, status);

create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  goal_kind text not null,
  description text,
  weeks int not null,
  days_per_week int not null,
  items jsonb not null default '[]'::jsonb,   -- [{day_offset, lesson_id|lesson_key, kind:'training'|'recovery'|'rest', note}]
  is_published boolean not null default false,
  position int not null default 0
);

create table public.member_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  template_id uuid references public.plan_templates(id) on delete set null,
  name text not null,
  source text not null default 'custom' check (source in ('custom', 'template', 'ai', 'immersion_schedule')),
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'archived')),
  starts_on date not null default current_date,
  inputs jsonb not null default '{}'::jsonb,
  overview text,
  created_at timestamptz not null default now()
);
create index member_plans_user_idx on public.member_plans (user_id, status);
create index member_plans_goal_idx on public.member_plans (goal_id);
create index member_plans_template_idx on public.member_plans (template_id);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.member_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  on_date date not null,
  kind text not null default 'training' check (kind in ('training', 'recovery', 'rest')),
  lesson_id uuid references public.lessons(id) on delete cascade,
  title text,
  note text,
  position int not null default 0,
  done_at timestamptz,
  skipped_at timestamptz
);
create index plan_items_user_date_idx on public.plan_items (user_id, on_date);
create index plan_items_plan_idx on public.plan_items (plan_id, on_date);
create index plan_items_lesson_idx on public.plan_items (lesson_id);

create table public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  reminder_time time not null default '07:00',
  reminder_days int[] not null default '{1,2,3,4,5}',
  quiet_start time,
  quiet_end time,
  streak_nudge boolean not null default true,
  weekly_recap boolean not null default true,
  offers_email boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('web', 'ios', 'android')),
  created_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

-- ---------------------------------------------------------------- intake responses (history = rows)
create table public.intake_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  form_id uuid not null references public.intake_forms(id) on delete cascade,
  answers jsonb not null,
  result jsonb not null default '{}'::jsonb,   -- recommendation, path, guidance
  created_at timestamptz not null default now()
);
create index intake_responses_user_idx on public.intake_responses (user_id, form_id, created_at desc);
create index intake_responses_form_idx on public.intake_responses (form_id);

-- ---------------------------------------------------------------- rewards
create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  reason text not null,                -- step | day | phase | path | streak | tool | referral | admin
  ref text,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)        -- idempotent awards
);
create index points_ledger_user_idx on public.points_ledger (user_id, created_at desc);

create table public.badges (
  id text primary key,
  name text not null,
  description text not null,
  tier text not null default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  icon text,
  rule jsonb not null,                  -- {kind:'days', count} | {kind:'streak', days} | {kind:'phase'} | {kind:'path'} ...
  points int not null default 0,
  position int not null default 0
);

create table public.member_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
create index member_badges_badge_idx on public.member_badges (badge_id);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  path_id uuid references public.program_paths(id) on delete cascade,
  run_number int not null default 1,
  name_on_certificate text not null,
  verify_code text not null unique default upper(encode(gen_random_bytes(5), 'hex')),
  issued_at timestamptz not null default now(),
  unique (user_id, program_id, path_id, run_number)
);
create index certificates_program_idx on public.certificates (program_id);
create index certificates_path_idx on public.certificates (path_id);

create table public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'signed_up' check (status in ('signed_up', 'paid', 'rewarded', 'void')),
  reward_grant_id uuid references public.access_grants(id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index referrals_referrer_idx on public.referrals (referrer_id);
create index referrals_grant_idx on public.referrals (reward_grant_id);

-- ---------------------------------------------------------------- experiences: runs, retreats, live sessions
create table public.program_runs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Los_Angeles',
  capacity int,
  status text not null default 'draft' check (status in ('draft', 'open', 'waitlist', 'full', 'in_progress', 'past', 'cancelled')),
  requires_application boolean not null default true,
  price_note text,                      -- 'By application' while prices are unconfirmed
  location jsonb not null default '{}'::jsonb,   -- {venue, city, region, country, address, map_url}
  details jsonb not null default '{}'::jsonb,    -- {accommodation, travel, what_to_bring:[], prerequisites:[], faq:[]}
  gallery jsonb not null default '[]'::jsonb,
  draft_note text,
  created_at timestamptz not null default now()
);
create index program_runs_program_idx on public.program_runs (program_id, starts_at);

create table public.run_sessions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.program_runs(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  join_url text,
  recording_video_id uuid references public.videos(id) on delete set null,
  position int not null default 0
);
create index run_sessions_run_idx on public.run_sessions (run_id, starts_at);
create index run_sessions_video_idx on public.run_sessions (recording_video_id);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.program_runs(id) on delete cascade,
  day_index int not null default 1,
  starts_at time,
  title text not null,
  description text,
  location text,
  position int not null default 0
);
create index itinerary_items_run_idx on public.itinerary_items (run_id, day_index, position);

create table public.run_applications (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.program_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'call_booked', 'accepted', 'waitlist', 'declined', 'booked', 'cancelled')),
  admin_note text,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, user_id)
);
create index run_applications_user_idx on public.run_applications (user_id);
create index run_applications_order_idx on public.run_applications (order_id);

create table public.run_checklist (
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.program_runs(id) on delete cascade,
  item_key text not null,
  done boolean not null default true,
  primary key (user_id, run_id, item_key)
);
create index run_checklist_run_idx on public.run_checklist (run_id);

-- ---------------------------------------------------------------- coaching
create table public.coaching_packages (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  name text not null,
  description text,
  sessions int not null default 1,
  duration_minutes int not null default 60,
  format text not null default 'one_to_one' check (format in ('one_to_one', 'group')),
  requires_application boolean not null default false,
  is_active boolean not null default true,
  position int not null default 0
);
create index coaching_packages_program_idx on public.coaching_packages (program_id);

create table public.coaching_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid references public.coaching_packages(id) on delete set null,
  total int not null,
  used int not null default 0 check (used >= 0),
  source public.grant_source not null default 'purchase',
  source_ref text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (used <= total)
);
create index coaching_credits_user_idx on public.coaching_credits (user_id);
create index coaching_credits_package_idx on public.coaching_credits (package_id);

create table public.coaching_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  duration_minutes int not null default 60,
  is_open boolean not null default true
);
create index coaching_slots_starts_idx on public.coaching_slots (starts_at) where is_open;

create table public.coaching_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_id uuid references public.coaching_credits(id) on delete set null,
  slot_id uuid references public.coaching_slots(id) on delete set null,
  starts_at timestamptz not null,
  duration_minutes int not null default 60,
  status text not null default 'booked' check (status in ('booked', 'completed', 'cancelled', 'no_show')),
  meeting_url text,
  member_note text,
  coach_note text,
  created_at timestamptz not null default now()
);
create index coaching_bookings_user_idx on public.coaching_bookings (user_id, starts_at desc);
create index coaching_bookings_credit_idx on public.coaching_bookings (credit_id);
create index coaching_bookings_slot_idx on public.coaching_bookings (slot_id);

-- ---------------------------------------------------------------- saves and tools
create table public.saved_videos (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index saved_videos_video_idx on public.saved_videos (video_id);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index collections_user_idx on public.collections (user_id);

create table public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, video_id)
);
create index collection_items_video_idx on public.collection_items (video_id);

create table public.tool_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null references public.tools(id) on delete cascade,
  answers jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index tool_results_user_idx on public.tool_results (user_id, created_at desc);
create index tool_results_tool_idx on public.tool_results (tool_id);
