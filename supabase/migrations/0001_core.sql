-- Mike Salemi App v2 — core: people, catalog, curriculum, readiness, library, tools, intake, settings.
-- Conventions:
--   * Content tables use uuid ids plus an optional stable text `key` (KBL legacy ids such as 'l1-phase-1-d8').
--   * Members never write content, access, commerce or reward tables; server functions do (see 0004).
--   * RLS policies live in 0005_policies.sql.

create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------------------------------------------------------------- enums
create type public.app_role as enum ('admin', 'coach');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.program_type as enum ('course', 'day_program', 'challenge', 'live', 'retreat', 'coaching', 'tool', 'bundle');
create type public.learning_mode as enum ('immersion', 'self_guided', 'library');
create type public.step_special as enum ('none', 'readiness', 'workout', 'overview', 'completion');
create type public.band_outcome as enum ('workout', 'recovery', 'rest');

-- ---------------------------------------------------------------- people
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  onboarding jsonb not null default '{}'::jsonb,       -- goal setting answers, completed_at
  preferences jsonb not null default '{}'::jsonb,      -- autoplay, theme, cues
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function private.has_role(p_user uuid, p_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = p_user and role = p_role);
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role((select auth.uid()), 'admin'::public.app_role);
$$;

-- new auth user -> profile
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, first_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', ''), ' ', 1)
  ) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------- catalog
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position int not null default 0
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  namespace text not null default 'topic',   -- topic | movement | equipment | level | goal
  slug text not null,
  name text not null,
  unique (namespace, slug)
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type public.program_type not null default 'course',
  status public.content_status not null default 'draft',
  is_free boolean not null default false,          -- open to every signed-in member (lead magnets)
  is_listed boolean not null default true,         -- shown in catalog (false = reached via inclusion only)
  tagline text,                                    -- one-sentence outcome
  audience text,                                   -- who it is for
  summary text,
  description text,                                -- markdown
  highlights text[] not null default '{}',
  format_label text,                               -- "61 days · 4 phases"
  duration_label text,
  level text,                                      -- beginner | intermediate | advanced | all
  category_id uuid references public.categories(id) on delete set null,
  catalog_group text not null default 'training',  -- training | experiences | free
  section_label text not null default 'Section',   -- Phase | Week | Module | Lift
  lesson_label text not null default 'Lesson',     -- Day | Lesson | Session
  sequence_locked boolean not null default false,  -- courses: enforce order outside Immersion too
  position int not null default 0,
  draft_note text,                                 -- shown as "Draft" label when facts unconfirmed
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_status_idx on public.programs (status, position);

create table public.program_modes (
  program_id uuid not null references public.programs(id) on delete cascade,
  mode public.learning_mode not null,
  is_default boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  primary key (program_id, mode)
);

-- Levels (KBL Level I/II: separate curricula, progress and certificates) and
-- focus paths (MTK: recommended subsets of one curriculum).
create table public.program_paths (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  key text unique,
  kind text not null default 'level' check (kind in ('level', 'focus')),
  name text not null,
  short_name text,
  description text,
  position int not null default 0,
  meta jsonb not null default '{}'::jsonb
);
create index program_paths_program_idx on public.program_paths (program_id, position);

create table public.program_media (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  role text not null default 'hero',     -- hero | card | square | banner | gallery
  url text not null,
  alt text not null default '',
  position int not null default 0
);
create index program_media_program_idx on public.program_media (program_id, role, position);

create table public.program_tags (
  program_id uuid not null references public.programs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (program_id, tag_id)
);
create index program_tags_tag_idx on public.program_tags (tag_id);

-- ---------------------------------------------------------------- videos (one record per provider video)
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'vimeo',
  provider_id text not null,          -- numeric Vimeo id
  privacy_hash text,                  -- Vimeo unlisted hash (null = public or unknown)
  title text not null default '',
  description text,
  duration_seconds int,
  thumbnail_url text,
  level text,
  category text,
  needs_key boolean not null default false,   -- private video whose hash is missing
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_id)
);

