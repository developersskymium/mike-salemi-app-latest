-- 0016 · W1 Home dashboard & Discover (additive only)
--   program_outline_stats()  size + first lesson of every published program/path (Home rails, catalog counts)
--   video_positions          member's playback position for library videos (Continue watching)
--   library_index()          compact index of every library video + lesson the member can open (Library grid, cascade, sort)
--   library_continue()       videos started but not finished, from the library and from program lessons

/* ------------------------------------------------------------------ outline stats */
create or replace function public.program_outline_stats()
returns table (program_id uuid, path_id uuid, sections integer, lessons integer, first_lesson_id uuid, first_lesson_title text)
language sql
stable
security invoker
set search_path = ''
as $$
  with l as (
    select l.id, l.title, l.program_id, s.path_id, s.id as section_id, s.position as spos, l.position as lpos
    from public.lessons l
    join public.sections s on s.id = l.section_id
    join public.programs p on p.id = l.program_id
    where p.status = 'published'
  )
  select l.program_id, l.path_id,
         count(distinct l.section_id)::int,
         count(*)::int,
         (array_agg(l.id order by l.spos, l.lpos))[1],
         (array_agg(l.title order by l.spos, l.lpos))[1]
  from l
  group by l.program_id, l.path_id;
$$;

grant execute on function public.program_outline_stats() to anon, authenticated;

/* ------------------------------------------------------------------ video positions */
create table if not exists public.video_positions (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  seconds integer not null default 0 check (seconds >= 0),
  duration integer check (duration is null or duration > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index if not exists video_positions_video_idx on public.video_positions (video_id);
create index if not exists video_positions_recent_idx on public.video_positions (user_id, updated_at desc);

alter table public.video_positions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'video_positions' and policyname = 'own_read') then
    create policy own_read on public.video_positions for select to authenticated
      using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'video_positions' and policyname = 'own_insert') then
    create policy own_insert on public.video_positions for insert to authenticated
      with check (user_id = (select auth.uid()) and (select private.can_view_video((select auth.uid()), video_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'video_positions' and policyname = 'own_update') then
    create policy own_update on public.video_positions for update to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'video_positions' and policyname = 'admin_all') then
    create policy admin_all on public.video_positions for all to authenticated
      using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

grant select, insert, update on public.video_positions to authenticated;

/* ------------------------------------------------------------------ library index */
-- One call for the whole Library page: videos (compact keys), tag dictionary, programs and lessons.
-- v: { id, t title, p provider_id, h hash, th thumbnail, d duration, g [tag keys], pr [program ids], s saved, ip used in a training day, o program order }
create or replace function public.library_index()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
           coalesce(ord.in_day, false) as in_day, coalesce(ord.o, 999999999) as o
    from public.videos v
    join lib on lib.video_id = v.id
    left join ord on ord.video_id = v.id
  )
  select jsonb_build_object(
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', vids.id, 't', vids.title, 'p', vids.provider_id, 'h', vids.privacy_hash, 'th', vids.thumbnail_url,
        'd', vids.duration_seconds, 'ip', vids.in_day, 'o', vids.o,
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

revoke all on function public.library_index() from public, anon;
grant execute on function public.library_index() to authenticated;

/* ------------------------------------------------------------------ continue watching */
create or replace function public.library_continue(p_limit integer default 12)
returns table (
  video_id uuid, title text, provider_id text, privacy_hash text, thumbnail_url text, duration_seconds integer,
  seconds integer, updated_at timestamptz, lesson_id uuid, lesson_title text, program_slug text, program_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (select (select auth.uid()) as uid),
  lib as (
    select vp.video_id, vp.seconds, coalesce(vp.duration, v.duration_seconds) as dur, vp.updated_at,
           null::uuid as lesson_id
    from public.video_positions vp
    join public.videos v on v.id = vp.video_id
    where vp.user_id = (select uid from me)
  ),
  les as (
    select v.id as video_id, (kv.value)::text::numeric::int as seconds, v.duration_seconds as dur, lp.updated_at, lp.lesson_id
    from public.lesson_positions lp
    cross join lateral jsonb_each(coalesce(lp.video_seconds, '{}'::jsonb)) kv
    join public.videos v on v.provider_id = kv.key
    where lp.user_id = (select uid from me)
      and jsonb_typeof(kv.value) = 'number'
      and not exists (
        select 1 from public.steps st
        join public.step_progress sp on sp.step_id = st.id and sp.user_id = (select uid from me)
        where st.lesson_id = lp.lesson_id and st.video_id = v.id)
  ),
  allpos as (
    select * from lib union all select * from les
  ),
  pick as (
    select distinct on (a.video_id) a.*
    from allpos a
    where a.seconds >= 5 and (a.dur is null or a.seconds < a.dur * 0.95)
    order by a.video_id, a.updated_at desc
  )
  select p.video_id, v.title, v.provider_id, v.privacy_hash, v.thumbnail_url, coalesce(p.dur, v.duration_seconds),
         p.seconds, p.updated_at, p.lesson_id, le.title, pr.slug, pr.name
  from pick p
  join public.videos v on v.id = p.video_id
  left join public.lessons le on le.id = p.lesson_id
  left join public.programs pr on pr.id = le.program_id
  order by p.updated_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 40);
$$;

revoke all on function public.library_continue(integer) from public, anon;
grant execute on function public.library_continue(integer) to authenticated;
