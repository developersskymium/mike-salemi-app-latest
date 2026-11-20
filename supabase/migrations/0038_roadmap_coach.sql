-- 0038 Kettlebell Roadmap Coach v1 (spec 14). Additive only.
-- Content: roadmap_movements, roadmap_benchmarks (seeded from packages/core/src/roadmap.ts; Mike edits later).
-- Member data (own rows; admins read all): roadmap_placements, roadmap_node_states, benchmark_attempts, phase_sessions.
-- v1: no camera, no AI. benchmark_attempts.rep_check is the seam for the shared movement-check engine (v2).

create table if not exists public.roadmap_movements (
  key text primary key,
  phase smallint not null check (phase between 1 and 4),
  position smallint not null,
  name text not null,
  short_name text not null,
  kind text not null default 'lift' check (kind in ('bodyweight','lift','mastery')),
  fallback_name text,
  fallback_when text,
  unlock_after text[] not null default '{}',
  pair_easier text not null,
  pair_harder text not null,
  clip_provider_id text,
  clip_hash text,
  clip_thumb text,
  clip_seconds integer,
  clip_note text,
  mtk_tag text,
  mtk_lesson_ids uuid[],            -- null = picked from the MTK lesson tags by mtk_tag
  practise text,
  nasal_breathing boolean not null default false,
  swing_setup boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_benchmarks (
  key text primary key,
  movement_key text not null references public.roadmap_movements(key) on update cascade,
  phase smallint not null check (phase between 1 and 4),
  position smallint not null,
  label text not null,
  measure text not null default 'reps' check (measure in ('reps','distance','stages')),
  reps integer not null,
  reps_max integer,
  sets integer not null default 1,
  each_side boolean not null default false,
  rest_seconds integer not null default 0,
  distance_yards integer,
  load text not null check (load in ('bodyweight','light','low-medium','moderate')),
  standard text,
  how_measured text,
  updated_at timestamptz not null default now()
);
create index if not exists roadmap_benchmarks_movement on public.roadmap_benchmarks(movement_key);

create table if not exists public.roadmap_placements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  answers jsonb not null default '{}',
  overhead_ok boolean,
  start_phase smallint check (start_phase between 1 and 3),
  result_phase smallint not null check (result_phase between 1 and 4),
  benchmarks jsonb not null default '[]',
  status text not null default 'done' check (status in ('done','blocked_pain','stopped')),
  created_at timestamptz not null default now()
);
create index if not exists roadmap_placements_user on public.roadmap_placements(user_id, created_at desc);

create table if not exists public.roadmap_node_states (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  movement_key text not null references public.roadmap_movements(key) on update cascade,
  state text not null check (state in ('locked','learning','practising','passed')),
  why text,
  variant text not null default 'main' check (variant in ('main','fallback')),
  updated_at timestamptz not null default now(),
  primary key (user_id, movement_key)
);

create table if not exists public.benchmark_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  benchmark_key text not null references public.roadmap_benchmarks(key) on update cascade,
  movement_key text not null references public.roadmap_movements(key) on update cascade,
  placement_id uuid references public.roadmap_placements(id) on delete set null,
  source text not null default 'retest' check (source in ('placement','retest')),
  day date not null default current_date,       -- member's local date (2-separate-days rule)
  passed boolean not null,
  set_reps integer[] not null default '{}',
  nasal boolean not null default false,
  variant text not null default 'main' check (variant in ('main','fallback')),
  bell_kg numeric,
  effort text check (effort in ('easy','ok','too_hard')),
  stopped boolean not null default false,       -- pain/dizziness stopped it
  rep_check text check (rep_check in ('meets','close','cant_judge')),
  created_at timestamptz not null default now()
);
create index if not exists benchmark_attempts_user on public.benchmark_attempts(user_id, created_at desc);