create table public.video_tags (
  video_id uuid not null references public.videos(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (video_id, tag_id)
);
create index video_tags_tag_idx on public.video_tags (tag_id);

create table public.program_videos (
  program_id uuid not null references public.programs(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  in_library boolean not null default true,
  primary key (program_id, video_id)
);
create index program_videos_video_idx on public.program_videos (video_id);

-- ---------------------------------------------------------------- readiness forms + workout tables
create table public.workout_tables (
  id text primary key,                 -- source TablePress id, e.g. '15'
  title text not null,
  rows jsonb not null default '[]'::jsonb,     -- [{circuit, exercise, rest, restDir, restArrow, intensity, reps, sets, tempo, separator?, note?}]
  notes text,
  images jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.forms (
  id text primary key,                 -- source Gravity Forms id, e.g. '2'
  title text not null,
  max_score int not null default 60,
  default_table_id text references public.workout_tables(id),
  updated_at timestamptz not null default now()
);

create table public.form_questions (
  form_id text not null references public.forms(id) on delete cascade,
  key text not null,                   -- tired | recovery | gut | stress | motivation
  position int not null,
  prompt text not null,
  note jsonb,                          -- optional help {title, body}
  options jsonb not null,              -- [{value, label, weight}]
  primary key (form_id, key)
);

create table public.form_bands (
  id uuid primary key default gen_random_uuid(),
  form_id text not null references public.forms(id) on delete cascade,
  position int not null,
  name text not null,                  -- Full Workout | Chart 2 Modification | ...
  band text not null check (band in ('green', 'amber', 'red')),
  outcome public.band_outcome not null,
  table_id text references public.workout_tables(id),
  message text not null default '',
  min_score int not null,
  max_score int not null
);
create index form_bands_form_idx on public.form_bands (form_id, position);

-- ---------------------------------------------------------------- curriculum
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  path_id uuid references public.program_paths(id) on delete cascade,
  parent_id uuid references public.sections(id) on delete cascade,
  key text unique,
  title text not null,
  subtitle text,                        -- group label, e.g. 'Deadlift', '30-Day Program'
  label text,                           -- overrides program.section_label
  description text,
  intro_video_id uuid references public.videos(id) on delete set null,
  position int not null default 0,
  release_rule jsonb not null default '{"kind":"immediate"}'::jsonb,  -- immediate | sequential | drip{days} | date{at} | run_relative{days}
  meta jsonb not null default '{}'::jsonb
);
create index sections_program_idx on public.sections (program_id, path_id, position);
create index sections_parent_idx on public.sections (parent_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,  -- denormalized for access rules
  path_id uuid references public.program_paths(id) on delete cascade,        -- denormalized from section
  key text unique,                      -- 'l1-phase-1-d8'
  title text not null,
  page_type text,                       -- null = training day/lesson; 'overview' | 'transition'
  day_number int,
  day_type text,                        -- 'Workout I Day' | 'Recovery Day' | ...
  intro text,                           -- "Let's Begin" text
  focus text,
  estimated_minutes int,
  form_id text references public.forms(id),          -- readiness form placed on this day
  starter_table_id text references public.workout_tables(id), -- fixed table (On Ramp 1/3/5)
  position int not null default 0,
  meta jsonb not null default '{}'::jsonb
);
create index lessons_section_idx on public.lessons (section_id, position);
create index lessons_program_idx on public.lessons (program_id);
create index lessons_path_idx on public.lessons (path_id);
create index lessons_form_idx on public.lessons (form_id);
create index lessons_starter_idx on public.lessons (starter_table_id);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,  -- denormalized for access rules
  key text unique,                      -- 'b-524-s1'
  title text not null,
  kind text,                            -- mobility | warmup | skill | workout | recovery | lifestyle | video | text
  special public.step_special not null default 'none',
  video_id uuid references public.videos(id) on delete set null,
  duration_label text,
  description text,
  body text,                            -- notes (markdown or sanitized html)
  attachments jsonb not null default '[]'::jsonb,   -- [{kind:'audio'|'file'|'link'|'image', title, url}]
  is_required boolean not null default true,
  position int not null default 0,
  meta jsonb not null default '{}'::jsonb
);
create index steps_lesson_idx on public.steps (lesson_id, position);
create index steps_program_idx on public.steps (program_id);
create index steps_video_idx on public.steps (video_id);

create table public.step_videos (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.steps(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  title text not null,
  position int not null default 0
);
create index step_videos_step_idx on public.step_videos (step_id, position);
create index step_videos_video_idx on public.step_videos (video_id);

-- Self-Guided downloadable plans (phase PDFs) and other program resources
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  path_id uuid references public.program_paths(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  title text not null,
  kind text not null default 'pdf',
  url text not null,
  position int not null default 0
);
create index resources_program_idx on public.resources (program_id);
create index resources_path_idx on public.resources (path_id);
create index resources_section_idx on public.resources (section_id);

-- ---------------------------------------------------------------- tools and intake
create table public.tools (
  id text primary key,                  -- kettlebell-selector | stretch-test | readiness-check | kettlebell-roadmap
  name text not null,
  tagline text,
  status public.content_status not null default 'published',
  config jsonb not null default '{}'::jsonb,   -- questions, scenarios, results
  position int not null default 0
);

create table public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,  -- null = global goal setting
  key text unique,
  title text not null,
  introduction text,
  questions jsonb not null default '[]'::jsonb,
  version int not null default 1,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);
create index intake_forms_program_idx on public.intake_forms (program_id);

-- ---------------------------------------------------------------- site
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  placement text not null,             -- banner | today | program | library | checkout
  title text,
  body text not null,
  link_label text,
  link_url text,
  audience jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  position int not null default 0
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
