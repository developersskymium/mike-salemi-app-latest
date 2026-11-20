-- Mike Salemi App v2 — W2: MTK personalised plans and per-program intakes. Additive only.
--
-- 1. mtk_plans: a member's Mastering the Kettlebell learning plan (versions; older ones archived,
--    never deleted). Learning days are unscheduled, so they live here and not in plan_items
--    (my_week and the Plan tab are untouched). Lesson progress stays in step_progress.
-- 2. create_mtk_plan(): the only write path (validates the assessment and every lesson id).
-- 3. Intake result kind 'template' (per-program "Your program approach": headline, priorities,
--    caution with {var} / {var|lower} placeholders filled from the answers).
-- 4. Program intakes for every published course (questions authored for v2; legacy had none seeded).

-- ================================================================= 1. mtk_plans
create table if not exists public.mtk_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  response_id uuid references public.intake_responses(id) on delete set null,
  version int not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  -- {weeks, days_per_week, minutes, weeks_needed}
  schedule jsonb not null default '{}'::jsonb,
  -- {level, coach, strengths[], gaps[], focus_areas[{label,count,why}], recommended, total, minutes, summary}
  result jsonb not null default '{}'::jsonb,
  lesson_ids uuid[] not null default '{}',
  -- [{day, week, title, lesson_ids[], minutes}]
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists mtk_plans_user_idx on public.mtk_plans (user_id, status, created_at desc);
create index if not exists mtk_plans_program_idx on public.mtk_plans (program_id);
create index if not exists mtk_plans_response_idx on public.mtk_plans (response_id);
create unique index if not exists mtk_plans_one_active on public.mtk_plans (user_id, program_id) where status = 'active';

alter table public.mtk_plans enable row level security;
revoke all on public.mtk_plans from anon, authenticated;
grant select on public.mtk_plans to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mtk_plans' and policyname = 'own_read') then
    create policy own_read on public.mtk_plans for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mtk_plans' and policyname = 'admin_all') then
    create policy admin_all on public.mtk_plans for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- ================================================================= 2. create_mtk_plan
-- p_days: [{day, week, title, lesson_ids:[uuid], minutes}] in plan order (computed by @ms/core groupIntoDays).
-- p_schedule: {weeks, days_per_week, minutes}. p_result: the results summary shown on My Plan.
-- Archives the member's active plan for the program and inserts the next version. Returns {id, version}.
create or replace function public.create_mtk_plan(p_response uuid, p_schedule jsonb, p_result jsonb, p_days jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_resp record; v_program uuid; v_ids uuid[]; v_bad int; v_version int; v_id uuid;
  v_days int; v_dpw int; v_min int; v_weeks int;
begin
  if v_user is null then raise exception 'not signed in'; end if;
  select r.id, r.user_id, f.key, f.program_id into v_resp
    from public.intake_responses r join public.intake_forms f on f.id = r.form_id where r.id = p_response;
  if v_resp.id is null or v_resp.user_id <> v_user then raise exception 'assessment not found'; end if;
  if v_resp.key is distinct from 'mtk-intake' then raise exception 'not an MTK assessment'; end if;
  v_program := coalesce(v_resp.program_id, (select id from public.programs where slug = 'mastering-the-kettlebell'));

  if p_days is null or jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) = 0 then raise exception 'plan has no learning days'; end if;
  if jsonb_array_length(p_days) > 400 then raise exception 'plan is too long'; end if;
  select coalesce(array_agg(x::uuid order by d.n, e.m), '{}') into v_ids
    from jsonb_array_elements(p_days) with ordinality d(day, n),
         jsonb_array_elements_text(d.day->'lesson_ids') with ordinality e(x, m);
  if cardinality(v_ids) = 0 then raise exception 'plan has no lessons'; end if;
  select count(*) into v_bad from unnest(v_ids) i
    where not exists (select 1 from public.lessons l where l.id = i and l.program_id = v_program);
  if v_bad > 0 then raise exception 'plan contains lessons outside the course'; end if;

  v_dpw := least(greatest(coalesce((p_schedule->>'days_per_week')::int, 3), 1), 7);
  v_min := least(greatest(coalesce((p_schedule->>'minutes')::int, 20), 10), 120);
  v_weeks := least(greatest(coalesce((p_schedule->>'weeks')::int, 8), 1), 104);
  v_days := jsonb_array_length(p_days);

  perform 1 from public.mtk_plans where user_id = v_user and program_id = v_program for update;
  select coalesce(max(version), 0) + 1 into v_version from public.mtk_plans where user_id = v_user and program_id = v_program;
  update public.mtk_plans set status = 'archived', archived_at = now()
    where user_id = v_user and program_id = v_program and status = 'active';
  insert into public.mtk_plans (user_id, program_id, response_id, version, status, schedule, result, lesson_ids, days)
    values (v_user, v_program, p_response, v_version, 'active',
            jsonb_build_object('weeks', v_weeks, 'days_per_week', v_dpw, 'minutes', v_min,
                               'weeks_needed', greatest(1, ceil(v_days::numeric / v_dpw)::int)),
            coalesce(p_result, '{}'::jsonb), v_ids, p_days)
    returning id into v_id;
  return jsonb_build_object('id', v_id, 'version', v_version);
