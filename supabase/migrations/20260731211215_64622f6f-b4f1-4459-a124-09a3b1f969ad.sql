create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to postgres, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke all on function private.has_role(uuid, public.app_role) from public, anon, authenticated;

-- policies evaluate as table owner context for the function reference; recreate them against private.has_role
drop policy if exists program_outline_insert on public.program_outline;
drop policy if exists program_outline_update on public.program_outline;
drop policy if exists program_structure_insert on public.program_structure;
drop policy if exists program_structure_update on public.program_structure;

create policy program_outline_insert on public.program_outline
  for insert to authenticated
  with check (private.has_role(auth.uid(), 'admin'::public.app_role) and auth.uid() = updated_by);
create policy program_outline_update on public.program_outline
  for update to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role) and auth.uid() = updated_by);

create policy program_structure_insert on public.program_structure
  for insert to authenticated
  with check (private.has_role(auth.uid(), 'admin'::public.app_role) and auth.uid() = updated_by);
create policy program_structure_update on public.program_structure
  for update to authenticated
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role) and auth.uid() = updated_by);

drop function if exists public.has_role(uuid, public.app_role);