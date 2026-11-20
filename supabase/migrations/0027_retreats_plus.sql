-- 0027 · Retreats plus (spec 12: "All retreats" + "Retreat page"). Additive only.
--
-- 1. retreat_leads: "Notify me" email capture and "Questions? Book a 15-min call" requests, written only
--    through public.retreat_lead() (anon or signed in); admins read them in the Studio.
-- 2. public.run_seats(): seats left per run (capacity minus accepted/booked places) without exposing
--    anyone else's application.
-- 3. run_wall_posts + the private `retreat-wall` storage bucket: the shared photo wall while a retreat is
--    live and after it. Only men booked on that run can see or add photos.
-- 4. Starter copy on retreat runs (nights, travel time, not included, "is this for me", guide lines) where
--    the run does not have it yet; existing values always win. Draft until Mike confirms.

------------------------------------------------------------------------------------------------
-- 1. Leads: notify me / question call
------------------------------------------------------------------------------------------------
create table if not exists public.retreat_leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('notify', 'question_call')),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  user_id uuid references auth.users(id) on delete set null,
  run_id uuid references public.program_runs(id) on delete set null,
  note text check (note is null or length(note) <= 1000),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists retreat_leads_run_idx on public.retreat_leads (run_id);
create index if not exists retreat_leads_user_idx on public.retreat_leads (user_id);
create unique index if not exists retreat_leads_once on public.retreat_leads (kind, lower(email), coalesce(run_id, '00000000-0000-0000-0000-000000000000'::uuid)) where handled_at is null;

alter table public.retreat_leads enable row level security;
grant select, update on public.retreat_leads to authenticated;
do $p$ begin if not exists (select 1 from pg_policies where policyname = 'admin_read' and schemaname || '.' || tablename = 'public.retreat_leads') then
  create policy admin_read on public.retreat_leads for select to authenticated using ((select private.is_admin()));
end if; end $p$;
do $p$ begin if not exists (select 1 from pg_policies where policyname = 'admin_update' and schemaname || '.' || tablename = 'public.retreat_leads') then
  create policy admin_update on public.retreat_leads for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
end if; end $p$;

create or replace function public.retreat_lead(p_kind text, p_email text, p_run uuid default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_kind not in ('notify', 'question_call') then raise exception 'unknown request'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then raise exception 'check your email address'; end if;
  if p_run is not null and not exists (select 1 from public.program_runs where id = p_run and status not in ('draft', 'cancelled')) then
    raise exception 'retreat not found';
  end if;
  insert into public.retreat_leads (kind, email, user_id, run_id, note)
  values (p_kind, v_email, (select auth.uid()), p_run, nullif(left(trim(coalesce(p_note, '')), 1000), ''))
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.retreat_lead(text, text, uuid, text) to anon, authenticated;

------------------------------------------------------------------------------------------------
-- 2. Seats left
------------------------------------------------------------------------------------------------
create or replace function public.run_seats(p_runs uuid[])
returns table (run_id uuid, capacity int, taken int, seats_left int)
language sql stable security definer set search_path = '' as $$
  select r.id, r.capacity,
         count(a.id) filter (where a.status in ('accepted', 'booked'))::int,
         case when r.capacity is null then null
              else greatest(r.capacity - count(a.id) filter (where a.status in ('accepted', 'booked')), 0)::int end
    from public.program_runs r
    left join public.run_applications a on a.run_id = r.id
   where r.id = any(p_runs) and r.status not in ('draft', 'cancelled')
   group by r.id, r.capacity;
$$;
grant execute on function public.run_seats(uuid[]) to anon, authenticated;

------------------------------------------------------------------------------------------------
-- 3. Shared photo wall
------------------------------------------------------------------------------------------------
create or replace function private.booked_on(p_run uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.run_applications where run_id = p_run and user_id = (select auth.uid()) and status = 'booked')
      or private.is_admin();
$$;
grant execute on function private.booked_on(uuid) to authenticated;

create table if not exists public.run_wall_posts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.program_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null check (length(path) <= 300),
  caption text check (caption is null or length(caption) <= 280),
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists run_wall_posts_run_idx on public.run_wall_posts (run_id, created_at desc);
create index if not exists run_wall_posts_user_idx on public.run_wall_posts (user_id);

alter table public.run_wall_posts enable row level security;
grant select, insert on public.run_wall_posts to authenticated;
do $p$ begin if not exists (select 1 from pg_policies where policyname = 'booked_read' and schemaname || '.' || tablename = 'public.run_wall_posts') then
  create policy booked_read on public.run_wall_posts for select to authenticated
  using (hidden_at is null and (select private.booked_on(run_id)));
end if; end $p$;
do $p$ begin if not exists (select 1 from pg_policies where policyname = 'booked_insert' and schemaname || '.' || tablename = 'public.run_wall_posts') then
  create policy booked_insert on public.run_wall_posts for insert to authenticated
  with check (user_id = (select auth.uid()) and hidden_at is null and (select private.booked_on(run_id))
              and path like run_id::text || '/' || (select auth.uid())::text || '/%');
end if; end $p$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('retreat-wall', 'retreat-wall', false, 12582912, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

do $p$ begin if not exists (select 1 from pg_policies where policyname = 'retreat_wall_read' and schemaname || '.' || tablename = 'storage.objects') then
  create policy retreat_wall_read on storage.objects for select to authenticated
  using (bucket_id = 'retreat-wall' and (select private.booked_on(((storage.foldername(name))[1])::uuid)));
end if; end $p$;
do $p$ begin if not exists (select 1 from pg_policies where policyname = 'retreat_wall_insert' and schemaname || '.' || tablename = 'storage.objects') then
  create policy retreat_wall_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'retreat-wall'
              and (storage.foldername(name))[2] = (select auth.uid())::text
              and (select private.booked_on(((storage.foldername(name))[1])::uuid)));
end if; end $p$;

------------------------------------------------------------------------------------------------
-- 4. Starter copy on retreat runs (existing keys win)
------------------------------------------------------------------------------------------------
update public.program_runs r
   set details = jsonb_build_object(
         'nights', 3,
         'travel_time', 'About 1 hr from Redding airport (RDD) · 4 hrs from Sacramento (SMF)',
         'not_included', jsonb_build_array('Flights to Redding (RDD) or Sacramento (SMF)', 'Travel insurance', 'Alcohol and personal extras'),
         'for_you', jsonb_build_array('You want four days away with the right men around you', 'You’re new to this work (about half the men are)', 'You’re ready to move, breathe and speak honestly'),
         'copy_draft_note', 'Starter copy (travel time, inclusions, guide lines); awaiting Mike'
       ) || r.details
  from public.programs p
 where p.id = r.program_id and p.type = 'retreat';
