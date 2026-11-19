-- ENUMS
create type public.program_type as enum ('live_online','recorded','retreat','coaching','immersion');
create type public.plan_tier as enum ('free','pro','max');
create type public.content_status as enum ('draft','published','archived');
create type public.coaching_mode as enum ('group','one_to_one');

-- TAGS
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  kind text not null default 'topic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.tags to anon, authenticated;
grant all on public.tags to service_role;
alter table public.tags enable row level security;
create policy "tags readable" on public.tags for select to anon, authenticated using (true);
create policy "admins manage tags" on public.tags for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));
create trigger tags_updated_at before update on public.tags for each row execute function public.set_updated_at();

-- PROGRAMS
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type public.program_type not null,
  status public.content_status not null default 'draft',
  level text,
  category text,
  summary text,
  description text,
  hero_image_url text,
  thumbnail_url text,
  starts_on date,
  ends_on date,
  price_cents integer not null default 0,
  currency text not null default 'usd',
  plan_tier public.plan_tier not null default 'pro',
  included_in_subscription boolean not null default true,
  access_percent integer not null default 100,
  sort_order integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_type_status_idx on public.programs (type, status);
grant select on public.programs to anon, authenticated;
grant all on public.programs to service_role;
alter table public.programs enable row level security;
create policy "published programs readable" on public.programs for select to anon, authenticated
  using (status = 'published');
create policy "admins read all programs" on public.programs for select to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role));
create policy "admins manage programs" on public.programs for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));
create trigger programs_updated_at before update on public.programs for each row execute function public.set_updated_at();

create table public.program_tags (
  program_id uuid not null references public.programs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (program_id, tag_id)
);
grant select on public.program_tags to anon, authenticated;
grant all on public.program_tags to service_role;
alter table public.program_tags enable row level security;
create policy "program tags readable" on public.program_tags for select to anon, authenticated using (true);
create policy "admins manage program tags" on public.program_tags for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));

-- STRUCTURE: sections -> lessons (days) -> sublessons -> associated videos
create table public.program_sections (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  title text not null,
  subtitle text,
  sequence integer not null default 0,
  drip_method text not null default 'immediate',
  drip_offset_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index program_sections_program_idx on public.program_sections (program_id, sequence);
grant select on public.program_sections to anon, authenticated;
grant all on public.program_sections to service_role;
alter table public.program_sections enable row level security;
create policy "sections readable" on public.program_sections for select to anon, authenticated using (true);
create policy "admins manage sections" on public.program_sections for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));
create trigger program_sections_updated_at before update on public.program_sections for each row execute function public.set_updated_at();

create table public.program_lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.program_sections(id) on delete cascade,
  title text not null,
  day_type text not null default 'general',
  day_number integer,
  sequence integer not null default 0,
  intro text,
  drip_offset_days integer not null default 0,
  has_readiness_form boolean not null default false,
  has_workout_table boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index program_lessons_section_idx on public.program_lessons (section_id, sequence);
grant select on public.program_lessons to anon, authenticated;
grant all on public.program_lessons to service_role;
alter table public.program_lessons enable row level security;
create policy "lessons readable" on public.program_lessons for select to anon, authenticated using (true);
create policy "admins manage lessons" on public.program_lessons for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));
create trigger program_lessons_updated_at before update on public.program_lessons for each row execute function public.set_updated_at();

create table public.program_sublessons (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.program_lessons(id) on delete cascade,
  title text not null,
  sequence integer not null default 0,
  kind text not null default 'video',
  vimeo_id text,
  duration_label text,
  content text,
  has_form boolean not null default false,
  has_table boolean not null default false,
  has_associated_videos boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index program_sublessons_lesson_idx on public.program_sublessons (lesson_id, sequence);
grant select on public.program_sublessons to anon, authenticated;
grant all on public.program_sublessons to service_role;
alter table public.program_sublessons enable row level security;
create policy "sublessons readable" on public.program_sublessons for select to anon, authenticated using (true);
create policy "admins manage sublessons" on public.program_sublessons for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));
create trigger program_sublessons_updated_at before update on public.program_sublessons for each row execute function public.set_updated_at();

