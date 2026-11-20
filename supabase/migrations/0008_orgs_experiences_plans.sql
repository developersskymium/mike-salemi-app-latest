-- Mike Salemi App v2 — organizations, experiences (retreats, coaching), goals and plans, intake, library.
-- All member-facing functions are security definer with search_path = '' and explicit grants.
-- Seeds live in packages/content/seed/*.sql (applied separately once content exists).

-- ---------------------------------------------------------------- intake result rules
-- Declarative recommendation logic for an intake form (see private.intake_result for the format).
alter table public.intake_forms add column if not exists result_rules jsonb not null default '{}'::jsonb;

-- ================================================================= shared helpers
-- First answer as text (arrays -> first element).
create or replace function private.answer_one(p_answers jsonb, p_key text)
returns text language sql immutable set search_path = '' as $$
  select case jsonb_typeof(p_answers->p_key)
    when 'array' then p_answers->p_key->>0
    when 'null' then null
    else p_answers->>p_key end;
$$;

-- Answer as a text array (scalars -> one element, missing -> empty).
create or replace function private.answer_list(p_answers jsonb, p_key text)
returns text[] language sql immutable set search_path = '' as $$
  select case jsonb_typeof(p_answers->p_key)
    when 'array' then coalesce((select array_agg(x) from jsonb_array_elements_text(p_answers->p_key) x), '{}')
    when 'string' then array[p_answers->>p_key]
    when 'number' then array[p_answers->>p_key]
    when 'boolean' then array[p_answers->>p_key]
    else '{}'::text[] end;
$$;

-- Today's date in the member's timezone.
create or replace function private.member_today(p_user uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select nullif(p.timezone, '') from public.profiles p where p.id = p_user), 'UTC'))::date;
$$;

-- Consecutive days (member timezone) with any step completed, ending today (or yesterday when
-- nothing is done yet today, so the morning does not read as a broken streak).
create or replace function private.member_streak(p_user uuid)
returns int language sql stable security definer set search_path = '' as $$
  with tz as (select coalesce((select nullif(p.timezone, '') from public.profiles p where p.id = p_user), 'UTC') as z),
  d as (
    select distinct (sp.completed_at at time zone (select z from tz))::date as day
    from public.step_progress sp where sp.user_id = p_user),
  anchor as (
    select case
      when exists (select 1 from d where day = private.member_today(p_user)) then private.member_today(p_user)
      when exists (select 1 from d where day = private.member_today(p_user) - 1) then private.member_today(p_user) - 1
    end as a),
  isl as (select day, day + (row_number() over (order by day desc))::int as grp from d where day <= (select a from anchor))
  select coalesce((select count(*)::int from isl where grp = (select grp from isl where day = (select a from anchor))), 0);
$$;

-- Lessons the member has fully completed (all required steps done).
create or replace function private.member_lessons_done(p_user uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from (
    select sp.lesson_id
    from public.step_progress sp join public.steps st on st.id = sp.step_id and st.is_required
    where sp.user_id = p_user
    group by sp.lesson_id
    having count(*) >= (select count(*) from public.steps s2 where s2.lesson_id = sp.lesson_id and s2.is_required)
  ) x;
$$;

-- First incomplete lesson of a program path for a member, in curriculum order.
create or replace function private.current_lesson(p_user uuid, p_program uuid, p_path uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select o.lesson_id from private.ordered_lessons(p_program, p_path) o
  where not private.lesson_done(p_user, o.lesson_id) order by o.ord limit 1;
$$;

-- Normalise weekdays (0=Sun..6=Sat; 7 is read as Sunday), distinct.
create or replace function private.norm_weekdays(p_days int[])
returns int[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct ((d % 7) + 7) % 7), '{}') from unnest(p_days) d;
$$;

-- ================================================================= organizations
create or replace function private.org_role(p_user uuid, p_org uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.org_members m where m.org_id = p_org and m.user_id = p_user and m.status = 'active';
$$;

create or replace function private.require_org_manager(p_org uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if not (private.has_role(v_user, 'admin') or coalesce(private.org_role(v_user, p_org) in ('owner', 'admin'), false)) then
    raise exception 'only an organization owner or admin can do this';
  end if;
  return v_user;
end $$;

-- Adds (or re-activates) a member after a seat check. Caller must hold the org row lock.
create or replace function private.org_add_member(p_org uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org record; v_used int;
begin
  select * into v_org from public.organizations where id = p_org for update;
  if v_org.id is null then raise exception 'organization not found'; end if;
  if v_org.status = 'cancelled' then raise exception 'this organization is no longer active'; end if;
  if exists (select 1 from public.org_members where org_id = p_org and user_id = p_user and status = 'active') then
    return;  -- already a member
  end if;
  select count(*) into v_used from public.org_members where org_id = p_org and status = 'active';
  if v_used >= v_org.seats then raise exception 'all % seats are taken', v_org.seats; end if;
  insert into public.org_members (org_id, user_id, role, status, joined_at)
    values (p_org, p_user, p_role, 'active', now())
    on conflict (org_id, user_id) do update set status = 'active', role = excluded.role, removed_at = null, joined_at = now();
end $$;

create or replace function public.accept_org_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_email text; v_inv record;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select email into v_email from auth.users where id = v_user;
  select * into v_inv from public.org_invites where token = p_token for update;
  if v_inv.id is null then raise exception 'invite not found'; end if;
  if v_inv.accepted_at is not null then raise exception 'this invite was already used'; end if;
  if v_inv.expires_at <= now() then raise exception 'this invite has expired'; end if;
  if lower(v_inv.email) <> lower(coalesce(v_email, '')) then raise exception 'this invite was sent to a different email address'; end if;
  perform private.org_add_member(v_inv.org_id, v_user, v_inv.role);
  update public.org_invites set accepted_at = now() where id = v_inv.id;
  return jsonb_build_object('org_id', v_inv.org_id, 'role', v_inv.role);
end $$;

-- Join by the org's join link token, or (token null) by the email domain the org auto-joins.
create or replace function public.join_org(p_join_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_email text; v_org uuid; v_domain text;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select email into v_email from auth.users where id = v_user;
  v_domain := lower(split_part(coalesce(v_email, ''), '@', 2));
  if p_join_token is not null and p_join_token <> '' then
    select id into v_org from public.organizations where join_token = p_join_token;
  else
    select id into v_org from public.organizations
      where join_domain is not null and lower(join_domain) = v_domain and v_domain <> '' order by created_at limit 1;
  end if;
  if v_org is null then raise exception 'no organization matches this link or email domain'; end if;
  perform private.org_add_member(v_org, v_user, 'member');
  return jsonb_build_object('org_id', v_org, 'role', private.org_role(v_user, v_org));
end $$;

create or replace function public.org_admin_invite(p_org uuid, p_email text, p_role text default 'member')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := private.require_org_manager(p_org); v_inv record; v_seats int; v_used int;
begin
  if p_role not in ('admin', 'coach', 'member') then raise exception 'invalid role'; end if;
  if p_email is null or position('@' in p_email) = 0 then raise exception 'invalid email'; end if;
  insert into public.org_invites (org_id, email, role, invited_by)
    values (p_org, lower(trim(p_email)), p_role, v_user)
    on conflict (org_id, email) do update
      set role = excluded.role, invited_by = excluded.invited_by, accepted_at = null,
          token = encode(extensions.gen_random_bytes(16), 'hex'), expires_at = now() + interval '14 days'
    returning * into v_inv;
  select seats into v_seats from public.organizations where id = p_org;
  select count(*) into v_used from public.org_members where org_id = p_org and status = 'active';
  return jsonb_build_object('invite_id', v_inv.id, 'email', v_inv.email, 'role', v_inv.role, 'token', v_inv.token,
                            'expires_at', v_inv.expires_at, 'seats_left', greatest(v_seats - v_used, 0));
end $$;

create or replace function public.org_remove_member(p_org uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.require_org_manager(p_org); v_role text;
begin
  v_role := private.org_role(p_user, p_org);
  if v_role is null then raise exception 'not an active member'; end if;
  if v_role = 'owner' and not private.has_role(v_caller, 'admin') then raise exception 'the owner cannot be removed'; end if;
  if v_role = 'admin' and private.org_role(v_caller, p_org) = 'admin' and v_caller <> p_user then
    raise exception 'only the owner can remove an admin';
  end if;
  update public.org_members set status = 'removed', removed_at = now(), coach_id = null where org_id = p_org and user_id = p_user;
  update public.org_members set coach_id = null where org_id = p_org and coach_id = p_user;
end $$;

create or replace function public.org_set_coach(p_org uuid, p_member uuid, p_coach uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.require_org_manager(p_org);
begin
  if private.org_role(p_member, p_org) is null then raise exception 'not an active member'; end if;
  if p_coach is not null and coalesce(private.org_role(p_coach, p_org) not in ('owner', 'admin', 'coach'), true) then
    raise exception 'the coach must be an active coach, admin or owner of this organization';
  end if;
  update public.org_members set coach_id = p_coach where org_id = p_org and user_id = p_member;
end $$;

-- Dashboard for owners, admins and coaches. Coaches see only their assigned members (private.can_view_member).
create or replace function public.org_overview(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_org record; v_used int; v_members jsonb;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if not (private.has_role(v_user, 'admin') or coalesce(private.org_role(v_user, p_org) in ('owner', 'admin', 'coach'), false)) then
    raise exception 'not allowed';
  end if;
  select * into v_org from public.organizations where id = p_org;
  if v_org.id is null then raise exception 'organization not found'; end if;
  select count(*) into v_used from public.org_members where org_id = p_org and status = 'active';

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.name nulls last), '[]'::jsonb) into v_members
  from (
    select m.user_id, m.role, m.coach_id, m.joined_at,
      coalesce(nullif(pr.display_name, ''), 'Member') as name,
      pr.avatar_url,
      e.program_id as current_program_id, p.name as current_program, p.slug as current_program_slug,
      cl.id as current_lesson_id, cl.title as current_lesson,
      private.member_lessons_done(m.user_id) as lessons_done,
      greatest((select max(en.last_active_at) from public.enrollments en where en.user_id = m.user_id),
               (select max(sp.completed_at) from public.step_progress sp where sp.user_id = m.user_id)) as last_active_at,
      private.member_streak(m.user_id) as streak,
      rr.band_name as readiness_band_name, rr.band as readiness_band, rr.created_at as readiness_at
    from public.org_members m
    left join public.profiles pr on pr.id = m.user_id
    left join lateral (
      select en.program_id, en.path_id from public.enrollments en where en.user_id = m.user_id
      order by (en.completed_at is null) desc, en.last_active_at desc limit 1) e on true
    left join public.programs p on p.id = e.program_id
    left join lateral (
      select l.id, l.title from public.lessons l
      where e.program_id is not null and l.id = private.current_lesson(m.user_id, e.program_id, e.path_id)) cl on true
    left join lateral (
      select r.band_name, r.band, r.created_at from public.readiness_results r where r.user_id = m.user_id
      order by r.created_at desc limit 1) rr on true
    where m.org_id = p_org and m.status = 'active' and private.can_view_member(v_user, m.user_id)
  ) x;

  return jsonb_build_object(
    'org', jsonb_build_object('id', v_org.id, 'name', v_org.name, 'slug', v_org.slug, 'logo_url', v_org.logo_url,
                              'status', v_org.status, 'grace_until', v_org.grace_until, 'plan_id', v_org.plan_id,
                              'seats_total', v_org.seats, 'seats_used', v_used),
    'viewer_role', coalesce(private.org_role(v_user, p_org), 'platform_admin'),
    'members', v_members);
end $$;

-- ================================================================= experiences
create or replace function public.apply_to_run(p_run uuid, p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_run record; v_status text; v_app record;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_run from public.program_runs where id = p_run;
  if v_run.id is null then raise exception 'run not found'; end if;
  if v_run.status not in ('open', 'waitlist', 'full') then raise exception 'this run is not taking applications'; end if;
  v_status := case when v_run.status = 'open' then 'submitted' else 'waitlist' end;

  select * into v_app from public.run_applications where run_id = p_run and user_id = v_user for update;
  if v_app.id is null then
    insert into public.run_applications (run_id, user_id, answers, status)
      values (p_run, v_user, coalesce(p_answers, '{}'::jsonb), v_status) returning * into v_app;
  elsif v_app.status in ('declined', 'cancelled') then
    update public.run_applications set answers = coalesce(p_answers, '{}'::jsonb), status = v_status, updated_at = now()
      where id = v_app.id returning * into v_app;
  elsif v_app.status in ('submitted', 'waitlist') then
    update public.run_applications set answers = coalesce(p_answers, '{}'::jsonb), updated_at = now()
      where id = v_app.id returning * into v_app;
  end if;  -- call_booked / accepted / booked: keep as is
  return jsonb_build_object('application_id', v_app.id, 'status', v_app.status);
end $$;

-- The member's retreat/run applications and coaching, for the Experiences screen.
create or replace function public.my_experiences()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_runs jsonb; v_bookings jsonb; v_credits int;
begin
  if v_user is null then raise exception 'not signed in'; end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.starts_at), '[]'::jsonb) into v_runs from (
    select a.id as application_id, a.status, a.created_at as applied_at,
      r.id as run_id, r.name as run_name, r.starts_at, r.ends_at, r.timezone, r.status as run_status,
      r.location, r.price_note, r.draft_note,
      p.id as program_id, p.slug as program_slug, p.name as program_name, p.type as program_type,
      greatest(((r.starts_at at time zone r.timezone)::date - (now() at time zone r.timezone)::date), 0) as countdown_days,
      case when now() < r.starts_at then 'before' when r.ends_at is not null and now() > r.ends_at then 'after' else 'during' end as phase,
      nxt.item as next_itinerary_item,
      jsonb_build_object('done', coalesce(ck.done, 0), 'total', coalesce(ck.total, 0)) as checklist
    from public.run_applications a
    join public.program_runs r on r.id = a.run_id
    join public.programs p on p.id = r.program_id
    left join lateral (
      select jsonb_build_object('id', i.id, 'day_index', i.day_index, 'title', i.title, 'description', i.description,
                                'location', i.location,
                                'at', ((((r.starts_at at time zone r.timezone)::date + (i.day_index - 1))
                                        + coalesce(i.starts_at, time '00:00')) at time zone r.timezone)) as item
      from public.itinerary_items i where i.run_id = r.id
        and ((((r.starts_at at time zone r.timezone)::date + (i.day_index - 1)) + coalesce(i.starts_at, time '23:59')) at time zone r.timezone) >= now()
      order by i.day_index, i.starts_at nulls last, i.position limit 1) nxt on true
    left join lateral (
      select count(*)::int as total,
             count(*) filter (where exists (select 1 from public.run_checklist c
                     where c.user_id = v_user and c.run_id = r.id and c.item_key = it->>'id' and c.done))::int as done
      from jsonb_array_elements(coalesce(r.details->'prerequisites', '[]'::jsonb) || coalesce(r.details->'packing', '[]'::jsonb)) it) ck on true
    where a.user_id = v_user and a.status <> 'cancelled'
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'starts_at', b.starts_at, 'duration_minutes', b.duration_minutes,
           'status', b.status, 'meeting_url', b.meeting_url, 'member_note', b.member_note,
           'can_cancel_with_refund', b.status = 'booked' and b.starts_at - now() >= interval '24 hours',
           'package', cp.name) order by b.starts_at desc), '[]'::jsonb) into v_bookings
  from public.coaching_bookings b
  left join public.coaching_credits cc on cc.id = b.credit_id
  left join public.coaching_packages cp on cp.id = cc.package_id
  where b.user_id = v_user;

  select coalesce(sum(total - used), 0)::int into v_credits from public.coaching_credits
    where user_id = v_user and used < total and (expires_at is null or expires_at > now());

  return jsonb_build_object('runs', v_runs, 'coaching', jsonb_build_object('credits_remaining', v_credits, 'bookings', v_bookings));
end $$;

create or replace function public.book_coaching(p_slot uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_slot record; v_credit record; v_id uuid;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_slot from public.coaching_slots where id = p_slot for update;
  if v_slot.id is null or not v_slot.is_open or v_slot.starts_at <= now() then raise exception 'this time is no longer available'; end if;
  select * into v_credit from public.coaching_credits
    where user_id = v_user and used < total and (expires_at is null or expires_at > v_slot.starts_at)
    order by created_at, id limit 1 for update;
  if v_credit.id is null then raise exception 'no coaching credits left'; end if;
  update public.coaching_credits set used = used + 1 where id = v_credit.id;
  insert into public.coaching_bookings (user_id, credit_id, slot_id, starts_at, duration_minutes, status, member_note)
    values (v_user, v_credit.id, v_slot.id, v_slot.starts_at, v_slot.duration_minutes, 'booked', nullif(trim(p_note), ''))
    returning id into v_id;
  update public.coaching_slots set is_open = false where id = v_slot.id;
  return jsonb_build_object('booking_id', v_id, 'starts_at', v_slot.starts_at, 'credit_id', v_credit.id,
                            'credits_left', v_credit.total - v_credit.used - 1);
end $$;

-- Cancelling 24h or more before the start returns the credit and reopens the slot.
create or replace function public.cancel_coaching(p_booking uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_b record; v_refund boolean;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_b from public.coaching_bookings where id = p_booking and user_id = v_user for update;
  if v_b.id is null then raise exception 'booking not found'; end if;
  if v_b.status <> 'booked' then raise exception 'this session is not booked'; end if;
  v_refund := v_b.starts_at - now() >= interval '24 hours';
  update public.coaching_bookings set status = 'cancelled' where id = v_b.id;
  if v_refund then
    update public.coaching_credits set used = greatest(used - 1, 0) where id = v_b.credit_id;
    update public.coaching_slots set is_open = true where id = v_b.slot_id and starts_at > now();
  end if;
  return jsonb_build_object('cancelled', true, 'credit_returned', v_refund and v_b.credit_id is not null);
end $$;

-- When an application becomes booked (admin by hand, or apply_paid_order), grant the run program's inclusions.
create or replace function private.grant_run_inclusions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_program uuid; inc record;
begin
  if new.status <> 'booked' or (tg_op = 'UPDATE' and old.status = 'booked') then return new; end if;
  select program_id into v_program from public.program_runs where id = new.run_id;
  for inc in select * from public.program_inclusions where parent_program_id = v_program loop
    if not exists (
      select 1 from public.access_grants g
      where g.user_id = new.user_id and g.program_id = inc.included_program_id and g.scope = 'content'
        and g.source = 'inclusion' and g.revoked_at is null and (g.ends_at is null or g.ends_at > now())) then
      insert into public.access_grants (user_id, program_id, scope, source, source_ref, starts_at, ends_at, note)
      values (new.user_id, inc.included_program_id, 'content', 'inclusion', new.run_id::text, now(),
              case when inc.access_days is not null then now() + make_interval(days => inc.access_days) end,
              'Included with booked run');
    end if;
  end loop;
  return new;
end $$;
create trigger run_applications_booked after insert or update of status on public.run_applications
  for each row execute function private.grant_run_inclusions();

-- ================================================================= goals and plans
-- Template items: [{seq, week, session, kind:'training'|'recovery', lesson_id, lesson_key, title, note}] in order.
-- Sessions are placed one per chosen weekday from p_starts_on (inclusive); lessons the member
-- cannot open are skipped. Returns the new member_plans id.
create or replace function public.start_plan_from_template(p_template uuid, p_starts_on date default null, p_days int[] default '{1,3,5}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_t record; v_days int[] := private.norm_weekdays(p_days); v_plan uuid;
  v_cursor date; v_goal uuid; it jsonb; v_lesson uuid; v_title text; v_pos int := 0;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if coalesce(array_length(v_days, 1), 0) = 0 then raise exception 'choose at least one training day'; end if;
  select * into v_t from public.plan_templates where id = p_template and (is_published or private.has_role(v_user, 'admin'));
  if v_t.id is null then raise exception 'plan template not found'; end if;
  v_cursor := coalesce(p_starts_on, private.member_today(v_user));
  select id into v_goal from public.goals where user_id = v_user and kind = v_t.goal_kind and status = 'active'
    order by created_at desc limit 1;

  insert into public.member_plans (user_id, goal_id, template_id, name, source, status, starts_on, inputs, overview)
    values (v_user, v_goal, v_t.id, v_t.name, 'template', 'active', v_cursor,
            jsonb_build_object('days', to_jsonb(v_days), 'template', v_t.slug), v_t.description)
    returning id into v_plan;

  for it in select value from jsonb_array_elements(v_t.items) order by coalesce((value->>'seq')::int, 0) loop
    v_lesson := null; v_title := it->>'title';
    if it ? 'lesson_id' and nullif(it->>'lesson_id', '') is not null then
      select l.id, coalesce(v_title, l.title) into v_lesson, v_title from public.lessons l where l.id = (it->>'lesson_id')::uuid;
    elsif nullif(it->>'lesson_key', '') is not null then
      select l.id, coalesce(v_title, l.title) into v_lesson, v_title from public.lessons l where l.key = it->>'lesson_key';
    end if;
    if (it ? 'lesson_id' or it ? 'lesson_key') and v_lesson is null then continue; end if;   -- lesson removed
    if v_lesson is not null and not private.has_access(v_user, (select program_id from public.lessons where id = v_lesson)) then
      continue;
    end if;
    while not (extract(dow from v_cursor)::int = any(v_days)) loop v_cursor := v_cursor + 1; end loop;
    v_pos := v_pos + 1;
    insert into public.plan_items (plan_id, user_id, on_date, kind, lesson_id, title, note, position)
      values (v_plan, v_user, v_cursor, coalesce(nullif(it->>'kind', ''), 'training'), v_lesson, v_title, it->>'note', v_pos);
    v_cursor := v_cursor + 1;
  end loop;
  return v_plan;
end $$;

-- Immersion "Scheduled pace": remaining lessons on training days, in order. Pages (overview/transition)
-- attach to the next training date without using it up. Re-running archives the previous schedule and makes a new one.
create or replace function public.schedule_immersion(p_enrollment uuid, p_days int[], p_starts_on date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_e record; v_days int[] := private.norm_weekdays(p_days); v_plan uuid;
  v_cursor date; r record; v_pos int := 0; v_name text;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if coalesce(array_length(v_days, 1), 0) = 0 then raise exception 'choose at least one training day'; end if;
  select * into v_e from public.enrollments where id = p_enrollment and user_id = v_user for update;
  if v_e.id is null then raise exception 'enrollment not found'; end if;
  if not private.has_access(v_user, v_e.program_id) then raise exception 'no access'; end if;
  v_cursor := coalesce(p_starts_on, private.member_today(v_user));

  update public.enrollments set pace = 'scheduled', training_days = v_days, last_active_at = now() where id = v_e.id;
  update public.member_plans set status = 'archived'
    where user_id = v_user and source = 'immersion_schedule' and status <> 'archived' and inputs->>'enrollment_id' = v_e.id::text;

  select p.name || coalesce(' · ' || pp.short_name, ' · ' || pp.name, '') into v_name
    from public.programs p left join public.program_paths pp on pp.id = v_e.path_id where p.id = v_e.program_id;
  insert into public.member_plans (user_id, name, source, status, starts_on, inputs)
    values (v_user, v_name, 'immersion_schedule', 'active', v_cursor,
            jsonb_build_object('enrollment_id', v_e.id, 'program_id', v_e.program_id, 'path_id', v_e.path_id, 'days', to_jsonb(v_days)))
    returning id into v_plan;

  for r in
    select o.lesson_id, o.page_type, l.title from private.ordered_lessons(v_e.program_id, v_e.path_id) o
    join public.lessons l on l.id = o.lesson_id
    where not private.lesson_done(v_user, o.lesson_id) order by o.ord
  loop
    while not (extract(dow from v_cursor)::int = any(v_days)) loop v_cursor := v_cursor + 1; end loop;
    v_pos := v_pos + 1;
    insert into public.plan_items (plan_id, user_id, on_date, kind, lesson_id, title, position)
      values (v_plan, v_user, v_cursor, 'training', r.lesson_id, r.title, v_pos);
    if r.page_type is null then v_cursor := v_cursor + 1; end if;
  end loop;
  return v_plan;
end $$;

-- "Fix my plan" (legacy schedule page):
--   shift   — every item from the earliest missed day on moves forward so that day lands on today
--   skip    — missed items are marked skipped; the rest stands
--   weekend — missed items, in order, go to the next free Saturday/Sunday after today
-- Missed = before today, not done (flag or lesson complete), not skipped, not a rest day.
-- Rule: the enrollment's missed_day_rule for immersion schedules, shift otherwise.
create or replace function public.apply_missed_day_rule(p_plan uuid, p_today date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_plan record; v_rule text := 'shift'; v_today date; v_earliest date; v_offset int;
  v_count int := 0; v_changed int := 0; v_cursor date; v_item uuid; v_missed uuid[]; v_taken date[];
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_plan from public.member_plans where id = p_plan and user_id = v_user for update;
  if v_plan.id is null then raise exception 'plan not found'; end if;
  v_today := coalesce(p_today, private.member_today(v_user));
  if v_plan.source = 'immersion_schedule' then
    select e.missed_day_rule into v_rule from public.enrollments e
      where e.id = (v_plan.inputs->>'enrollment_id')::uuid and e.user_id = v_user;
    v_rule := coalesce(v_rule, 'shift');
  end if;

  select coalesce(array_agg(i.id order by i.on_date, i.position), '{}'), count(*), min(i.on_date)
    into v_missed, v_count, v_earliest
    from public.plan_items i
    where i.plan_id = p_plan and i.on_date < v_today and i.done_at is null and i.skipped_at is null and i.kind <> 'rest'
      and not (i.lesson_id is not null and private.lesson_done(v_user, i.lesson_id));
  if v_count = 0 then return jsonb_build_object('rule', v_rule, 'missed', 0, 'changed', 0); end if;

  if v_rule = 'skip' then
    update public.plan_items set skipped_at = now() where id = any(v_missed);
  elsif v_rule = 'weekend' then
    select coalesce(array_agg(distinct on_date), '{}') into v_taken from public.plan_items
      where plan_id = p_plan and on_date >= v_today and skipped_at is null;
    v_cursor := v_today;
    foreach v_item in array v_missed loop
      loop
        v_cursor := v_cursor + 1;
        exit when extract(dow from v_cursor)::int in (0, 6) and not (v_cursor = any(v_taken));
      end loop;
      v_taken := v_taken || v_cursor;
      update public.plan_items set on_date = v_cursor where id = v_item;
    end loop;
  else
    v_offset := v_today - v_earliest;
    update public.plan_items set on_date = on_date + v_offset
      where plan_id = p_plan and on_date >= v_earliest and skipped_at is null;
    get diagnostics v_changed = row_count;
    return jsonb_build_object('rule', 'shift', 'missed', v_count, 'changed', v_changed, 'offset_days', v_offset);
  end if;
  return jsonb_build_object('rule', v_rule, 'missed', v_count, 'changed', v_count);
end $$;

-- One calendar feed: plan items, live run sessions (booked runs) and coaching bookings in a date range.
create or replace function public.my_week(p_from date, p_to date)
returns table (
  kind text, on_date date, starts_at timestamptz, title text, subtitle text,
  plan_id uuid, plan_item_id uuid, item_kind text, lesson_id uuid, program_id uuid, program_name text, program_slug text,
  ref_id uuid, done boolean, skipped boolean, sort_order int)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_tz text;
begin
  if v_user is null then return; end if;
  if p_to < p_from or p_to - p_from > 92 then raise exception 'choose a range of up to 92 days'; end if;
  select coalesce(nullif(timezone, ''), 'UTC') into v_tz from public.profiles where id = v_user;
  v_tz := coalesce(v_tz, 'UTC');
  return query
    select 'plan'::text, i.on_date, null::timestamptz, coalesce(l.title, i.title, initcap(i.kind)), mp.name,
           mp.id, i.id, i.kind, i.lesson_id, p.id, p.name, p.slug,
           null::uuid, (i.done_at is not null or (i.lesson_id is not null and private.lesson_done(v_user, i.lesson_id))),
           i.skipped_at is not null, i.position
    from public.plan_items i
    join public.member_plans mp on mp.id = i.plan_id and mp.status = 'active'
    left join public.lessons l on l.id = i.lesson_id
    left join public.programs p on p.id = l.program_id
    where i.user_id = v_user and i.on_date between p_from and p_to
  union all
    select 'run_session'::text, (s.starts_at at time zone v_tz)::date, s.starts_at, s.title, r.name,
           null::uuid, null::uuid, null::text, null::uuid, p.id, p.name, p.slug,
           s.id, s.ends_at is not null and s.ends_at < now(), false, s.position
    from public.run_sessions s
    join public.program_runs r on r.id = s.run_id
    join public.programs p on p.id = r.program_id
    join public.run_applications a on a.run_id = r.id and a.user_id = v_user and a.status = 'booked'
    where (s.starts_at at time zone v_tz)::date between p_from and p_to
  union all
    select 'coaching'::text, (b.starts_at at time zone v_tz)::date, b.starts_at, 'Coaching with Mike', b.status,
           null::uuid, null::uuid, null::text, null::uuid, null::uuid, null::text, null::text,
           b.id, b.status = 'completed', b.status = 'cancelled', 0
    from public.coaching_bookings b
    where b.user_id = v_user and b.status <> 'cancelled' and (b.starts_at at time zone v_tz)::date between p_from and p_to
  order by 2, 3 nulls first, 16;
end $$;

-- ================================================================= intake
-- Condition format (JSON):
--   {"all":[c..]} | {"any":[c..]} | {"not":c} | {"count":[c..],"gte":n}
--   {"q":key,"eq":v} | {"q":key,"neq":v} (true when missing) | {"q":key,"in":[..]} | {"q":key,"has":v}
--   {"q":key,"has_any":[..]} | {"q":key,"num_gte":n} | {"q":key,"num_eq":n} | {"q":key,"answered":true}
-- Numbers are read from the leading integer of the answer ("5 — Coach / Advanced" -> 5).
create or replace function private.intake_cond(p_answers jsonb, c jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_one text; v_list text[]; v_num int; x jsonb; v_n int := 0;
begin
  if c is null or c = '{}'::jsonb then return true; end if;
  if c ? 'all' then
    for x in select value from jsonb_array_elements(c->'all') loop
      if not private.intake_cond(p_answers, x) then return false; end if;
    end loop;
    return true;
  elsif c ? 'any' then
    for x in select value from jsonb_array_elements(c->'any') loop
      if private.intake_cond(p_answers, x) then return true; end if;
    end loop;
    return false;
  elsif c ? 'not' then
    return not private.intake_cond(p_answers, c->'not');
  elsif c ? 'count' then
    for x in select value from jsonb_array_elements(c->'count') loop
      if private.intake_cond(p_answers, x) then v_n := v_n + 1; end if;
    end loop;
    return v_n >= coalesce((c->>'gte')::int, 1);
  end if;
  v_one := private.answer_one(p_answers, c->>'q');
  v_list := private.answer_list(p_answers, c->>'q');
  v_num := nullif(substring(coalesce(v_one, '') from '^\s*(\d+)'), '')::int;
  if c ? 'eq' then return v_one is not distinct from (c->>'eq'); end if;
  if c ? 'neq' then return v_one is distinct from (c->>'neq'); end if;
  if c ? 'in' then return v_one is not null and v_one in (select jsonb_array_elements_text(c->'in')); end if;
  if c ? 'has' then return (c->>'has') = any(v_list); end if;
  if c ? 'has_any' then return v_list && (select array_agg(x2) from jsonb_array_elements_text(c->'has_any') x2); end if;
  if c ? 'num_gte' then return coalesce(v_num, 0) >= (c->>'num_gte')::int; end if;
  if c ? 'num_eq' then return coalesce(v_num, 0) = (c->>'num_eq')::int; end if;
  if c ? 'answered' then return (cardinality(v_list) > 0) = (c->>'answered')::boolean; end if;
  raise exception 'unknown intake condition %', c;
end $$;

-- Evaluates intake_forms.result_rules:
--   kind 'first_match': {rules:[{when, result}], default, notes:[{when, text}], notes_limit, notes_default:[text]}
--       -> result || {notes:[...]}  (KBL level recommendation)
--   kind 'score': {buckets:[..], order:[..], rules:[{when, add:{bucket:n}, reason, suppress_tie_reason}],
--       none:bucket, none_reason, tie:bucket, tie_reason, outcomes:{bucket:{...}},
--       flags:[{key, when, reason, override:{...}}], pace:{q, map:{answer:text}, default}}
--       -> outcome || {bucket, scores, reasons, flags, pace}  (MTK focus path)
create or replace function private.intake_result(p_rules jsonb, p_answers jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  r jsonb; v_out jsonb; v_notes jsonb := '[]'::jsonb; v_scores jsonb := '{}'::jsonb; v_reasons jsonb := '[]'::jsonb;
  v_suppress boolean := false; b text; k text; v_top int; v_leaders text[]; v_bucket text; v_flags jsonb := '{}'::jsonb;
begin
  if p_rules is null or p_rules = '{}'::jsonb then return '{}'::jsonb; end if;

  if p_rules->>'kind' = 'first_match' then
    for r in select value from jsonb_array_elements(coalesce(p_rules->'rules', '[]')) loop
      if private.intake_cond(p_answers, r->'when') then v_out := r->'result'; exit; end if;
    end loop;
    v_out := coalesce(v_out, p_rules->'default', '{}'::jsonb);
    for r in select value from jsonb_array_elements(coalesce(p_rules->'notes', '[]')) loop
      if private.intake_cond(p_answers, r->'when') then v_notes := v_notes || jsonb_build_array(r->>'text'); end if;
    end loop;
    if jsonb_array_length(v_notes) = 0 then v_notes := coalesce(p_rules->'notes_default', '[]'::jsonb); end if;
    select coalesce(jsonb_agg(t.value order by t.n), '[]'::jsonb) into v_notes
      from jsonb_array_elements(v_notes) with ordinality t(value, n)
      where t.n <= coalesce((p_rules->>'notes_limit')::int, 100);
    return v_out || jsonb_build_object('notes', v_notes);
  end if;

  if p_rules->>'kind' = 'score' then
    for b in select jsonb_array_elements_text(p_rules->'buckets') loop v_scores := v_scores || jsonb_build_object(b, 0); end loop;
    for r in select value from jsonb_array_elements(coalesce(p_rules->'rules', '[]')) loop
      if private.intake_cond(p_answers, r->'when') then
        for k in select jsonb_object_keys(coalesce(r->'add', '{}')) loop
          v_scores := jsonb_set(v_scores, array[k], to_jsonb(coalesce((v_scores->>k)::int, 0) + (r->'add'->>k)::int));
        end loop;
        if r ? 'reason' then v_reasons := v_reasons || jsonb_build_array(r->>'reason'); end if;
        if coalesce((r->>'suppress_tie_reason')::boolean, false) then v_suppress := true; end if;
      end if;
    end loop;
    select max((v_scores->>x)::int) into v_top from jsonb_array_elements_text(p_rules->'order') x;
    select array_agg(x order by o) into v_leaders from jsonb_array_elements_text(p_rules->'order') with ordinality t(x, o)
      where (v_scores->>x)::int = v_top;
    if v_top = 0 then
      v_bucket := p_rules->>'none';
      if p_rules ? 'none_reason' then v_reasons := v_reasons || jsonb_build_array(p_rules->>'none_reason'); end if;
    elsif cardinality(v_leaders) > 1 then
      v_bucket := p_rules->>'tie';
      if p_rules ? 'tie_reason' and not v_suppress then v_reasons := v_reasons || jsonb_build_array(p_rules->>'tie_reason'); end if;
    else
      v_bucket := v_leaders[1];
    end if;
    v_out := coalesce(p_rules->'outcomes'->v_bucket, '{}'::jsonb);
    for r in select value from jsonb_array_elements(coalesce(p_rules->'flags', '[]')) loop
      v_flags := v_flags || jsonb_build_object(r->>'key', private.intake_cond(p_answers, r->'when'));
      if (v_flags->>(r->>'key'))::boolean then
        if r ? 'reason' then v_reasons := v_reasons || jsonb_build_array(r->>'reason'); end if;
        if r ? 'override' then
          v_out := v_out || ((r->'override') - 'initial_focus_prefix'::text)
                 || case when r->'override' ? 'initial_focus_prefix'
                         then jsonb_build_object('initial_focus', (r->'override'->'initial_focus_prefix')
                              || coalesce((select jsonb_agg(t.value order by t.n) from jsonb_array_elements(coalesce(v_out->'initial_focus', '[]'))
                                           with ordinality t(value, n) where t.n <= coalesce((r->'override'->>'keep_focus')::int, 100)), '[]'::jsonb))
                         else '{}'::jsonb end;
          v_out := v_out - 'keep_focus';
        end if;
      end if;
    end loop;
    return v_out || jsonb_build_object(
      'bucket', v_bucket, 'scores', v_scores, 'reasons', v_reasons, 'flags', v_flags,
      'pace', coalesce(p_rules->'pace'->'map'->>private.answer_one(p_answers, p_rules->'pace'->>'q'), p_rules->'pace'->>'default'));
  end if;
  return '{}'::jsonb;
end $$;

-- Saves a response (retakes add rows; progress is never touched) and returns the computed result.
--   KBL intake     -> recommended level path (path_key, path_id)
--   MTK intake     -> recommended focus path (path_key, path_id, start_section, reasons, pace)
--   goal-setting   -> creates/updates the member's active goal of that kind and suggests a plan template
create or replace function public.submit_intake(p_form uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_f record; v_result jsonb := '{}'::jsonb; v_id uuid; v_goal uuid; v_kind text;
  v_programs uuid[]; v_target date; v_approach text; v_t record; v_label text;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'answers must be an object'; end if;
  select * into v_f from public.intake_forms where id = p_form and (is_published or private.has_role(v_user, 'admin'));
  if v_f.id is null then raise exception 'form not found'; end if;

  if coalesce(v_f.result_rules->>'kind', '') in ('first_match', 'score') then
    v_result := private.intake_result(v_f.result_rules, p_answers);
    if v_result ? 'path_key' then
      v_result := v_result || jsonb_build_object('path_id', (select id from public.program_paths where key = v_result->>'path_key'));
    end if;
  elsif v_f.result_rules->>'kind' = 'goal' then
    v_kind := coalesce(private.answer_one(p_answers, coalesce(v_f.result_rules->>'goal_q', 'goal_kind')), 'custom');
    v_target := nullif(private.answer_one(p_answers, coalesce(v_f.result_rules->>'target_q', 'target_date')), '')::date;
    v_approach := case when private.answer_one(p_answers, coalesce(v_f.result_rules->>'approach_q', 'approach')) = 'custom' then 'custom' else 'guided' end;
    select coalesce(array_agg(p.id), '{}') into v_programs from public.programs p
      where p.slug = any(private.answer_list(p_answers, coalesce(v_f.result_rules->>'programs_q', 'programs')))
         or p.id::text = any(private.answer_list(p_answers, coalesce(v_f.result_rules->>'programs_q', 'programs')));
    v_label := coalesce(v_f.result_rules->'titles'->>v_kind, initcap(replace(v_kind, '_', ' ')));
    select id into v_goal from public.goals where user_id = v_user and kind = v_kind and status = 'active'
      order by created_at desc limit 1 for update;
    if v_goal is null then
      insert into public.goals (user_id, kind, title, target_date, program_ids, approach)
        values (v_user, v_kind, v_label, v_target, v_programs, v_approach) returning id into v_goal;
    else
      -- a retake only overwrites what it answers
      update public.goals set title = v_label,
        target_date = case when p_answers ? coalesce(v_f.result_rules->>'target_q', 'target_date') then v_target else target_date end,
        program_ids = case when p_answers ? coalesce(v_f.result_rules->>'programs_q', 'programs') then v_programs else program_ids end,
        approach = case when p_answers ? coalesce(v_f.result_rules->>'approach_q', 'approach') then v_approach else approach end
        where id = v_goal;
    end if;
    select id, slug, name, weeks, days_per_week, description into v_t from public.plan_templates
      where goal_kind = v_kind and is_published order by position limit 1;
    v_result := jsonb_build_object('goal_id', v_goal, 'goal_kind', v_kind, 'approach', v_approach,
      'days_per_week', nullif(private.answer_one(p_answers, 'days_per_week'), ''),
      'suggested_template', case when v_t.id is null then null else
        jsonb_build_object('id', v_t.id, 'slug', v_t.slug, 'name', v_t.name, 'weeks', v_t.weeks,
                           'days_per_week', v_t.days_per_week, 'description', v_t.description) end);
  end if;

  insert into public.intake_responses (user_id, form_id, answers, result) values (v_user, p_form, p_answers, v_result)
    returning id into v_id;
  return v_result || jsonb_build_object('response_id', v_id, 'form_key', v_f.key);
end $$;

-- ================================================================= library
create or replace function public.library_videos(
  p_query text default null, p_program uuid default null, p_tags text[] default null, p_limit int default 60, p_offset int default 0)
returns table (
  id uuid, provider text, provider_id text, privacy_hash text, title text, description text, duration_seconds int,
  thumbnail_url text, level text, category text, programs jsonb, tags jsonb, saved boolean, total_count bigint)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as uid),
  ok as (select p.id from public.programs p where private.has_access((select uid from me), p.id, 'content')),
  q as (select nullif(trim(coalesce(p_query, '')), '') as s),
  v as (
    select vd.* from public.videos vd
    where (select uid from me) is not null
      and exists (select 1 from public.program_videos pv where pv.video_id = vd.id and pv.in_library
                    and pv.program_id in (select id from ok) and (p_program is null or pv.program_id = p_program))
      and ((select s from q) is null
           or vd.title ilike '%' || (select s from q) || '%'
           or exists (select 1 from public.video_tags vt join public.tags t on t.id = vt.tag_id
                      where vt.video_id = vd.id and (t.name ilike '%' || (select s from q) || '%' or t.slug ilike '%' || (select s from q) || '%')))
      and (p_tags is null or cardinality(p_tags) = 0 or not exists (
            select 1 from unnest(p_tags) want
            where not exists (select 1 from public.video_tags vt join public.tags t on t.id = vt.tag_id
                              where vt.video_id = vd.id and (t.slug = want or t.name = want or t.namespace || ':' || t.slug = want))))
  )
  select v.id, v.provider, v.provider_id, v.privacy_hash, v.title, v.description, v.duration_seconds, v.thumbnail_url,
    v.level, v.category,
    coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'slug', p.slug) order by p.position)
              from public.program_videos pv join public.programs p on p.id = pv.program_id
              where pv.video_id = v.id and pv.in_library and p.status = 'published' and p.id in (select id from ok)), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('namespace', t.namespace, 'slug', t.slug, 'name', t.name) order by t.namespace, t.name)
              from public.video_tags vt join public.tags t on t.id = vt.tag_id where vt.video_id = v.id), '[]'::jsonb),
    exists (select 1 from public.saved_videos sv where sv.user_id = (select uid from me) and sv.video_id = v.id),
    count(*) over ()
  from v
  order by v.title, v.id
  limit least(greatest(coalesce(p_limit, 60), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ================================================================= grants
revoke all on function
  private.answer_one(jsonb, text), private.answer_list(jsonb, text), private.member_today(uuid), private.member_streak(uuid),
  private.member_lessons_done(uuid), private.current_lesson(uuid, uuid, uuid), private.norm_weekdays(int[]),
  private.org_role(uuid, uuid), private.require_org_manager(uuid), private.org_add_member(uuid, uuid, text),
  private.grant_run_inclusions(), private.intake_cond(jsonb, jsonb), private.intake_result(jsonb, jsonb)
  from public, anon, authenticated;

revoke all on function
  public.accept_org_invite(text), public.join_org(text), public.org_admin_invite(uuid, text, text),
  public.org_remove_member(uuid, uuid), public.org_set_coach(uuid, uuid, uuid), public.org_overview(uuid),
  public.apply_to_run(uuid, jsonb), public.my_experiences(), public.book_coaching(uuid, text), public.cancel_coaching(uuid),
  public.start_plan_from_template(uuid, date, int[]), public.schedule_immersion(uuid, int[], date),
  public.apply_missed_day_rule(uuid, date), public.my_week(date, date), public.submit_intake(uuid, jsonb),
  public.library_videos(text, uuid, text[], int, int)
  from public, anon;

grant execute on function
  public.accept_org_invite(text), public.join_org(text), public.org_admin_invite(uuid, text, text),
  public.org_remove_member(uuid, uuid), public.org_set_coach(uuid, uuid, uuid), public.org_overview(uuid),
  public.apply_to_run(uuid, jsonb), public.my_experiences(), public.book_coaching(uuid, text), public.cancel_coaching(uuid),
  public.start_plan_from_template(uuid, date, int[]), public.schedule_immersion(uuid, int[], date),
  public.apply_missed_day_rule(uuid, date), public.my_week(date, date), public.submit_intake(uuid, jsonb),
  public.library_videos(text, uuid, text[], int, int)
  to authenticated;
