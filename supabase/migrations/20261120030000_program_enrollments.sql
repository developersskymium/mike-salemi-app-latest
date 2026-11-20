-- A member "joins" a program explicitly; progress alone also counts as joined.
-- program_key: a programs.id (uuid as text) or a KBL level, e.g. 'kbl:beginner'.
create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_key text not null,
  enrolled_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  unique (user_id, program_key)
);
comment on table public.program_enrollments is
  'Programs a member has joined (home page "Your programs"). program_key = programs.id or kbl:<level id>.';

alter table public.program_enrollments enable row level security;

create policy program_enrollments_own on public.program_enrollments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy program_enrollments_admin_read on public.program_enrollments
  for select to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));

grant select, insert, update, delete on public.program_enrollments to authenticated;
grant all on public.program_enrollments to service_role;
