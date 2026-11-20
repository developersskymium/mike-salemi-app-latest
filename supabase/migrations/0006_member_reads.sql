-- Mike Salemi App v2 — read functions the screens need in one round trip.

-- Access state of every published program for the signed-in member (or 'locked'/'free' when signed out).
create or replace function public.program_access_states()
returns table (program_id uuid, state text)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as uid)
  select p.id,
    case
      when p.is_free then 'free'
      when (select uid from me) is null then 'locked'
      when private.has_role((select uid from me), 'admin') then 'owned'
      when exists (select 1 from public.access_grants g where g.user_id = (select uid from me) and g.program_id = p.id and g.scope = 'content'
                   and g.source <> 'organization' and g.revoked_at is null and g.starts_at <= now() and (g.ends_at is null or g.ends_at > now())) then 'owned'
      when exists (select 1 from public.subscriptions s join public.plan_program_benefits b
                     on b.plan_id = s.plan_id and b.program_id = p.id and b.scope = 'content' and b.benefit = 'included'
                   where s.user_id = (select uid from me) and s.current_period_end > now()
                     and s.status in ('trialing', 'active', 'past_due', 'cancelled')) then 'included'
      when private.has_access((select uid from me), p.id, 'content') then 'org'
      else 'locked'
    end
  from public.programs p
  where p.status = 'published';
$$;

-- Progress of every lesson in a program path for the signed-in member, in curriculum order, with lock state.
create or replace function public.curriculum_progress(p_program uuid, p_path uuid default null)
returns table (lesson_id uuid, ord bigint, done_steps int, total_steps int, complete boolean, unlocked boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_locked boolean; v_blocked boolean := false; r record;
begin
  if v_user is null or not private.has_access(v_user, p_program) then return; end if;
  v_locked := private.is_locked_order(v_user, p_program, p_path);
  for r in
    select o.lesson_id, o.ord,
      (select count(*) from public.steps st join public.step_progress sp on sp.step_id = st.id and sp.user_id = v_user
        where st.lesson_id = o.lesson_id and st.is_required)::int as done_steps,
      (select count(*) from public.steps st where st.lesson_id = o.lesson_id and st.is_required)::int as total_steps
    from private.ordered_lessons(p_program, p_path) o order by o.ord
  loop
    lesson_id := r.lesson_id; ord := r.ord; done_steps := r.done_steps; total_steps := r.total_steps;
    complete := r.done_steps >= r.total_steps;
    unlocked := (not v_locked) or (not v_blocked) or private.has_role(v_user, 'admin');
    if not complete then v_blocked := true; end if;
    return next;
  end loop;
end $$;

-- The member's enrollments with progress and the lesson to continue.
create or replace function public.my_enrollments()
returns table (
  enrollment_id uuid, program_id uuid, program_slug text, program_name text, program_type public.program_type,
  path_id uuid, path_name text, mode public.learning_mode, pace text, run_number int,
  lessons_total int, lessons_done int, steps_total int, steps_done int,
  current_lesson_id uuid, current_lesson_title text, current_section_title text,
  last_active_at timestamptz, completed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); e record; c record;
begin
  if v_user is null then return; end if;
  for e in
    select en.*, p.slug, p.name as pname, p.type as ptype, pp.name as path_name
    from public.enrollments en join public.programs p on p.id = en.program_id
    left join public.program_paths pp on pp.id = en.path_id
    where en.user_id = v_user order by en.last_active_at desc
  loop
    enrollment_id := e.id; program_id := e.program_id; program_slug := e.slug; program_name := e.pname; program_type := e.ptype;
    path_id := e.path_id; path_name := e.path_name; mode := e.mode; pace := e.pace; run_number := e.run_number;
    last_active_at := e.last_active_at; completed_at := e.completed_at;
    select count(*)::int, count(*) filter (where cp.complete)::int, coalesce(sum(cp.total_steps), 0)::int, coalesce(sum(cp.done_steps), 0)::int
      into lessons_total, lessons_done, steps_total, steps_done
      from public.curriculum_progress(e.program_id, e.path_id) cp;
    select l.id as lid, l.title as ltitle, s.title as stitle into c
      from public.curriculum_progress(e.program_id, e.path_id) cp
      join public.lessons l on l.id = cp.lesson_id join public.sections s on s.id = l.section_id
      where not cp.complete order by cp.ord limit 1;
    current_lesson_id := c.lid; current_lesson_title := c.ltitle; current_section_title := c.stitle;
    c := null;
    return next;
  end loop;
end $$;

grant execute on function public.program_access_states() to anon, authenticated;
grant execute on function public.curriculum_progress(uuid, uuid), public.my_enrollments() to authenticated;
revoke execute on function public.curriculum_progress(uuid, uuid), public.my_enrollments() from anon, public;