create table if not exists public.phase_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  phase smallint not null check (phase between 1 and 4),
  plan jsonb not null,
  checks jsonb not null default '[]',
  readiness text,
  status text not null default 'planned' check (status in ('planned','done','stopped')),
  done jsonb not null default '{}',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists phase_sessions_user on public.phase_sessions(user_id, created_at desc);

alter table public.roadmap_movements enable row level security;
alter table public.roadmap_benchmarks enable row level security;
alter table public.roadmap_placements enable row level security;
alter table public.roadmap_node_states enable row level security;
alter table public.benchmark_attempts enable row level security;
alter table public.phase_sessions enable row level security;

-- Content: any signed-in member reads (the placement test and map are free); admins edit.
create policy roadmap_movements_read on public.roadmap_movements for select to authenticated using (true);
create policy roadmap_movements_admin on public.roadmap_movements for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy roadmap_benchmarks_read on public.roadmap_benchmarks for select to authenticated using (true);
create policy roadmap_benchmarks_admin on public.roadmap_benchmarks for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Member data: own rows; admins read all.
do $$
declare t text;
begin
  foreach t in array array['roadmap_placements','roadmap_node_states','benchmark_attempts','phase_sessions'] loop
    execute format('create policy %1$s_own_select on public.%1$I for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()))', t);
    execute format('create policy %1$s_own_insert on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy %1$s_own_update on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

grant select on public.roadmap_movements, public.roadmap_benchmarks to authenticated;
grant select, insert, update on public.roadmap_placements, public.roadmap_node_states, public.benchmark_attempts, public.phase_sessions to authenticated;
grant insert, update, delete on public.roadmap_movements, public.roadmap_benchmarks to authenticated;

-- Seed (generated by roadmapSeedSql() in packages/core/src/roadmap.ts).
insert into public.roadmap_movements (key, phase, position, name, short_name, kind, fallback_name, fallback_when, unlock_after, pair_easier, pair_harder, clip_provider_id, clip_hash, clip_thumb, clip_seconds, clip_note, mtk_tag, practise, nasal_breathing, swing_setup) values
('body-integrity', 1, 1, 'Body Integrity (bodyweight)', 'Body integrity', 'bodyweight', null, null, '{}'::text[], 'Glute Bridge', 'Single Leg Glute Bridge', null, null, null, null, 'Bodyweight: no clip needed', 'general', 'Daily: 10 spinal roll-ups, 15 glute bridges (feel the glutes, not the back), 15 slow squats. Nose breathing throughout.', true, false),
('goblet-squat', 1, 2, 'Goblet Squat', 'Goblet squat', 'lift', null, null, '{}'::text[], 'Goblet Squat', 'Goblet Squat with pause', '730402831', '0497c34f68', 'https://i.vimeocdn.com/video/1469928657-d0eaf0a16a6a92e35e1fac71787770e2c6a8fbce456a775ca9e54f4da81ee1b3-d_640?region=us', 24, null, 'squat', '3 sets of 8 with a light bell: heels down, knees over toes, bell stays at the chest. Pause 2 s at the bottom on the last rep.', true, false),
('deadlift', 1, 3, 'Deadlift', 'Deadlift', 'lift', null, null, '{}'::text[], 'Two Hand Deadlift', 'Single Leg Deadlift (supported)', null, null, null, null, 'Clip coming', 'deadlift', '3 sets of 10: push the hips back, flat back, bell close to the body. Stand tall by squeezing the glutes.', true, false),
('hk-press', 1, 4, 'Half Kneeling Overhead Press', 'Half kneeling press', 'lift', 'Halo', 'if your overhead mobility doesn''t allow quality overhead work yet', '{}'::text[], 'Halo', 'Half Kneeling Overhead Press', '730402968', '14bb1a8f37', 'https://i.vimeocdn.com/video/1469930015-91f9f7eff2ea02cdccf5170fb4b555a8901637ca6b4e7eff97162bf4e3c2a585-d_640?region=us', 22, null, 'press', '3 sets of 6 each arm: torso tall, ribs down, finish with the arm vertical. Use the Halo if overhead is not there yet.', true, false),
('sa-row', 1, 5, 'Single Arm Row', 'Single arm row', 'lift', null, null, '{}'::text[], 'Lunge Row (supported)', 'Lunge Row (unsupported)', null, null, null, null, 'Clip coming', 'row', '3 sets of 10 each arm: back flat and still, draw the elbow past the ribs, no twisting.', true, false),
('two-hand-swing', 2, 1, '2-Hand Swing', '2-hand swing', 'lift', null, null, array['deadlift']::text[], 'Two Hand Deadlift', 'Two Hand Swing', '730403398', 'da91854120', 'https://i.vimeocdn.com/video/1469929730-5484526710e482b12f83e7362c503acae30d5d1fc27624bae4bd9d77923f3b9e-d_640?region=us', 6, null, 'swing', '5 sets of 10 with 60 s rest: hinge, don''t squat; snap the hips; the bell floats no higher than the chest.', false, true),
('standing-press', 2, 2, 'Standing Overhead Press', 'Standing press', 'lift', null, null, array['hk-press']::text[], 'Half Kneeling Overhead Press', 'Standing Overhead Press', null, null, null, null, 'Clip coming', 'press', '2 sets of 7–10 each arm with a moderate bell: glutes and abs tight, no lean back, lock out vertical.', false, false),
('farmers-carry', 2, 3, 'Single Arm Farmer''s Carry', 'Farmer''s carry', 'lift', null, null, array['sa-row']::text[], 'Suitcase Deadlift', 'Single Arm Farmer''s Carry', null, null, null, null, 'Clip coming', 'deadlift', '3 carries of 30 yd each arm: shoulders level, don''t lean toward the bell, walk slow and tall.', false, false),
('rack-lunge', 2, 4, 'Reverse Lunge in Rack Position', 'Rack lunge', 'lift', null, null, array['goblet-squat']::text[], 'Split Squat (Goblet Grip)', 'Static Split Squat – Overhead Press', null, null, null, null, 'Clip coming', 'lunge', '3 sets of 6 each side: step back softly, torso upright, front shin near vertical, bell tight in the rack.', false, false),
('clean', 3, 1, 'Clean', 'Clean', 'lift', null, null, array['two-hand-swing']::text[], 'Dead Stop Clean', 'Clean', '730403305', '424dbd6335', 'https://i.vimeocdn.com/video/1469929378-ec658becc56ae3bdd677845ee2067d99a390f473cbcfbdefac9a54005bc783d0-d_640?region=us', 9, null, 'clean', '5 sets of 5 each side: the bell travels close, elbow tucked, soft catch in the rack. No banging the forearm.', true, false),
('push-press', 3, 2, 'Push Press', 'Push press', 'lift', null, null, array['standing-press']::text[], 'Strict Press', 'Push Press', '730403174', '23bb239d64', 'https://i.vimeocdn.com/video/1469929257-54900da22c95b6c52bfaa19b59ceeec732096eecf56a571bddc8812d96ac1e38-d_640?region=us', 11, null, 'jerk', '3 sets of 5 each side after a clean: short knee dip (no hip hinge), drive, lock out vertical.', true, false),
('half-getup', 3, 3, 'Loaded Half Turkish Getup', 'Half get-up', 'lift', null, null, array['standing-press']::text[], 'Floor Press', 'Elbow Post Raises', '730403035', 'f2934c9377', 'https://i.vimeocdn.com/video/1469928949-c4abd5c8bc06a969efc2770423755b7f07fa2a5c43c5d59f577739bc33266511-d_640?region=us', 51, null, 'turkish-get-up', '3 get-ups each side, slow: arm vertical at every stage, hold each stage before the next.', true, false),
('sa-swing', 3, 4, 'Single Arm Swing', 'Single arm swing', 'lift', null, null, array['two-hand-swing']::text[], 'Two Hand Swing', 'Single Arm Swing', '730403509', '5365c5a9bb', 'https://i.vimeocdn.com/video/1469929909-780e33af55343b4e89ac3e17ff2afcb9bb137f567ac937ed5e4ad55f705014b7-d_640?region=us', 6, null, 'swing', '4 sets of 8 each arm with 30 s rest: shoulders level, no torso twist, same hip snap as the 2-hand swing.', true, false),
('oh-lunge', 3, 5, 'Overhead Reverse Lunge', 'Overhead lunge', 'lift', 'Walking Lunge', 'the PDF accepts walking or overhead reverse lunges', array['rack-lunge']::text[], 'Reverse Lunge in Rack Position', 'Overhead Reverse Lunge', '730403243', '3d44e30e44', 'https://i.vimeocdn.com/video/1469929410-df0d6d0d8e9aefc6ad09ffaf5fb7e1a754ad4a6f8134b6256364e84b431b6a7a-d_640?region=us', 7, 'The course lists this clip under Phase 2; it shows the overhead reverse lunge', 'lunge', '3 sets of 6 each side: the overhead arm stays vertical through the lunge, torso upright.', true, false),
('row-reciprocity', 3, 6, 'Row With Reciprocity', 'Row w/ reciprocity', 'lift', 'Staggered Stance Row', 'if the reciprocal row isn''t there yet', array['farmers-carry']::text[], 'Staggered Stance Row', 'Row With Reciprocity', '730403272', 'c390cc665d', 'https://i.vimeocdn.com/video/1469929312-dfd6f64ed9a3d8021db6a19f90b9264f82c480f7808ec0893aed596112ba9c56-d_640?region=us', 10, null, 'row', '3 sets of 8 each side: back flat and still, no torso twist, the elbow passes the torso.', true, false),
('snatch', 4, 1, 'Snatch (half and full)', 'Snatch', 'mastery', null, null, '{}'::text[], 'Half Snatch', 'Snatch', null, null, null, null, 'Clip coming', 'snatch', 'Vary the weight, the rest periods and the reps to suit your goal.', false, false),
('full-getup', 4, 2, 'Loaded Full Turkish Getup', 'Full get-up', 'mastery', null, null, '{}'::text[], 'Loaded Half Turkish Getup', 'Loaded Full Turkish Getup', null, null, null, null, 'Clip coming', 'turkish-get-up', 'Vary the weight, the rest periods and the reps to suit your goal.', false, false),
('double-bell', 4, 3, 'Double Bell Work', 'Double bell', 'mastery', null, null, '{}'::text[], 'Double Front Squat', 'Double Clean and Press', null, null, null, null, 'Clip coming', 'clean', 'Vary the weight, the rest periods and the reps to suit your goal.', false, false),
('overhead-squat', 4, 4, 'Overhead Squat', 'Overhead squat', 'mastery', null, null, '{}'::text[], 'Goblet Squat with pause', 'Overhead Squat', null, null, null, null, 'Clip coming', 'squat', 'Vary the weight, the rest periods and the reps to suit your goal.', false, false),
('rotational', 4, 5, 'Rotational (RMT) Exercises', 'Rotational', 'mastery', null, null, '{}'::text[], 'Halo', 'Rotational Mace / Club Work', null, null, null, null, 'Clip coming', 'windmill', 'Vary the weight, the rest periods and the reps to suit your goal.', false, false)
on conflict (key) do nothing;

insert into public.roadmap_benchmarks (key, movement_key, phase, position, label, measure, reps, reps_max, sets, each_side, rest_seconds, distance_yards, load, standard, how_measured) values
('p1-rollups', 'body-integrity', 1, 1, '20 spinal roll-ups', 'reps', 20, null, 1, false, 0, null, 'bodyweight', 'Smooth, one vertebra at a time, breathing through the nose.', 'Tap once per rep'),
('p1-bridges', 'body-integrity', 1, 2, '30 glute bridges', 'reps', 30, null, 1, false, 0, null, 'bodyweight', 'You feel it in the glutes, not in the lower back.', 'Tap once per rep'),
('p1-squats', 'body-integrity', 1, 3, '30 bodyweight squats', 'reps', 30, null, 1, false, 0, null, 'bodyweight', 'Heels down, knees over toes, nose breathing all the way.', 'Tap once per rep'),
('p1-goblet', 'goblet-squat', 1, 4, '15 quality goblet squats', 'reps', 15, null, 1, false, 0, null, 'light', 'Depth, heels down, bell stays at the chest.', 'Tap once per rep'),
('p1-deadlift', 'deadlift', 1, 5, '15 quality deadlifts', 'reps', 15, null, 1, false, 0, null, 'light', 'Hips back, flat back, stand tall with the glutes.', 'Tap once per rep'),
('p1-press', 'hk-press', 1, 6, '15 quality half kneeling presses each arm', 'reps', 15, null, 1, true, 0, null, 'light', 'Torso upright, no lean back, arm finishes vertical.', 'Tap once per rep, each arm'),
('p1-row', 'sa-row', 1, 7, '15 quality single arm rows each arm', 'reps', 15, null, 1, true, 0, null, 'light', 'Back flat and still, elbow past the ribs.', 'Tap once per rep, each arm'),
('p2-carry', 'farmers-carry', 2, 1, 'Farmer''s carry 30 yd each arm', 'distance', 1, null, 1, true, 0, 30, 'low-medium', 'Good posture: shoulders level, no lean toward the bell.', 'Mark each 30 yd walk done'),
('p2-lunge', 'rack-lunge', 2, 2, '8 rack reverse lunges each side', 'reps', 8, null, 1, true, 0, null, 'light', 'Torso upright, soft knee touch, bell tight in the rack (draft standard).', 'Tap once per rep, each side'),
('p2-press', 'standing-press', 2, 3, 'Overhead press 2 × 7–10 each arm', 'reps', 7, 10, 2, true, 60, null, 'moderate', 'No lean back, lock out vertical.', 'Tap reps, rest timer between sets'),
('p2-swing', 'two-hand-swing', 2, 4, '5 × 10 swings, 60 s rest', 'reps', 10, null, 5, false, 60, null, 'moderate', 'Hinge, hips snap, bell floats to chest height.', 'Tap reps, 60 s rest timer'),
('p3-lunge', 'oh-lunge', 3, 1, '10 overhead (or walking) lunges each side', 'reps', 10, null, 1, true, 0, null, 'light', 'Overhead arm vertical, torso upright.', 'Tap once per rep, each side'),
('p3-row', 'row-reciprocity', 3, 2, '3 × 8 rows with reciprocity each side', 'reps', 8, null, 3, true, 45, null, 'moderate', 'Back flat and still, no twist (draft benchmark).', 'Tap reps, rest timer'),
('p3-getup', 'half-getup', 3, 3, 'Loaded half get-up 3–5 each side', 'stages', 3, 5, 1, true, 0, null, 'moderate', 'Arm vertical at every stage, each stage held.', 'Tap once per get-up, each side'),
('p3-clean', 'clean', 3, 4, 'Clean 3 × 5 each side', 'reps', 5, null, 3, true, 60, null, 'moderate', 'Close path, soft catch, elbow tucked.', 'Tap reps, rest timer'),
('p3-pushpress', 'push-press', 3, 5, 'Push press (or strict press) 3 × 5 each side', 'reps', 5, null, 3, true, 60, null, 'moderate', 'Short dip, vertical lockout, back to the rack.', 'Tap reps, rest timer'),
('p3-saswing', 'sa-swing', 3, 6, 'Single arm swing 4 × 8 each arm, 30 s rest', 'reps', 8, null, 4, true, 30, null, 'moderate', 'Shoulders level, no twist.', 'Tap reps, 30 s rest timer')
on conflict (key) do nothing;
