-- KBL workout-day form entries: queryable result columns, indexes, admin read.
alter table public.workout_tables
  add column if not exists form_id text,
  add column if not exists score integer,
  add column if not exists band text,
  add column if not exists band_name text,
  add column if not exists table_id text,
  add column if not exists outcome text check (outcome in ('workout','recovery','rest'));

comment on table public.workout_tables is
  'KBL workout-day form entries: one row per submission (history kept). answers = raw choices; form_id/score/band/table_id/outcome = result computed server-side.';

create index if not exists workout_tables_user_day_created_idx
  on public.workout_tables (user_id, day_id, created_at desc);
create index if not exists workout_tables_form_created_idx
  on public.workout_tables (form_id, created_at desc);

drop policy if exists workout_tables_all_own on public.workout_tables;
create policy workout_tables_all_own on public.workout_tables
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists workout_tables_admin_read on public.workout_tables;
create policy workout_tables_admin_read on public.workout_tables
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
