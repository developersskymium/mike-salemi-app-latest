-- 0015 Content quality (W5): program copy, imagery, intro sections, estimated minutes,
-- Vimeo fixes, roadmap mode, coaching slots, site copy.
-- Additive / data only: updates, inserts with "on conflict" or "where not exists", and
-- "create or replace" for functions. Nothing is deleted.
-- Sources: legacy app content (/home/claude/legacy/src/content/programs.ts, retreats.ts, coaching.ts),
-- the old project's data (programs, site_settings, sublesson ids) and the courses' own lesson text.

------------------------------------------------------------------------------------------------
-- 1. Program copy. Every sentence comes from the legacy app, the old project or the course's own
--    lessons. `meta.copy_source` records where; nothing here is invented.
------------------------------------------------------------------------------------------------

update public.programs set
  tagline = 'A 30-day program with the Bulgarian Bag',
  summary = 'Your 30-Day Program: four weeks of daily training with the Bulgarian Bag, from foundations to performance integration, with mobility, breathing, stretching and working-in sessions alongside.',
  description = E'Start with the philosophy and fundamentals, the training schedule and the BOLT breathing test, then choose your Bulgarian Bag and learn its anatomy, safety and clothing.\n\nWeeks 1 and 2 build the foundations; weeks 3 and 4 integrate them into performance, and days 29 and 30 close the program. Seven workouts each show how to level up or down, and a preparation workout is there for a low BOLT score.\n\nA movement library breaks down the spin, arm throw, clean, snatch and swing squat with their combos, plus the additional movements the workouts use. Mobility, breathing, stretching, working-in and warm-up sessions support the training, and the Q&A archive answers the questions members asked along the way.',
  highlights = array['30 days in four weekly blocks', 'Seven workouts with level up and down options', 'Mobility, breathing, stretching and working-in sessions'],
  format_label = coalesce(format_label, '30-day program'),
  meta = meta || jsonb_build_object('vertical', 'athletic', 'copy_source', 'Course lessons (Home, Getting Started, weekly sections) and the legacy catalog vertical')
where slug = 'athleticism-4-life';

update public.programs set
  tagline = 'Ten weeks of calls, playwork and practice',
  summary = 'A ten-week course: a recorded call each week, weekly playwork with reflection and journaling prompts, and breath and energy practices such as Eagle Breath and the Chi Generator.',
  description = E'Each week pairs a call recording with playwork: a practice, a challenge and journaling questions to share with the group.\n\nThe course moves from mindset and soft talk through negations, integrity, values and recognition to designing your lifestyle. Pre-course materials include The One Thing meditation, an integrity contract and the course schedule, and week ten brings a guest presenter.',
  highlights = array['10 weekly call recordings', 'Weekly playwork and journaling prompts', 'Breath and energy practices'],
  format_label = coalesce(format_label, '10-week course'),
  -- The old draft_note made every card show "Draft"; it is context, not a draft flag.
  meta = meta || jsonb_build_object('note', 'Predecessor to The Grounded King', 'vertical', 'mind-body',
    'copy_source', 'Course lessons (Pre-Course Materials, weekly Playwork, Mindset & Soft Talk) and the legacy catalog vertical'),
  draft_note = null
where slug = 'the-path-to-inspired-action';

update public.programs set
  tagline = 'Prepare for your retreat',
  summary = 'A practice program Mike builds for each retreat, sent in the weeks before, with foundational breathwork and meditation.',
  description = E'This is your Men of Movement platform. It is here to help you prepare and get the most out of your experience.\n\nStart with the welcome video, then aim to try each practice at least once before the retreat: the Hear In meditation, Piston Breathing, Breathe Light, abdominal (organ) prep and the wall squat, plus Mike''s book recommendations and a playlist. The packing list and key details for your cohort live on the Home page.',
  highlights = array['Foundational breathwork and meditation', 'Practices to try before the retreat', 'Packing list and key details'],
  format_label = coalesce(format_label, 'Retreat preparation'),
  meta = meta || jsonb_build_object('vertical', 'mind-body', 'pillars', jsonb_build_array('Rotation', 'Movement', 'Breathwork', 'Nature', 'Storywork'),
    'copy_source', 'Course Home and Start Here lessons; "After the Mountain" copy (legacy retreats.ts); pillars from the legacy intake')