end $$;

revoke all on function public.create_mtk_plan(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.create_mtk_plan(uuid, jsonb, jsonb, jsonb) to authenticated;

-- ================================================================= 3. intake result kind 'template'
-- {kind:'template', vars:{name:{q:[answer keys, first answered wins], default}}, headline, summary,
--  priorities:[text], caution, caution_q} -> {headline, summary, priorities, caution}
-- Placeholders: {name} and {name|lower}. caution_q: a free-text answer that replaces the caution when given.
create or replace function private.intake_fill(p_text text, p_vals jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare k text; v_out text := p_text;
begin
  if p_text is null then return null; end if;
  for k in select jsonb_object_keys(p_vals) loop
    v_out := replace(v_out, '{' || k || '|lower}', lower(p_vals->>k));
    v_out := replace(v_out, '{' || k || '}', p_vals->>k);
  end loop;
  -- Sentence case when a lower-cased value starts the text.
  return upper(left(v_out, 1)) || substr(v_out, 2);
end $$;

create or replace function private.intake_template(p_rules jsonb, p_answers jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare v_vals jsonb := '{}'::jsonb; k text; q text; v text; x jsonb; v_pri jsonb := '[]'::jsonb; v_caution text;
begin
  for k in select jsonb_object_keys(coalesce(p_rules->'vars', '{}')) loop
    v := null;
    for q in select jsonb_array_elements_text(case jsonb_typeof(p_rules->'vars'->k->'q') when 'array' then p_rules->'vars'->k->'q'
                                                   else jsonb_build_array(p_rules->'vars'->k->>'q') end) loop
      v := nullif(trim(coalesce(private.answer_one(p_answers, q), '')), '');
      exit when v is not null;
    end loop;
    v_vals := v_vals || jsonb_build_object(k, coalesce(v, p_rules->'vars'->k->>'default', ''));
  end loop;
  for x in select value from jsonb_array_elements(coalesce(p_rules->'priorities', '[]')) loop
    v_pri := v_pri || jsonb_build_array(private.intake_fill(x #>> '{}', v_vals));
  end loop;
  v_caution := nullif(trim(coalesce(private.answer_one(p_answers, p_rules->>'caution_q'), '')), '');
  return jsonb_strip_nulls(jsonb_build_object(
    'headline', private.intake_fill(p_rules->>'headline', v_vals),
    'summary', private.intake_fill(p_rules->>'summary', v_vals),
    'priorities', v_pri,
    'caution', coalesce(left(v_caution, 1000), private.intake_fill(p_rules->>'caution', v_vals))));
end $$;

revoke all on function private.intake_template(jsonb, jsonb), private.intake_fill(text, jsonb) from public, anon, authenticated;

-- intake_result and submit_intake: unchanged from 0008 except the 'template' kind.
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
  if p_rules->>'kind' = 'template' then
    return private.intake_template(p_rules, p_answers);
  end if;
  return '{}'::jsonb;
end $$;

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

  if coalesce(v_f.result_rules->>'kind', '') in ('first_match', 'score', 'template') then
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

-- ================================================================= 4. program intakes
-- Compact spec: [id, question, type, options]; one question per screen; text answers are optional.
with spec(slug, key, title, intro, qs, rules) as (values
  ('athleticism-4-life', 'a4l-intake', 'Athleticism 4 Life intake', 'Four quick questions so the 30-Day Program starts at the right pace for you.',
   '[["goal", "What do you want the 30 days to give you?", "single", ["Build consistency", "Get stronger", "Move and feel more athletic", "Improve my conditioning", "Return to training after a break"]], ["days", "How many days a week can you train?", "single", ["2 days", "3 days", "4 days", "5 days"]], ["experience", "How would you describe your training right now?", "single", ["Just starting", "Some experience", "Training regularly", "Experienced athlete"]], ["constraints", "Anything we should keep in mind?", "text"]]',
   '{"headline": "{goal} is your 30-day anchor", "priorities": ["Protect {days|lower} each week", "Begin at your level: {experience|lower}", "Complete the 30-Day Program before adding library work"], "caution": "Scale range, speed and load before sacrificing movement quality."}'),
  ('the-path-to-inspired-action', 'path-intake', 'The Path to Inspired Action intake', 'A short reflection before you begin, so the weekly work meets you where you are.',
   '[["goal", "What do you most want from this path?", "single", ["Get clear on what I want", "Turn insight into action", "Reconnect with my values", "Build a steadier daily practice"]], ["days", "How many days a week can you set aside for reflection?", "single", ["1 day", "2 days", "3 days", "Most days"]], ["experience", "How familiar are you with reflective practice?", "single", ["New to it", "Some experience", "A regular practice"]], ["constraints", "Anything we should keep in mind?", "text"]]',
   '{"headline": "Use {goal|lower} as your weekly intention", "priorities": ["Protect {days|lower} for reflection", "Complete one piece of playwork before moving on", "Turn each insight into one small action"], "caution": "Slow down when reflection becomes another task to perform."}'),
  ('working-in', 'working-in-intake', 'Working-In intake', 'Three questions so each Working-In session matches the energy you bring to it.',
   '[["goal", "What do you want more of?", "single", ["Calm and focus", "Better recovery", "More energy", "Less stress"]], ["days", "How many days a week can you practise?", "single", ["2 days", "3 days", "4 days", "Every day"]], ["experience", "How is your energy on most days?", "single", ["Low", "Moderate", "High", "Up and down"]], ["constraints", "Anything we should keep in mind?", "text"]]',
   '{"headline": "Let {goal|lower} set today’s dose", "priorities": ["Create {days|lower} for practice", "Match the session to your {experience|lower} energy", "Finish feeling more resourced than when you started"], "caution": "Choose less intensity when sleep, stress or pain is elevated."}'),
  ('men-of-movement', 'mom-prep-intake', 'Men of Movement preparation intake', 'A few questions so your retreat preparation fits your life between now and arrival.',
   '[["goal", "What do you want to bring home from the retreat?", "single", ["Clarity on my next chapter", "Brotherhood and connection", "A grounded daily practice", "A reset for body and mind"]], ["days", "How many days a week can you prepare?", "single", ["2 days", "3 days", "4 days", "Most days"]], ["experience", "How familiar are you with breathwork and movement practice?", "single", ["New to it", "Some experience", "A regular practice"]], ["constraints", "Anything you want us to know before the retreat?", "text"]]',
   '{"headline": "{goal} is how you will enter the retreat", "priorities": ["Practise Rotation, Movement, Breathwork, Nature and Storywork", "Meet the work where you are: {experience|lower}", "Bring support questions to the preparation call"], "caution": "Preparation helps you arrive grounded; it is not a test of readiness."}'),
  ('what-your-kettlebell-swing-is-missing', 'swing-series-intake', 'Swing series intake', 'Three questions so you get the most out of the seven steps.',
   '[["goal", "What do you want from this series?", "single", ["Fix my swing", "Learn the swing safely", "Build more power", "Get more from my training"]], ["days", "How many days a week can you practise?", "single", ["2 days", "3 days", "4 days", "5 days"]], ["experience", "How much kettlebell experience do you have?", "single", ["New to kettlebells", "Some experience", "Experienced"]], ["constraints", "Anything we should keep in mind?", "text"]]',
   '{"headline": "Use {goal|lower} as your filter", "priorities": ["Aim for {days|lower} of short practice each week", "Start at your level: {experience|lower}", "Film one set and compare it with each step"], "caution": "Adjust any session that does not feel right for your body today."}'),
  ('free-6-video-kettlebell-mini-series', 'mini-series-intake', 'Mini series intake', 'Three questions so the six videos fit your practice.',
   '[["goal", "What do you want from the mini series?", "single", ["Learn the basics safely", "Sharpen my technique", "Build strength", "Find the right program next"]], ["days", "How many days a week can you practise?", "single", ["2 days", "3 days", "4 days", "5 days"]], ["experience", "How much kettlebell experience do you have?", "single", ["New to kettlebells", "Some experience", "Experienced"]], ["constraints", "Anything we should keep in mind?", "text"]]',
   '{"headline": "Use {goal|lower} as your filter", "priorities": ["Aim for {days|lower} each week", "Start at your level: {experience|lower}", "Leave room for recovery between demanding sessions"], "caution": "Adjust any session that does not feel right for your body today."}')
)
insert into public.intake_forms (program_id, key, title, introduction, questions, version, is_published, result_rules)
select p.id, s.key, s.title, s.intro,
  (select jsonb_agg(jsonb_build_object('id', q->>0, 'eyebrow', 'Program intake', 'title', q->>1,
     'questions', jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'id', q->>0, 'label', q->>1, 'type', q->>2, 'required', (q->>2) <> 'text',
        'help', case when q->>2 = 'text' then 'Injuries, pain, schedule limits or anything else. Optional.' end,
        'options', (select jsonb_agg(jsonb_build_object('value', o, 'label', o) order by i)
                    from jsonb_array_elements_text(q->3) with ordinality x(o, i))))))
     order by n)
   from jsonb_array_elements(s.qs::jsonb) with ordinality t(q, n)),
  1, true,
  jsonb_build_object('kind', 'template', 'caution_q', 'constraints', 'vars', jsonb_build_object(
      'goal', jsonb_build_object('q', jsonb_build_array('goal'), 'default', 'Build consistency'),
      'days', jsonb_build_object('q', jsonb_build_array('days', 'time'), 'default', '3 days'),
      'experience', jsonb_build_object('q', jsonb_build_array('experience', 'energy', 'readiness'), 'default', 'Some experience')))
    || s.rules::jsonb
from spec s join public.programs p on p.slug = s.slug
on conflict (key) do nothing;
