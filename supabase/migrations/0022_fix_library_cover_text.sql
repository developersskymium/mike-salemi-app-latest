-- 0022 · Fix: Library covers. A Vimeo thumbnail can be a title card with words on it, and nothing can tell
-- that automatically, so the Studio Library sets `videos.meta.cover_has_text = true` on those and the
-- Library then draws the designed movement cover instead. Additive: library_index() returns the flag as
-- `ct` on every video (same signature and return type; nothing else changes).

create or replace function public.library_index()
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as uid),
  ok as (
    select p.id, p.slug, p.name, p.position, p.type
    from public.programs p
    where p.status = 'published' and (select uid from me) is not null
      and private.has_access((select uid from me), p.id, 'content')
  ),
  lib as (
    select distinct pv.video_id from public.program_videos pv
    where pv.in_library and pv.program_id in (select id from ok)
  ),
  uses as (
    select x.video_id, ok.type, ok.position as ppos, se.position as spos, le.position as lpos, st.position as stpos
    from (
      select s.video_id, s.id as step_id from public.steps s where s.video_id is not null
      union all
      select sv.video_id, sv.step_id from public.step_videos sv where sv.video_id is not null
    ) x
    join public.steps st on st.id = x.step_id
    join public.lessons le on le.id = st.lesson_id
    join public.sections se on se.id = le.section_id
    join ok on ok.id = st.program_id
  ),
  ord as (
    select video_id,
           bool_or(type = 'day_program') as in_day,
           min(ppos * 1000000 + spos * 10000 + lpos * 100 + least(stpos, 99)) as o
    from uses group by video_id
  ),
  vids as (
    select v.id, v.title, v.provider_id, v.privacy_hash, v.thumbnail_url, v.duration_seconds,
           coalesce(ord.in_day, false) as in_day, coalesce(ord.o, 999999999) as o,
           coalesce(v.meta->>'cover_has_text', '') = 'true' as cover_has_text
    from public.videos v
    join lib on lib.video_id = v.id
    left join ord on ord.video_id = v.id
  )
  select jsonb_build_object(
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', vids.id, 't', vids.title, 'p', vids.provider_id, 'h', vids.privacy_hash, 'th', vids.thumbnail_url,
        'd', vids.duration_seconds, 'ip', vids.in_day, 'o', vids.o, 'ct', vids.cover_has_text,
        's', exists (select 1 from public.saved_videos sv where sv.user_id = (select uid from me) and sv.video_id = vids.id),
        'g', coalesce((select jsonb_agg(t.namespace || ':' || t.slug order by t.namespace, t.name)
                       from public.video_tags vt join public.tags t on t.id = vt.tag_id where vt.video_id = vids.id), '[]'::jsonb),
        'pr', coalesce((select jsonb_agg(pv.program_id) from public.program_videos pv
                        where pv.video_id = vids.id and pv.in_library and pv.program_id in (select id from ok)), '[]'::jsonb)
      ) order by vids.o, vids.title)
      from vids), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('key', t.namespace || ':' || t.slug, 'ns', t.namespace, 'slug', t.slug, 'name', t.name) order by t.namespace, t.name)
      from public.tags t
      where exists (select 1 from public.video_tags vt join lib on lib.video_id = vt.video_id where vt.tag_id = t.id)), '[]'::jsonb),
    'programs', coalesce((
      select jsonb_agg(jsonb_build_object('id', ok.id, 'slug', ok.slug, 'name', ok.name) order by ok.position)
      from ok where ok.type in ('course', 'day_program', 'tool')), '[]'::jsonb),
    'lessons', coalesce((
      select jsonb_agg(jsonb_build_object('id', le.id, 't', le.title, 'sec', se.title, 'pr', ok.id, 'path', se.path_id)
                       order by ok.position, se.position, le.position)
      from public.lessons le
      join public.sections se on se.id = le.section_id
      join ok on ok.id = le.program_id
      where ok.type in ('course', 'day_program', 'tool')), '[]'::jsonb)
  );
$$;