where slug = 'men-of-movement';

update public.programs set
  tagline = 'Your roadmap to kettlebell progression',
  summary = 'Identify where you are on the roadmap and train accordingly: four phases from the foundation to mastery.',
  description = E'Identify where you are on this roadmap and train accordingly. Beginners should start at Phase 1. If you have been training for a while, scan through and see which phase suits you best.\n\nThe four phases run from The Foundation through Adding Complexity and Ready for Performance to Mastery, with short video demonstrations of many of the movements and a guide to training according to your phase.',
  highlights = array['Four phases, from Foundation to Mastery', 'Short video demonstrations', 'Train according to your phase'],
  format_label = coalesce(format_label, 'Four-phase roadmap'),
  meta = meta || jsonb_build_object('vertical', 'mastery', 'copy_source', 'Roadmap Home lesson and phase titles')
where slug = 'kettlebell-roadmap';

update public.programs set
  tagline = '400+ videos of kettlebell technique',
  description = E'The deep technical library behind the lifts. If Kettlebell Lifestyle is the practice, this is the encyclopedia: swing, clean, snatch, press and jerk broken down frame by frame.\n\nLearn grips, pre-checks, technique, common errors and variations across the major kettlebell movements, with bonus expert talks and program design lessons.',
  highlights = array['400+ technique videos', 'Lift-by-lift progressions', 'Pre-checks and common errors'],
  format_label = coalesce(format_label, 'Self-paced video course'),
  duration_label = coalesce(duration_label, 'Dip in as needed'),
  level = coalesce(level, 'all'),
  meta = meta || jsonb_build_object('vertical', 'mastery', 'price_label', coalesce(meta->>'price_label', 'From $297'),
    'route_label', 'Open the course',
    'sections', jsonb_build_array(
      jsonb_build_object('heading', 'What it is', 'body', 'Eleven modules covering every kettlebell lift Mike teaches, from the first hinge to competition long cycle. Each lift gets a setup breakdown, a drill progression, common faults and a corrective path.',
        'points', jsonb_build_array('Swing, clean, snatch, press, jerk and long cycle', 'Fault-finding videos for every position', 'Programming templates you can drop into your week')),
      jsonb_build_object('heading', 'Who it is for', 'body', 'Anyone who wants the why behind the reps: lifters chasing cleaner technique, and coaches who need a reference they can point clients at.')),
    'faq', jsonb_build_array(
      jsonb_build_object('q', 'Do I need it if I''m doing Kettlebell Lifestyle?', 'a', 'No. It''s the technical companion: most people add it when a specific lift stops progressing.'),
      jsonb_build_object('q', 'How long do I keep access?', 'a', 'Lifetime, including future additions to the library.')),
    'copy_source', 'Legacy programs.ts (Mastering the Kettlebell) and the old project description')
where slug = 'mastering-the-kettlebell';

update public.programs set tagline = coalesce(tagline, 'With Paul Chek and Mike Salemi'),
  meta = meta || jsonb_build_object('vertical', 'mind-body') where slug = 'working-in';
update public.programs set tagline = coalesce(tagline, 'Six free kettlebell lessons'),
  meta = meta || jsonb_build_object('vertical', 'mastery') where slug = 'free-6-video-kettlebell-mini-series';
update public.programs set tagline = coalesce(tagline, 'Seven steps to a stronger swing setup'),
  meta = meta || jsonb_build_object('vertical', 'mastery') where slug = 'what-your-kettlebell-swing-is-missing';
