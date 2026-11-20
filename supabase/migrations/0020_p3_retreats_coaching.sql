-- 0020 · P3 retreats and coaching (additive).
--
-- Retreats: the three-step sign-up (Apply → Schedule a call → if approved, Pay) gets its own state on the
-- application (call time, call done, decision, payment link sent). Calls reuse Mike's coaching slots, so one
-- calendar holds coaching sessions and retreat calls. The pre-retreat program opens ~3 months before the run:
-- inclusions can carry `opens_days_before` and the booked trigger grants access from that moment.
-- Coaching: session prep (goals, footage link), Mike's homework ("one highest-priority thing"), reschedule
-- 24h+ ahead, applications for packages that need one (Executive Edge), and the Tuesday 45-minute schedule.
-- Prices stay drafts (draft_note) until Mike confirms them.

------------------------------------------------------------------------------------------------
-- 1. Retreat application: call, decision, payment link
------------------------------------------------------------------------------------------------
alter table public.run_applications
  add column if not exists call_slot_id uuid references public.coaching_slots(id) on delete set null,
  add column if not exists call_at timestamptz,
  add column if not exists call_url text,
  add column if not exists call_done_at timestamptz,
  add column if not exists decided_at timestamptz,
  add column if not exists payment_link_sent_at timestamptz;
create index if not exists run_applications_call_slot_idx on public.run_applications (call_slot_id);

comment on column public.run_applications.call_at is 'Step 2: the alignment call the member booked (a coaching slot).';
comment on column public.run_applications.call_done_at is 'Set in the Studio when the call has happened.';
comment on column public.run_applications.decided_at is 'When the application was accepted or declined.';
comment on column public.run_applications.payment_link_sent_at is 'Set in the Studio when the member was told to pay (step 3).';

-- Members may only file a bare application; every step after that is server-written.
alter policy own_insert on public.run_applications
  with check (user_id = (select auth.uid()) and status = 'submitted' and order_id is null and admin_note is null
              and call_slot_id is null and call_at is null and call_url is null and call_done_at is null
              and decided_at is null and payment_link_sent_at is null);

