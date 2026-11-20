-- Mike Salemi App v2 — server functions: access, progression, readiness, restart.
-- All member-facing writes to progress, readiness, rewards and certificates go through these.

-- ---------------------------------------------------------------- denormalization triggers
create or replace function private.fill_lesson_refs()
returns trigger language plpgsql set search_path = '' as $$
begin
  select s.program_id, s.path_id into new.program_id, new.path_id from public.sections s where s.id = new.section_id;
  return new;
end $$;
create trigger lessons_fill_refs before insert or update of section_id on public.lessons
  for each row execute function private.fill_lesson_refs();

create or replace function private.fill_step_refs()
returns trigger language plpgsql set search_path = '' as $$
begin
  select l.program_id into new.program_id from public.lessons l where l.id = new.lesson_id;
  return new;
end $$;
create trigger steps_fill_refs before insert or update of lesson_id on public.steps
  for each row execute function private.fill_step_refs();

-- ---------------------------------------------------------------- access
-- True when the user may open a program's content (or a retreat/coaching benefit for other scopes).
create or replace function private.has_access(p_user uuid, p_program uuid, p_scope public.benefit_scope default 'content')
returns boolean language sql stable security definer set search_path = '' as $$
  select
    p_user is not null and (
      private.has_role(p_user, 'admin')
      or (p_scope = 'content' and exists (
            select 1 from public.programs p where p.id = p_program and p.status = 'published' and p.is_free))
      -- direct grants (purchase, inclusion, migration, admin, reward, organization seat)
      or exists (
            select 1 from public.access_grants g
            where g.user_id = p_user and g.program_id = p_program and g.scope = p_scope
              and g.revoked_at is null and g.starts_at <= now() and (g.ends_at is null or g.ends_at > now()))
      -- personal subscription whose plan includes the program
      or exists (
            select 1 from public.subscriptions s
            join public.plan_program_benefits b on b.plan_id = s.plan_id and b.program_id = p_program and b.scope = p_scope and b.benefit = 'included'
            where s.user_id = p_user and s.status in ('trialing', 'active', 'past_due', 'cancelled') and s.current_period_end > now())
      -- organization seat: org plan includes it, or the org bought it for every seat
      or exists (
            select 1 from public.org_members m
            join public.organizations o on o.id = m.org_id
            where m.user_id = p_user and m.status = 'active'
              and (o.status = 'active' or (o.status = 'past_due' and o.grace_until > now()))
              and (
                exists (select 1 from public.plan_program_benefits b where b.plan_id = o.plan_id and b.program_id = p_program and b.scope = p_scope and b.benefit = 'included')
                or (p_scope = 'content' and exists (select 1 from public.org_programs op where op.org_id = o.id and op.program_id = p_program))
              ))
    );
$$;