update public.programs set meta = meta || jsonb_build_object('vertical', 'athletic') where slug = 'the-training-room';
update public.programs set meta = meta || jsonb_build_object('vertical', 'mind-body') where slug in ('men-of-movement-retreats', 'the-grounded-king', 'zen-savage', 'coaching', 'executive-edge');
update public.programs set meta = meta || jsonb_build_object('hero_video', '398409642/f4e1f0e247', 'route_label', 'Enter program')
where slug = 'kettlebell-lifestyle';
-- Essential Kettlebell Training: Strength stays draft; there is no copy for it in any source.
update public.programs set draft_note = coalesce(draft_note, 'No copy or artwork in the legacy app or old project; awaiting Mike')
where slug = 'essential-kettlebell-training-strength';

-- Concept / experience program pages (legacy layout L3): facts, sections, FAQ, route.
update public.programs set meta = meta || jsonb_build_object(
    'price_label', coalesce(meta->>'price_label', 'From $180 / session'), 'route', '/coaching', 'route_label', 'Book a session',
    'sections', jsonb_build_array(
      jsonb_build_object('heading', 'How it works', 'body', 'Book a session in the app, send your training footage ahead of time, and spend the call working on exactly what is limiting you. Every session ends with a written plan.',
        'points', jsonb_build_array('Video call with Mike, 60 or 90 minutes', 'Technique review on your own footage', 'A written block you can follow immediately', 'Session notes and history kept in the app')),
      jsonb_build_object('heading', 'Who it is for', 'body', 'Lifters stuck at a plateau, people coming back from injury, and coaches who want their own coaching eye sharpened.')),
    'faq', jsonb_build_array(
      jsonb_build_object('q', 'Do I have to commit to a block?', 'a', 'No. Single sessions are fine, though most people book a four-session block.'),
      jsonb_build_object('q', 'What if I need to move a session?', 'a', 'Cancel from your coaching page up to 24 hours before and the session comes back to you to book again.')))
where slug = 'coaching';

update public.programs set meta = meta || jsonb_build_object(
    'price_label', coalesce(meta->>'price_label', '$197 Draft'),
    'sections', jsonb_build_array(
      jsonb_build_object('heading', 'What it is', 'body', 'Eight weeks of daily practice built around three pillars: breath mechanics, ground-based movement, and the inner work that keeps a man steady under load.',
        'points', jsonb_build_array('Daily breath protocol, 10 minutes', 'Ground flow and mobility sessions', 'Weekly reflection and journalling prompts', 'Strength work that scales to any equipment')),
      jsonb_build_object('heading', 'What changes', 'body', 'Better sleep, a slower resting heart rate, and the ability to hold your centre in conversations and situations that used to spike you.')),
    'faq', jsonb_build_array(
      jsonb_build_object('q', 'Can I run it alongside Kettlebell Lifestyle?', 'a', 'Yes. The breath and mobility work stack cleanly on top of your training days.'),
      jsonb_build_object('q', 'Do I need equipment?', 'a', 'A single kettlebell and floor space is enough.')))
where slug = 'the-grounded-king';

update public.programs set meta = meta || jsonb_build_object(
    'price_label', coalesce(meta->>'price_label', 'By application'), 'route', '/experiences', 'route_label', 'See the retreats',
    'commitment', 'Capped at 20 men',
    'sections', jsonb_build_array(
      jsonb_build_object('heading', 'What it is', 'body', 'Two cohorts a year in Mount Shasta, California. Mornings move, afternoons go inward, and evenings are fire, food and circle.',
        'points', jsonb_build_array('Daily Qi Gong and team training', 'Somatic breathwork ceremony', 'Sweat lodge and rite of passage', 'Full-board on private land')),
      jsonb_build_object('heading', 'After you get home', 'body', 'You leave with a take-home practice, a private brotherhood group and an integration call one week later.')),
    'faq', jsonb_build_array(
      jsonb_build_object('q', 'Do I need to be fit?', 'a', 'No. Everything is scalable in the moment.'),
      jsonb_build_object('q', 'Is it a personal-development retreat or a training camp?', 'a', 'Both: the training is real, and so is the inner work.')))
