-- Mike Salemi App v2 — 0030: settings + onboarding (spec 12: Settings, Sign in & onboarding, Forms). Additive only.
--
-- 1. member_settings: one row per member for the settings that are not training-profile answers and not
--    reminder schedule (those live in training_profiles (0025) and notification_prefs (0013)):
--    units, kettlebells owned, the notification matrix (topic × push/email), reduced motion,
--    first-week checklist state, welcome video seen, install prompt state, and form drafts (autosave/resume).
-- 2. account_requests: calm "Delete my account" / "Download my data" / support / billing requests.
--    Members only create and read their own; staff work them. Nothing is deleted by the app.
-- Quiet hours reuse notification_prefs.quiet_start / quiet_end.

-- ================================================================= 1. member_settings
create table if not exists public.member_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  units text not null default 'kg' check (units in ('kg', 'lb')),
  owned_bells numeric[] not null default '{}' check (cardinality(owned_bells) <= 24),
  -- {topic: {push: bool, email: bool}} — topics: reminders, streak, recap, new_content, mike_notes, coaching, offers
  notify_matrix jsonb not null default '{}'::jsonb check (jsonb_typeof(notify_matrix) = 'object' and length(notify_matrix::text) < 4000),
  reduced_motion boolean not null default false,
  -- {first_session, reminder_time, home_screen, dismissed}: ISO timestamps when done
  checklist jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist) = 'object' and length(checklist::text) < 2000),
  welcome_seen_at timestamptz,
  install_prompt_at timestamptz,
  -- {formKey: {answers, step, savedAt}} — autosave + "Pick up where you left off"
  form_drafts jsonb not null default '{}'::jsonb check (jsonb_typeof(form_drafts) = 'object' and length(form_drafts::text) < 20000),
  updated_at timestamptz not null default now()
);

alter table public.member_settings enable row level security;
revoke all on public.member_settings from anon, authenticated;
grant select, insert, update on public.member_settings to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'member_settings' and policyname = 'own_read') then
    create policy own_read on public.member_settings for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'member_settings' and policyname = 'own_insert') then
    create policy own_insert on public.member_settings for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'member_settings' and policyname = 'own_update') then
    create policy own_update on public.member_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'member_settings' and policyname = 'admin_all') then
    create policy admin_all on public.member_settings for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- ================================================================= 2. account_requests
create table if not exists public.account_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('delete', 'export', 'support', 'billing')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'withdrawn')),
  topic text check (length(topic) <= 80),
  message text check (length(message) <= 4000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object' and length(payload::text) < 8000),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists account_requests_user_idx on public.account_requests (user_id, created_at desc);
create index if not exists account_requests_open_idx on public.account_requests (kind, created_at) where status = 'open';

alter table public.account_requests enable row level security;
revoke all on public.account_requests from anon, authenticated;
grant select, insert on public.account_requests to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_requests' and policyname = 'own_read') then
    create policy own_read on public.account_requests for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_requests' and policyname = 'own_insert') then
    create policy own_insert on public.account_requests for insert to authenticated
      with check (user_id = (select auth.uid()) and status = 'open' and handled_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'account_requests' and policyname = 'admin_all') then
    create policy admin_all on public.account_requests for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
  end if;
end $$;

-- ================================================================= 3. referral_inviter
-- Referral-aware signup ("Daniel invited you"): the inviter's first name only, for a valid code. Anyone may ask.
create or replace function public.referral_inviter(p_code text)
returns text language sql stable security definer set search_path = '' as $$
  select nullif(split_part(coalesce(nullif(p.first_name, ''), p.display_name, ''), ' ', 1), '')
  from public.referral_codes rc join public.profiles p on p.id = rc.user_id
  where rc.code = upper(trim(p_code)) and length(trim(p_code)) between 2 and 32
  limit 1
$$;
revoke all on function public.referral_inviter(text) from public;
grant execute on function public.referral_inviter(text) to anon, authenticated;