create or replace function public.can_access(p_program uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_access((select auth.uid()), p_program, 'content');
$$;

-- Videos are visible when any program that uses them is accessible.
create or replace function private.can_view_video(p_user uuid, p_video uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.program_videos pv
    where pv.video_id = p_video and private.has_access(p_user, pv.program_id, 'content'));
$$;

-- Org admins see all their members; coaches see their assigned members.
create or replace function private.can_view_member(p_viewer uuid, p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_viewer = p_member or private.has_role(p_viewer, 'admin') or exists (
    select 1 from public.org_members me
    join public.org_members them on them.org_id = me.org_id and them.user_id = p_member and them.status = 'active'
    where me.user_id = p_viewer and me.status = 'active'
      and (me.role in ('owner', 'admin') or (me.role = 'coach' and them.coach_id = p_viewer)));
$$;

-- ---------------------------------------------------------------- ordering and completion helpers
-- Lessons of a program path in curriculum order (sections by position, then lessons by position).
create or replace function private.ordered_lessons(p_program uuid, p_path uuid)
returns table (lesson_id uuid, ord bigint, page_type text, section_id uuid)
language sql stable security definer set search_path = '' as $$
  select l.id, row_number() over (order by s.position, l.position), l.page_type, l.section_id
  from public.lessons l join public.sections s on s.id = l.section_id
  where l.program_id = p_program and l.path_id is not distinct from p_path;
$$;

create or replace function private.lesson_done(p_user uuid, p_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.steps st
    where st.lesson_id = p_lesson and st.is_required
      and not exists (select 1 from public.step_progress sp where sp.user_id = p_user and sp.step_id = st.id));
$$;

-- Is the program run in a locked order for this user (Immersion enrollment, or a sequence-locked course)?
create or replace function private.is_locked_order(p_user uuid, p_program uuid, p_path uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.sequence_locked from public.programs p where p.id = p_program), false)
      or exists (select 1 from public.enrollments e
                 where e.user_id = p_user and e.program_id = p_program and e.path_id is not distinct from p_path
                   and e.mode = 'immersion');
$$;

-- A lesson is open when order isn't locked, or every earlier lesson in its path is done.
create or replace function private.lesson_unlocked(p_user uuid, p_lesson uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_program uuid; v_path uuid; v_ord bigint;
begin
  select program_id, path_id into v_program, v_path from public.lessons where id = p_lesson;
  if v_program is null then return false; end if;
  if private.has_role(p_user, 'admin') then return true; end if;
  if not private.is_locked_order(p_user, v_program, v_path) then return true; end if;
  select ord into v_ord from private.ordered_lessons(v_program, v_path) where lesson_id = p_lesson;
  return not exists (
    select 1 from private.ordered_lessons(v_program, v_path) o
    where o.ord < v_ord and not private.lesson_done(p_user, o.lesson_id));
end $$;

create or replace function public.lesson_unlocked(p_lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.lesson_unlocked((select auth.uid()), p_lesson);
$$;

-- Lesson state for the current user: unlocked flag, the furthest open step, completed step ids.
create or replace function public.lesson_state(p_lesson uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_program uuid; v_path uuid; v_locked boolean; v_done uuid[]; v_open int := 0; r record;
begin
  select program_id, path_id into v_program, v_path from public.lessons where id = p_lesson;
  if v_program is null or not private.has_access(v_user, v_program) then
    return jsonb_build_object('access', false);
  end if;
  v_locked := private.is_locked_order(v_user, v_program, v_path);
  select coalesce(array_agg(sp.step_id), '{}') into v_done
    from public.step_progress sp join public.steps st on st.id = sp.step_id
    where sp.user_id = v_user and st.lesson_id = p_lesson;
  for r in select id, is_required from public.steps where lesson_id = p_lesson order by position loop
    exit when r.is_required and not (r.id = any(v_done));
    v_open := v_open + 1;
  end loop;
  return jsonb_build_object(
    'access', true,
    'locked_order', v_locked,
    'unlocked', private.lesson_unlocked(v_user, p_lesson),
    'open_through', v_open,          -- index of the first incomplete required step (steps before it are done)
    'completed_steps', to_jsonb(v_done),
    'done', private.lesson_done(v_user, p_lesson));
end $$;

-- ---------------------------------------------------------------- points (idempotent)
create or replace function private.award_points(p_user uuid, p_amount int, p_reason text, p_ref text)
returns void language sql security definer set search_path = '' as $$
  insert into public.points_ledger (user_id, amount, reason, ref) values (p_user, p_amount, p_reason, p_ref)
  on conflict (user_id, reason, ref) do nothing;
$$;

-- After a lesson completes: points, section/path milestones, certificate.
create or replace function private.after_lesson_complete(p_user uuid, p_lesson uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_l record; v_run int := 1; v_section_done boolean; v_path_done boolean; v_cert uuid; v_name text;
begin
  select l.id, l.program_id, l.path_id, l.section_id, l.page_type into v_l from public.lessons l where l.id = p_lesson;
  select coalesce(max(e.run_number), 1) into v_run from public.enrollments e
    where e.user_id = p_user and e.program_id = v_l.program_id and e.path_id is not distinct from v_l.path_id;
  perform private.award_points(p_user, case when v_l.page_type is null then 50 else 10 end, 'lesson', p_lesson::text || ':run' || v_run);

  select not exists (select 1 from public.lessons l where l.section_id = v_l.section_id and not private.lesson_done(p_user, l.id))
    into v_section_done;
  if v_section_done then
    perform private.award_points(p_user, 250, 'section', v_l.section_id::text || ':run' || v_run);
  end if;

  select not exists (select 1 from public.lessons l where l.program_id = v_l.program_id and l.path_id is not distinct from v_l.path_id
                     and not private.lesson_done(p_user, l.id))
    into v_path_done;
  if v_path_done then
    perform private.award_points(p_user, 1000, 'path', coalesce(v_l.path_id, v_l.program_id)::text || ':run' || v_run);
    select coalesce(nullif(p.display_name, ''), 'Member') into v_name from public.profiles p where p.id = p_user;
    insert into public.certificates (user_id, program_id, path_id, run_number, name_on_certificate)
      values (p_user, v_l.program_id, v_l.path_id, v_run, coalesce(v_name, 'Member'))
      on conflict (user_id, program_id, path_id, run_number) do nothing
      returning id into v_cert;
    update public.enrollments set completed_at = coalesce(completed_at, now())
      where user_id = p_user and program_id = v_l.program_id and path_id is not distinct from v_l.path_id;
  end if;

  return jsonb_build_object('lesson_done', true, 'section_done', v_section_done, 'path_done', v_path_done,
                            'section_id', v_l.section_id, 'certificate_id', v_cert);
end $$;

-- ---------------------------------------------------------------- enroll
create or replace function public.enroll(p_program uuid, p_path uuid default null, p_mode public.learning_mode default 'immersion')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_id uuid;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if not private.has_access(v_user, p_program) then raise exception 'no access to this program'; end if;
  if p_path is not null and not exists (select 1 from public.program_paths where id = p_path and program_id = p_program) then
    raise exception 'path does not belong to program';
  end if;
  insert into public.enrollments (user_id, program_id, path_id, mode)
    values (v_user, p_program, p_path, p_mode)
    on conflict (user_id, program_id, coalesce(path_id, '00000000-0000-0000-0000-000000000000'::uuid))
    do update set mode = excluded.mode, last_active_at = now()
    returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------- complete / uncomplete a step
create or replace function public.complete_step(p_step uuid, p_via text default 'button')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_st record; v_locked boolean; v_was_done boolean; v_result jsonb := '{}'::jsonb;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if p_via not in ('button', 'watched', 'sync') then raise exception 'invalid source'; end if;
  select st.id, st.lesson_id, st.program_id, st.special, st.position, l.path_id
    into v_st from public.steps st join public.lessons l on l.id = st.lesson_id where st.id = p_step;
  if v_st.id is null then raise exception 'step not found'; end if;
  if not private.has_access(v_user, v_st.program_id) then raise exception 'no access'; end if;
  if v_st.special = 'readiness' then raise exception 'readiness steps complete by submitting the assessment'; end if;

  v_locked := private.is_locked_order(v_user, v_st.program_id, v_st.path_id);
  if v_locked then
    if not private.lesson_unlocked(v_user, v_st.lesson_id) then raise exception 'this day is locked'; end if;
    if exists (select 1 from public.steps p where p.lesson_id = v_st.lesson_id and p.position < v_st.position and p.is_required
               and not exists (select 1 from public.step_progress sp where sp.user_id = v_user and sp.step_id = p.id)) then
      raise exception 'finish the previous step first';
    end if;
  end if;

  v_was_done := private.lesson_done(v_user, v_st.lesson_id);
  insert into public.step_progress (user_id, step_id, lesson_id, via) values (v_user, p_step, v_st.lesson_id, p_via)
    on conflict (user_id, step_id) do nothing;
  update public.enrollments set last_active_at = now()
    where user_id = v_user and program_id = v_st.program_id and path_id is not distinct from v_st.path_id;
  perform private.award_points(v_user, 5, 'step', p_step::text);

  if not v_was_done and private.lesson_done(v_user, v_st.lesson_id) then
    v_result := private.after_lesson_complete(v_user, v_st.lesson_id);
  end if;
  return v_result || jsonb_build_object('step_id', p_step, 'lesson_id', v_st.lesson_id);
end $$;

create or replace function public.uncomplete_step(p_step uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.step_progress where user_id = (select auth.uid()) and step_id = p_step;
$$;

-- ---------------------------------------------------------------- readiness
-- Scores answers with the form's weights, picks the band (or the form's default table),
-- stores the result with a snapshot of the prescription, and completes the readiness step.
create or replace function public.submit_readiness(p_lesson uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_l record; v_form record; v_q record; v_score int := 0; v_weight int;
  v_band record; v_prescription jsonb; v_id uuid; v_step uuid; v_clean jsonb := '{}'::jsonb; v_out jsonb := '{}'::jsonb;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select id, program_id, path_id, form_id into v_l from public.lessons where id = p_lesson;
  if v_l.id is null or v_l.form_id is null then raise exception 'this day has no readiness assessment'; end if;
  if not private.has_access(v_user, v_l.program_id) then raise exception 'no access'; end if;
  if private.is_locked_order(v_user, v_l.program_id, v_l.path_id) and not private.lesson_unlocked(v_user, p_lesson) then
    raise exception 'this day is locked';
  end if;
  select * into v_form from public.forms where id = v_l.form_id;

  for v_q in select key, options from public.form_questions where form_id = v_form.id order by position loop
    select (o->>'weight')::int into v_weight from jsonb_array_elements(v_q.options) o where o->>'value' = p_answers->>v_q.key;
    if v_weight is null then raise exception 'missing or invalid answer for %', v_q.key; end if;
    v_score := v_score + v_weight;
    v_clean := v_clean || jsonb_build_object(v_q.key, p_answers->>v_q.key);
    v_weight := null;
  end loop;

  select * into v_band from public.form_bands where form_id = v_form.id and v_score between min_score and max_score order by position limit 1;
  if v_band.id is null then
    -- Gravity Forms default confirmation: the full workout table
    select null::uuid as id, 'Full Workout'::text as name, 'green'::text as band, 'workout'::public.band_outcome as outcome,
           v_form.default_table_id as table_id, ''::text as message into v_band;
  end if;
  if v_band.table_id is not null then
    select jsonb_build_object('id', t.id, 'title', t.title, 'rows', t.rows, 'notes', t.notes, 'images', t.images)
      into v_prescription from public.workout_tables t where t.id = v_band.table_id;
  end if;

  insert into public.readiness_results (user_id, lesson_id, form_id, answers, score, band_name, band, outcome, table_id, prescription)
  values (v_user, p_lesson, v_form.id, v_clean, v_score, v_band.name, v_band.band, v_band.outcome, v_band.table_id, v_prescription)
  returning id into v_id;

  select id into v_step from public.steps where lesson_id = p_lesson and special = 'readiness' order by position limit 1;
  if v_step is not null then
    if not private.lesson_done(v_user, p_lesson) then
      insert into public.step_progress (user_id, step_id, lesson_id, via) values (v_user, v_step, p_lesson, 'readiness')
        on conflict (user_id, step_id) do nothing;
      perform private.award_points(v_user, 5, 'step', v_step::text);
      if private.lesson_done(v_user, p_lesson) then v_out := private.after_lesson_complete(v_user, p_lesson); end if;
    end if;
  end if;

  return v_out || jsonb_build_object('result_id', v_id, 'score', v_score, 'band_name', v_band.name, 'band', v_band.band,
    'outcome', v_band.outcome, 'table_id', v_band.table_id, 'message', v_band.message);
end $$;

-- ---------------------------------------------------------------- restart a path (archive, then wipe live progress)
create or replace function public.restart_path(p_program uuid, p_path uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_e record; v_lessons int; v_steps int; v_complete boolean;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select * into v_e from public.enrollments where user_id = v_user and program_id = p_program and path_id is not distinct from p_path;
  if v_e.id is null then raise exception 'not enrolled'; end if;

  select count(*) filter (where private.lesson_done(v_user, l.id)) into v_lessons
    from public.lessons l where l.program_id = p_program and l.path_id is not distinct from p_path;
  select count(*) into v_steps from public.step_progress sp join public.lessons l on l.id = sp.lesson_id
    where sp.user_id = v_user and l.program_id = p_program and l.path_id is not distinct from p_path;
  v_complete := v_e.completed_at is not null;

  insert into public.run_archive (user_id, program_id, path_id, run_number, started_at, completed, lessons_completed, steps_completed)
    values (v_user, p_program, p_path, v_e.run_number, v_e.started_at, v_complete, v_lessons, v_steps);

  delete from public.step_progress sp using public.lessons l
    where sp.lesson_id = l.id and sp.user_id = v_user and l.program_id = p_program and l.path_id is not distinct from p_path;
  delete from public.lesson_positions lp using public.lessons l
    where lp.lesson_id = l.id and lp.user_id = v_user and l.program_id = p_program and l.path_id is not distinct from p_path;

  update public.enrollments set run_number = run_number + 1, started_at = now(), completed_at = null, last_active_at = now()
    where id = v_e.id;
  return jsonb_build_object('run_number', v_e.run_number + 1, 'archived_lessons', v_lessons);
end $$;

-- ---------------------------------------------------------------- certificate verification (public)
create or replace function public.verify_certificate(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', c.name_on_certificate, 'program', p.name, 'path', pp.name, 'issued_at', c.issued_at, 'run', c.run_number)
  from public.certificates c join public.programs p on p.id = c.program_id left join public.program_paths pp on pp.id = c.path_id
  where c.verify_code = upper(p_code);
$$;

-- ---------------------------------------------------------------- referral code
create or replace function public.my_referral_code()
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_code text;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select code into v_code from public.referral_codes where user_id = v_user;
  if v_code is null then
    v_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    insert into public.referral_codes (user_id, code) values (v_user, v_code) on conflict (user_id) do nothing;
    select code into v_code from public.referral_codes where user_id = v_user;
  end if;
  return v_code;
end $$;

-- Lock down. The private schema is never exposed through the API, but access-rule helpers must be
-- executable by the querying role because row policies call them. Everything else stays revoked.
revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.has_role(uuid, public.app_role), private.is_admin(),
  private.has_access(uuid, uuid, public.benefit_scope), private.can_view_video(uuid, uuid),
  private.can_view_member(uuid, uuid) to anon, authenticated;
grant execute on function public.can_access(uuid), public.lesson_unlocked(uuid), public.lesson_state(uuid),
  public.enroll(uuid, uuid, public.learning_mode), public.complete_step(uuid, text), public.uncomplete_step(uuid),
  public.submit_readiness(uuid, jsonb), public.restart_path(uuid, uuid), public.my_referral_code() to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
revoke execute on function public.can_access(uuid), public.lesson_unlocked(uuid), public.lesson_state(uuid),
  public.enroll(uuid, uuid, public.learning_mode), public.complete_step(uuid, text), public.uncomplete_step(uuid),
  public.submit_readiness(uuid, jsonb), public.restart_path(uuid, uuid), public.my_referral_code() from anon, public;