where slug = 'men-of-movement-retreats';

update public.programs set meta = meta || jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object('heading', 'The proposed rhythm', 'body', 'A focused daily practice supported by a small number of high-value coaching interactions.',
        'points', jsonb_build_array('Daily five-minute homework', 'Three to four direct interactions', 'Personalized next actions'))))
where slug = 'executive-edge';

update public.programs set meta = meta || jsonb_build_object('price_label', coalesce(meta->>'price_label', 'Pricing to be confirmed'))
where slug = 'zen-savage';

------------------------------------------------------------------------------------------------
-- 2. Imagery: real photos used by the legacy app (copied into apps/web/public/media/l5e/<asset>/),
--    and the Kettlebell Lifestyle intro video's Vimeo poster as its hero.
------------------------------------------------------------------------------------------------

insert into public.program_media (program_id, role, url, alt, position)
select p.id, r.role, x.url, x.alt, r.pos
from (values
  ('coaching', '/media/l5e/801b743d-da63-4eb5-8408-9d98aa8b88ff/coach.jpg', 'Mike Salemi at a retreat fire, in the morning sun'),
  ('executive-edge', '/media/l5e/801b743d-da63-4eb5-8408-9d98aa8b88ff/coach.jpg', 'Mike Salemi at a retreat fire, in the morning sun'),
  ('the-grounded-king', '/media/l5e/4d58243d-0c93-4bb6-8011-a1928d2004d0/tgk.jpg', 'Men seated on the grass in a breath practice'),
  ('zen-savage', '/media/l5e/0f8c0c9c-3d88-4297-b30a-2c19e672fb67/working-in.png', 'Zen Savage Challenge')
) as x(slug, url, alt)
join public.programs p on p.slug = x.slug
cross join (values ('hero', 0), ('card', 1)) as r(role, pos)
where not exists (select 1 from public.program_media m where m.program_id = p.id and m.role = r.role);

insert into public.program_media (program_id, role, url, alt, position)
select p.id, 'hero', v.thumbnail_url, 'Kettlebell Lifestyle: the On Ramp overview with Mike', 0
from public.programs p join public.videos v on v.provider = 'vimeo' and v.provider_id = '398409642'
where p.slug = 'kettlebell-lifestyle' and v.thumbnail_url is not null
  and not exists (select 1 from public.program_media m where m.program_id = p.id and m.role = 'hero');

------------------------------------------------------------------------------------------------
-- 3. Intro ("Home") sections: rendered as "Start here", excluded from counts and completion.
------------------------------------------------------------------------------------------------

update public.sections s set meta = s.meta || jsonb_build_object('intro', true, 'label', 'Start here')
where s.title = 'Home' and s.parent_id is null
  and s.position = (select min(s2.position) from public.sections s2 where s2.program_id = s.program_id and s2.path_id is not distinct from s.path_id)
  and not coalesce((s.meta->>'intro')::boolean, false);

create or replace function private.is_intro_section(p_section uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (s.meta->>'intro')::boolean from public.sections s where s.id = p_section), false);
$$;

-- Counts on Home/Programs (my_enrollments) skip intro lessons. Same body as 0004/0011 except the
-- two curriculum_progress reads, which now join lessons → sections and drop intro sections.
create or replace function public.my_enrollments()
 returns table(enrollment_id uuid, program_id uuid, program_slug text, program_name text, program_type public.program_type, path_id uuid, path_name text, mode public.learning_mode, pace text, run_number integer, lessons_total integer, lessons_done integer, steps_total integer, steps_done integer, current_lesson_id uuid, current_lesson_title text, current_section_title text, last_active_at timestamp with time zone, completed_at timestamp with time zone)
 language plpgsql stable security definer set search_path to ''
