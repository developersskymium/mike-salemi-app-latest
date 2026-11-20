-- 0034 Swing Set-Up Coach (spec 13). Additive only.
-- The camera check runs on the member's phone; only numbers are stored (no video, no images).

insert into public.tools (id, name, tagline, status, config, position)
values ('swing-setup', 'Swing Set-Up Coach', 'Film your set-up side-on, fix one thing at a time', 'published', '{"kind":"swing-setup"}'::jsonb, 5)
on conflict (id) do nothing;

-- One row per member: the three questions that change the coaching, and the accepted disclaimer.
create table if not exists public.setup_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  neck_history boolean not null default false,
  bell_type text not null default 'cast-iron' check (bell_type in ('competition', 'cast-iron')),
  bell_kg numeric(4,1) check (bell_kg between 2 and 64),
  goal text check (goal in ('learn', 'fix', 'program')),
  disclaimer_at timestamptz,
  updated_at timestamptz not null default now()
);

-- One row per Set-Up Check: measures (with the overlay points), step statuses, the one fix.
create table if not exists public.setup_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measures jsonb not null,
  steps jsonb not null,
  main_fault text,
  faults text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists setup_checks_user_idx on public.setup_checks (user_id, created_at desc);

-- The ebook's 2-week EMOM program: one row per cycle, one row per logged set.
create table if not exists public.swing_program_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bell_kg numeric(4,1) not null check (bell_kg between 2 and 64),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists swing_program_runs_user_idx on public.swing_program_runs (user_id, started_at desc);

create table if not exists public.swing_program_sets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.swing_program_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session smallint not null check (session between 1 and 6),
  set_no smallint not null check (set_no between 1 and 12),
  reps smallint not null check (reps between 0 and 40),
  feel text check (feel in ('easy', 'right', 'hard')),
  created_at timestamptz not null default now()
);
create index if not exists swing_program_sets_run_idx on public.swing_program_sets (run_id, session, set_no);
create index if not exists swing_program_sets_user_idx on public.swing_program_sets (user_id);

alter table public.setup_profiles enable row level security;
alter table public.setup_checks enable row level security;
alter table public.swing_program_runs enable row level security;
alter table public.swing_program_sets enable row level security;

grant select, insert, update on public.setup_profiles to authenticated;
grant select, insert on public.setup_checks to authenticated;
grant select, insert, update on public.swing_program_runs to authenticated;
grant select, insert on public.swing_program_sets to authenticated;

do $$
declare t text;
begin
  foreach t in array array['setup_profiles', 'setup_checks', 'swing_program_runs', 'swing_program_sets'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'own_read') then
      execute format('create policy own_read on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'own_insert') then
      execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'admin_read') then
      execute format('create policy admin_read on public.%I for select to authenticated using ((select private.is_admin()))', t);
    end if;
  end loop;
  foreach t in array array['setup_profiles', 'swing_program_runs'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'own_update') then
      execute format('create policy own_update on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    end if;
  end loop;
end $$;

-- A logged set must belong to the member's own run.
create or replace function private.swing_set_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.swing_program_runs r where r.id = new.run_id and r.user_id = new.user_id) then
    raise exception 'run not found';
  end if;
  return new;
end $$;
create or replace trigger swing_set_owner before insert on public.swing_program_sets for each row execute function private.swing_set_owner();