-- Step 2: the member picks (or moves) the alignment call. Reuses an open coaching slot and closes it.
create or replace function public.book_run_call(p_run uuid, p_slot uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_app record; v_slot record;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_app from public.run_applications where run_id = p_run and user_id = v_user for update;
  if v_app.id is null then raise exception 'apply first'; end if;
  if v_app.status not in ('submitted', 'call_booked') or v_app.call_done_at is not null then
    raise exception 'the call step is already done';
  end if;
  select * into v_slot from public.coaching_slots where id = p_slot for update;
  if v_slot.id is null or not v_slot.is_open or v_slot.starts_at <= now() + interval '2 hours' then
    raise exception 'this time is no longer available';
  end if;
  if v_app.call_slot_id is not null and v_app.call_slot_id <> v_slot.id then
    update public.coaching_slots set is_open = true where id = v_app.call_slot_id and starts_at > now();
  end if;
  update public.coaching_slots set is_open = false where id = v_slot.id;
  update public.run_applications
     set status = 'call_booked', call_slot_id = v_slot.id, call_at = v_slot.starts_at, updated_at = now()
   where id = v_app.id;
  return jsonb_build_object('status', 'call_booked', 'call_at', v_slot.starts_at, 'duration_minutes', v_slot.duration_minutes);
end $$;

------------------------------------------------------------------------------------------------
-- 2. Pre-retreat program: access opens N days before the run (an access grant with a future starts_at)
------------------------------------------------------------------------------------------------
alter table public.program_inclusions
  add column if not exists opens_days_before int check (opens_days_before is null or opens_days_before >= 0);
comment on column public.program_inclusions.opens_days_before is
  'Run-based inclusions: access starts this many days before the run starts (null = as soon as booked).';

update public.program_inclusions i set opens_days_before = 90
  from public.programs p, public.programs c
 where p.id = i.parent_program_id and p.slug = 'men-of-movement-retreats'
   and c.id = i.included_program_id and c.slug = 'men-of-movement'
   and i.opens_days_before is null;

create or replace function private.grant_run_inclusions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_run record; inc record; v_start timestamptz;
begin
  if new.status <> 'booked' or (tg_op = 'UPDATE' and old.status = 'booked') then return new; end if;
  select program_id, starts_at into v_run from public.program_runs where id = new.run_id;
  for inc in select * from public.program_inclusions where parent_program_id = v_run.program_id loop
    v_start := case when inc.opens_days_before is null then now()
                    else greatest(now(), v_run.starts_at - make_interval(days => inc.opens_days_before)) end;
    if not exists (
      select 1 from public.access_grants g
      where g.user_id = new.user_id and g.program_id = inc.included_program_id and g.scope = 'content'
        and g.source = 'inclusion' and g.revoked_at is null and (g.ends_at is null or g.ends_at > now())) then
      insert into public.access_grants (user_id, program_id, scope, source, source_ref, starts_at, ends_at, note)
      values (new.user_id, inc.included_program_id, 'content', 'inclusion', new.run_id::text, v_start,
              case when inc.access_days is not null then v_start + make_interval(days => inc.access_days) end,
              case when inc.opens_days_before is null then 'Included with booked run'
                   else 'Included with booked run; opens ' || inc.opens_days_before || ' days before' end);
    end if;
  end loop;
  return new;
end $$;

------------------------------------------------------------------------------------------------
-- 3. Retreat data: tracks, draft price for the open run
------------------------------------------------------------------------------------------------
update public.programs set meta = meta || jsonb_build_object(
  'tracks', jsonb_build_array(
    jsonb_build_object('name', 'Hold Your Ground', 'focus', 'Ceremony, breathwork and deep inner work in a private sanctuary.',
                       'venue', 'Private sanctuary, Mount Shasta'),
    jsonb_build_object('name', 'Primal Reset', 'focus', 'Full nature immersion: sleeping on the land, fire, night hikes and solo time.',
                       'venue', 'Tim Corcoran''s land, Mount Shasta')),
  'tracks_draft_note', 'Track names from Mike''s notes; which dates belong to which track awaits Mike',
  'pillars_draft_note', 'Pillar names from Mike''s notes; "Rotation" awaits confirmation')
where slug = 'men-of-movement-retreats' and not (meta ? 'tracks');

update public.program_runs set details = details || '{"track": "Primal Reset"}'::jsonb
 where details->>'slug' = 'primal-reset' and not (details ? 'track');
update public.program_runs set details = details || '{"track": "Hold Your Ground", "price_compare_label": "$3,100–$3,250"}'::jsonb
 where details->>'slug' = 'breakthrough' and not (details ? 'track');

insert into public.prices (kind, ref_id, label, interval, amount_cents, currency, draft_note)
select 'run', r.id::text, 'Retreat place', 'one_time', 270000, 'usd', 'Draft: about $2,700 (regular $3,100–$3,250); awaiting Mike'
  from public.program_runs r
 where r.details->>'slug' = 'breakthrough'
   and not exists (select 1 from public.prices p where p.kind = 'run' and p.ref_id = r.id::text);

------------------------------------------------------------------------------------------------
-- 4. Coaching: prep, homework, reschedule
------------------------------------------------------------------------------------------------
alter table public.coaching_bookings
  add column if not exists prep jsonb not null default '{}'::jsonb,
  add column if not exists homework text;
comment on column public.coaching_bookings.prep is 'Member prep before the call: {goals, footage_url, updated_at}.';
comment on column public.coaching_bookings.homework is 'Mike''s one highest-priority thing after the session.';

create or replace function public.save_coaching_prep(p_booking uuid, p_goals text, p_footage_url text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_b record; v_url text := nullif(trim(coalesce(p_footage_url, '')), '');
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if length(coalesce(p_goals, '')) > 2000 then raise exception 'keep your goals under 2,000 characters'; end if;
  if v_url is not null and (v_url !~* '^https?://' or length(v_url) > 600) then raise exception 'footage link must be a web address'; end if;
  select * into v_b from public.coaching_bookings where id = p_booking and user_id = v_user for update;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.status <> 'booked' then raise exception 'this session is not booked'; end if;
  update public.coaching_bookings
     set prep = jsonb_build_object('goals', nullif(trim(coalesce(p_goals, '')), ''), 'footage_url', v_url, 'updated_at', now())
   where id = v_b.id;
  return jsonb_build_object('saved', true);
end $$;

-- Moving a session 24h or more ahead keeps the credit: the old time reopens, the new one closes.
create or replace function public.reschedule_coaching(p_booking uuid, p_slot uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_b record; v_slot record;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_b from public.coaching_bookings where id = p_booking and user_id = v_user for update;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.status <> 'booked' then raise exception 'this session is not booked'; end if;
  if v_b.starts_at - now() < interval '24 hours' then raise exception 'sessions can be moved up to 24 hours before'; end if;
  select * into v_slot from public.coaching_slots where id = p_slot for update;
  if v_slot.id is null or not v_slot.is_open or v_slot.starts_at <= now() then raise exception 'this time is no longer available'; end if;
  update public.coaching_slots set is_open = true where id = v_b.slot_id and starts_at > now();
  update public.coaching_slots set is_open = false where id = v_slot.id;
  update public.coaching_bookings set slot_id = v_slot.id, starts_at = v_slot.starts_at, duration_minutes = v_slot.duration_minutes
   where id = v_b.id;
  return jsonb_build_object('starts_at', v_slot.starts_at);
end $$;

------------------------------------------------------------------------------------------------
-- 5. Coaching applications (packages with requires_application, e.g. Executive Edge)
------------------------------------------------------------------------------------------------
create table if not exists public.coaching_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.coaching_packages(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'call_booked', 'accepted', 'declined', 'cancelled')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, package_id)
);
create index if not exists coaching_applications_package_idx on public.coaching_applications (package_id);
alter table public.coaching_applications enable row level security;
grant select on public.coaching_applications to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_applications' and policyname = 'own_read') then
    create policy own_read on public.coaching_applications for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coaching_applications' and policyname = 'admin_all') then
    create policy admin_all on public.coaching_applications for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

create or replace function public.apply_for_coaching(p_package uuid, p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_pkg record; v_app record;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_pkg from public.coaching_packages where id = p_package and is_active;
  if v_pkg.id is null then raise exception 'package not found'; end if;
  if not v_pkg.requires_application then raise exception 'this package does not need an application'; end if;
  insert into public.coaching_applications (user_id, package_id, answers)
    values (v_user, v_pkg.id, coalesce(p_answers, '{}'::jsonb))
  on conflict (user_id, package_id) do update
    set answers = excluded.answers, updated_at = now(),
        status = case when public.coaching_applications.status in ('declined', 'cancelled') then 'submitted' else public.coaching_applications.status end
  returning * into v_app;
  return jsonb_build_object('application_id', v_app.id, 'status', v_app.status);
end $$;

-- Executive Edge draft price (by application).
insert into public.prices (kind, ref_id, label, interval, amount_cents, currency, draft_note)
select 'coaching', c.id::text, 'Executive Edge · 8 weeks', 'one_time', 450000, 'usd', 'Draft: $4,500–$5,000; awaiting Mike'
  from public.coaching_packages c
 where c.name = 'Executive Edge'
   and not exists (select 1 from public.prices p where p.kind = 'coaching' and p.ref_id = c.id::text);

------------------------------------------------------------------------------------------------
-- 6. Coaching schedule: Mike's main slot is 45 minutes on Tuesdays (client notes, Nov 20)
------------------------------------------------------------------------------------------------
update public.programs
   set meta = jsonb_set(meta, '{schedule}', (meta->'schedule') || jsonb_build_object(
         'weekdays', jsonb_build_array(2), 'minutes', 45,
         'draft_note', 'Tuesdays, 45 minutes (Mike''s main slot); other days by arrangement'))
 where slug = 'coaching' and meta ? 'schedule' and coalesce((meta->'schedule'->>'minutes')::int, 0) <> 45;

-- Sessions on the generated schedule become 45 minutes; generated non-Tuesday times close (Studio can reopen them).
update public.coaching_slots s set duration_minutes = 45
 where s.is_open and s.starts_at > now() and s.duration_minutes = 60
   and extract(dow from (s.starts_at at time zone 'America/Los_Angeles')) = 2;
update public.coaching_slots s set is_open = false
 where s.is_open and s.starts_at > now() and s.duration_minutes = 60
   and extract(dow from (s.starts_at at time zone 'America/Los_Angeles')) <> 2
   and not exists (select 1 from public.coaching_bookings b where b.slot_id = s.id)
   and not exists (select 1 from public.run_applications a where a.call_slot_id = s.id);

-- Open Tuesdays for the next 8 weeks at the schedule's times (skips times that already exist).
insert into public.coaching_slots (starts_at, duration_minutes, is_open)
select (d::date + t::time) at time zone (p.meta->'schedule'->>'timezone'), 45, true
  from public.programs p
 cross join generate_series(current_date + 1, current_date + 56, interval '1 day') as d
 cross join lateral jsonb_array_elements_text(p.meta->'schedule'->'times') as t
 where p.slug = 'coaching'
   and extract(dow from d)::int = 2
   and not exists (select 1 from public.coaching_slots s where s.starts_at = (d::date + t::time) at time zone (p.meta->'schedule'->>'timezone'));

-- Package lengths follow the 45-minute slot (the 90-minute deep dive stays as it is).
update public.coaching_packages
   set duration_minutes = 45,
       description = replace(replace(replace(description, '60-minute', '45-minute'), 'One hour with Mike', '45 minutes with Mike'), '4 × 60', '4 × 45')
 where duration_minutes = 60 and name in ('Single session', 'Four-session block');

------------------------------------------------------------------------------------------------
-- 7. Grants
------------------------------------------------------------------------------------------------
revoke all on function public.book_run_call(uuid, uuid), public.save_coaching_prep(uuid, text, text),
  public.reschedule_coaching(uuid, uuid), public.apply_for_coaching(uuid, jsonb) from public, anon;
grant execute on function public.book_run_call(uuid, uuid), public.save_coaching_prep(uuid, text, text),
  public.reschedule_coaching(uuid, uuid), public.apply_for_coaching(uuid, jsonb) to authenticated;
revoke all on function private.grant_run_inclusions() from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- 8. Starter preparation checklist for runs that have none yet (members tick it in run_checklist).
--    Built from facts already on the run (airport pickup, sweat lodge, dietary needs, the pre-retreat
--    program); Mike's team replaces it with the final list in the Studio.
------------------------------------------------------------------------------------------------
update public.program_runs
   set details = details || jsonb_build_object(
     'prerequisites', jsonb_build_array(
       jsonb_build_object('id', 'prep-program', 'label', 'Start Men of Movement: Preparation', 'note', 'Opens about three months before the retreat'),
       jsonb_build_object('id', 'prep-diet', 'label', 'Share dietary needs with the kitchen', 'note', 'Every meal is prepared for the group; tell us what you can''t eat'),
       jsonb_build_object('id', 'prep-health', 'label', 'Tell us about injuries or medication', 'note', 'Everything is scalable; the team adapts the practices for you'),
       jsonb_build_object('id', 'prep-travel', 'label', 'Book travel to arrive for the Day I pickup'),
       jsonb_build_object('id', 'prep-agreements', 'label', 'Read the circle agreements')),
     'packing', jsonb_build_array(
       jsonb_build_object('id', 'pack-layers', 'label', 'Warm layers for mountain nights'),
       jsonb_build_object('id', 'pack-move', 'label', 'Clothes you can move and sweat in'),
       jsonb_build_object('id', 'pack-lodge', 'label', 'Swim shorts and a towel for the sweat lodge'),
       jsonb_build_object('id', 'pack-shoes', 'label', 'Trail shoes and sandals'),
       jsonb_build_object('id', 'pack-journal', 'label', 'A journal and pen'),
       jsonb_build_object('id', 'pack-bottle', 'label', 'Water bottle and headlamp')),
     'checklist_draft_note', 'Starter list; Mike''s team sends the final list after acceptance')
 where details->>'slug' = 'breakthrough'
   and jsonb_array_length(coalesce(details->'prerequisites', '[]'::jsonb)) = 0
   and jsonb_array_length(coalesce(details->'packing', '[]'::jsonb)) = 0;