as $function$
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
      from public.curriculum_progress(e.program_id, e.path_id) cp
      join public.lessons l on l.id = cp.lesson_id
      where not private.is_intro_section(l.section_id);
    -- "Up next" may still be the intro lesson: legacy showed "Start here" first.
    select l.id as lid, l.title as ltitle, s.title as stitle into c
      from public.curriculum_progress(e.program_id, e.path_id) cp
      join public.lessons l on l.id = cp.lesson_id join public.sections s on s.id = l.section_id
      where not cp.complete order by cp.ord limit 1;
    current_lesson_id := c.lid; current_lesson_title := c.ltitle; current_section_title := c.stitle;
    c := null;
    return next;
  end loop;
end $function$;

-- Program completion (certificate, 1000 points) no longer waits for the intro lesson.
create or replace function private.after_lesson_complete(p_user uuid, p_lesson uuid)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
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
                     and not private.is_intro_section(l.section_id)
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
end $function$;

------------------------------------------------------------------------------------------------
-- 4. Vimeo: the 28 oEmbed 404s.
--    "Thruster" (97940376) is a typo in the old data for 897940376/8ea774c873 (the old project's
--    program_sublessons has the full id + hash, same title). Point its clips at the real video.
--    The other 27 (Path to Inspired Action calls, Men of Movement prep) have no hash anywhere in
--    the old project or the legacy code: they need the Vimeo API (VIMEO_ACCESS_TOKEN, see ENV.md).
------------------------------------------------------------------------------------------------

update public.step_videos sv set video_id = good.id
from public.videos bad, public.videos good
where bad.provider = 'vimeo' and bad.provider_id = '97940376' and sv.video_id = bad.id
  and good.provider = 'vimeo' and good.provider_id = '897940376'
  and not exists (select 1 from public.step_videos x where x.step_id = sv.step_id and x.video_id = good.id);
update public.videos set meta = meta || jsonb_build_object('superseded_by', '897940376', 'note', 'Typo id in the old data; clips now use 897940376')
where provider = 'vimeo' and provider_id = '97940376';
update public.videos set meta = meta || jsonb_build_object('needs_api', true)
where provider = 'vimeo' and meta ? 'oembed_error' and provider_id <> '97940376';

------------------------------------------------------------------------------------------------
-- 5. Estimated minutes. Steps get a "N min" duration_label from their Vimeo duration (KBL steps
--    already carry authored labels); a lesson's estimated_minutes = sum of its steps' minutes (a step
--    with no main video counts its clips), only when every video in it has a known duration.
--    Callable again after the Vimeo backfill (service role only).
------------------------------------------------------------------------------------------------

create or replace function public.refresh_estimated_minutes() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_steps int; v_lessons int;
begin
  update public.steps s set duration_label = greatest(1, ceil(v.duration_seconds / 60.0))::int || ' min',
         meta = s.meta || jsonb_build_object('duration_source', 'vimeo')
  from public.videos v
  where v.id = s.video_id and s.duration_label is null and v.duration_seconds is not null and v.duration_seconds > 0;
  get diagnostics v_steps = row_count;

  with clip as (
    select sv.step_id, sum(v.duration_seconds) as secs, bool_or(v.duration_seconds is null) as unknown
    from public.step_videos sv join public.videos v on v.id = sv.video_id group by sv.step_id),
  st as (
    select s.lesson_id,
      case when substring(s.duration_label from '^(\d+) ?min') is not null then substring(s.duration_label from '^(\d+) ?min')::int
           when v.duration_seconds is not null then greatest(1, ceil(v.duration_seconds / 60.0))::int
           when s.video_id is null and c.secs is not null and not c.unknown then greatest(1, ceil(c.secs / 60.0))::int
           else 0 end as mins,
      (s.video_id is not null and v.duration_seconds is null and substring(coalesce(s.duration_label, '') from '^(\d+) ?min') is null)
        or (s.video_id is null and coalesce(c.unknown, false)) as blocked
    from public.steps s left join clip c on c.step_id = s.id left join public.videos v on v.id = s.video_id),
  per as (select lesson_id, sum(mins)::int as mins, bool_or(blocked) as blocked from st group by lesson_id)
  update public.lessons l set estimated_minutes = per.mins,
         meta = l.meta || jsonb_build_object('minutes_source', 'steps')
  from per
  where per.lesson_id = l.id and not per.blocked and per.mins > 0
    and (l.estimated_minutes is null or l.meta->>'minutes_source' = 'steps') and l.estimated_minutes is distinct from per.mins;
  get diagnostics v_lessons = row_count;
  return jsonb_build_object('steps', v_steps, 'lessons', v_lessons);