create table public.sublesson_videos (
  id uuid primary key default gen_random_uuid(),
  sublesson_id uuid not null references public.program_sublessons(id) on delete cascade,
  title text not null,
  vimeo_id text not null,
  sequence integer not null default 0,
  created_at timestamptz not null default now()
);
create index sublesson_videos_sublesson_idx on public.sublesson_videos (sublesson_id, sequence);
grant select on public.sublesson_videos to anon, authenticated;
grant all on public.sublesson_videos to service_role;
alter table public.sublesson_videos enable row level security;
create policy "associated videos readable" on public.sublesson_videos for select to anon, authenticated using (true);
create policy "admins manage associated videos" on public.sublesson_videos for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));

-- LIBRARY
create table public.library_videos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  vimeo_id text not null,
  category text,
  level text,
  duration_seconds integer,
  thumbnail_url text,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.library_videos to anon, authenticated;
grant all on public.library_videos to service_role;
alter table public.library_videos enable row level security;
create policy "published library videos readable" on public.library_videos for select to anon, authenticated
  using (status = 'published');
create policy "admins read all library videos" on public.library_videos for select to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role));
create policy "admins manage library videos" on public.library_videos for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));
create trigger library_videos_updated_at before update on public.library_videos for each row execute function public.set_updated_at();

create table public.library_video_tags (
  video_id uuid not null references public.library_videos(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (video_id, tag_id)
);
grant select on public.library_video_tags to anon, authenticated;
grant all on public.library_video_tags to service_role;
alter table public.library_video_tags enable row level security;
create policy "library video tags readable" on public.library_video_tags for select to anon, authenticated using (true);
create policy "admins manage library video tags" on public.library_video_tags for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));

-- RETREATS
create table public.retreats (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  slug text not null unique,
  name text not null,
  location text,
  starts_on date,
  ends_on date,
  capacity integer,
  price_cents integer not null default 0,
  plan_tier public.plan_tier not null default 'max',
  included_in_subscription boolean not null default false,
  access_percent integer not null default 0,
  summary text,
  inclusions jsonb not null default '[]'::jsonb,
  hero_image_url text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.retreats to anon, authenticated;
grant all on public.retreats to service_role;
alter table public.retreats enable row level security;
create policy "published retreats readable" on public.retreats for select to anon, authenticated
  using (status = 'published');
create policy "admins read all retreats" on public.retreats for select to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role));
create policy "admins manage retreats" on public.retreats for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));
create trigger retreats_updated_at before update on public.retreats for each row execute function public.set_updated_at();

create table public.retreat_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  retreat_id uuid not null references public.retreats(id) on delete cascade,
  day_number integer not null default 1,
  time_label text,
  title text not null,
  description text,
  sequence integer not null default 0,
  created_at timestamptz not null default now()
);
create index retreat_itinerary_retreat_idx on public.retreat_itinerary_items (retreat_id, day_number, sequence);
grant select on public.retreat_itinerary_items to anon, authenticated;
grant all on public.retreat_itinerary_items to service_role;
alter table public.retreat_itinerary_items enable row level security;
create policy "itinerary readable" on public.retreat_itinerary_items for select to anon, authenticated using (true);
create policy "admins manage itinerary" on public.retreat_itinerary_items for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));

-- COACHING
create table public.coaching_offerings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  slug text not null unique,
  name text not null,
  mode public.coaching_mode not null default 'one_to_one',
  session_count integer not null default 1,
  duration_minutes integer not null default 60,
  price_cents integer not null default 0,
  plan_tier public.plan_tier not null default 'max',
  included_in_subscription boolean not null default false,
  access_percent integer not null default 0,
  summary text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.coaching_offerings to anon, authenticated;
grant all on public.coaching_offerings to service_role;
alter table public.coaching_offerings enable row level security;
create policy "published coaching readable" on public.coaching_offerings for select to anon, authenticated
  using (status = 'published');
create policy "admins read all coaching" on public.coaching_offerings for select to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role));
create policy "admins manage coaching" on public.coaching_offerings for all to authenticated
  using (private.has_role(auth.uid(),'admin'::public.app_role))
  with check (private.has_role(auth.uid(),'admin'::public.app_role));
create trigger coaching_offerings_updated_at before update on public.coaching_offerings for each row execute function public.set_updated_at();