end $$;
revoke all on function public.refresh_estimated_minutes() from public, anon, authenticated;
grant execute on function public.refresh_estimated_minutes() to service_role;
select public.refresh_estimated_minutes();

------------------------------------------------------------------------------------------------
-- 6. Kettlebell Roadmap: legacy opened it as a self-paced course (Tools > Free resources).
------------------------------------------------------------------------------------------------

insert into public.program_modes (program_id, mode, is_default, settings)
select p.id, m.mode::public.learning_mode, m.is_default, '{}'::jsonb
from public.programs p cross join (values ('self_guided', true), ('library', false)) as m(mode, is_default)
where p.slug = 'kettlebell-roadmap'
on conflict (program_id, mode) do nothing;

------------------------------------------------------------------------------------------------
-- 7. Coaching slots for the next 4 weeks from programs.meta.schedule (coaching): Mike coaches
--    Tuesday to Saturday, 07:00–14:00 Pacific. Studio > Experiences > Coaching slots can open more.
------------------------------------------------------------------------------------------------

insert into public.coaching_slots (starts_at, duration_minutes, is_open)
select (d::date + t::time) at time zone (p.meta->'schedule'->>'timezone'), 60, true
from public.programs p
cross join generate_series(current_date + 1, current_date + 28, interval '1 day') as d
cross join lateral jsonb_array_elements_text(p.meta->'schedule'->'times') as t
where p.slug = 'coaching'
  and extract(dow from d)::int in (select jsonb_array_elements_text(p.meta->'schedule'->'weekdays')::int)
  and not exists (select 1 from public.coaching_slots s where s.starts_at = (d::date + t::time) at time zone (p.meta->'schedule'->>'timezone'));

------------------------------------------------------------------------------------------------
-- 8. Site copy edited in the Studio (legacy admin "Main copy"): values from the old project.
------------------------------------------------------------------------------------------------

insert into public.site_settings (key, value) values
  ('home', '{"hero_eyebrow": "", "featured_slug": "", "enrolled_title": "Your enrolled programs"}'::jsonb),
  ('programs_page', '{"title": "Programs", "intro": "", "flagship_badge": "Flagship program", "flagship_title": "Kettlebell Lifestyle", "flagship_copy": "Mike''s complete kettlebell journey. Choose a structured day-by-day Immersion or train at your own pace with Self-Guided."}'::jsonb)
on conflict (key) do nothing;

-- Library link for the "Thruster" typo id: point it at the real video (or hide the duplicate if both are linked).
update public.program_videos pv set video_id = good.id
from public.videos bad, public.videos good
where bad.provider = 'vimeo' and bad.provider_id = '97940376' and pv.video_id = bad.id
  and good.provider = 'vimeo' and good.provider_id = '897940376'
  and not exists (select 1 from public.program_videos x where x.program_id = pv.program_id and x.video_id = good.id);
update public.program_videos pv set in_library = false
from public.videos bad where bad.provider = 'vimeo' and bad.provider_id = '97940376' and pv.video_id = bad.id;
