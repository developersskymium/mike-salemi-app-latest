-- Mike Salemi App v2 — row level security and grants.
-- Principle: catalog is public; paid content needs access; members write only their own progress
-- and preferences; access, orders, points, badges, certificates are written by server functions only.

-- Enable RLS everywhere and start from zero privileges for client roles.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    -- admins can do anything through the API
    execute format('create policy admin_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- public catalog (anon + authenticated read)
do $$ declare t text; begin
  foreach t in array array['categories', 'tags', 'program_modes', 'program_paths', 'program_media', 'program_tags',
                           'plans', 'plan_program_benefits', 'bundles', 'bundle_items', 'program_inclusions', 'site_settings'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('create policy public_read on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

grant select on public.programs to anon, authenticated;
create policy public_read on public.programs for select to anon, authenticated using (status = 'published');

grant select on public.prices to anon, authenticated;
create policy public_read on public.prices for select to anon, authenticated using (is_active);

grant select on public.tools to anon, authenticated;
create policy public_read on public.tools for select to anon, authenticated using (status = 'published');

grant select on public.notices to anon, authenticated;
create policy public_read on public.notices for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));

grant select on public.intake_forms to authenticated;
create policy member_read on public.intake_forms for select to authenticated using (is_published);

grant select on public.plan_templates to authenticated;
create policy member_read on public.plan_templates for select to authenticated using (is_published);

grant select on public.badges to authenticated;
create policy member_read on public.badges for select to authenticated using (true);

-- Curriculum outline (titles, order) is public for sales pages; content is gated below.
grant select on public.sections, public.lessons to anon, authenticated;
create policy public_outline on public.sections for select to anon, authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.status = 'published'));
create policy public_outline on public.lessons for select to anon, authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.status = 'published'));

-- ---------------------------------------------------------------- gated content
grant select on public.steps, public.step_videos, public.resources, public.videos, public.video_tags, public.program_videos to authenticated;
create policy access_read on public.steps for select to authenticated
  using ((select private.has_access((select auth.uid()), program_id, 'content')));
create policy access_read on public.step_videos for select to authenticated
  using (exists (select 1 from public.steps s where s.id = step_id and private.has_access((select auth.uid()), s.program_id, 'content')));
create policy access_read on public.resources for select to authenticated
  using ((select private.has_access((select auth.uid()), program_id, 'content')));
create policy access_read on public.videos for select to authenticated
  using ((select private.can_view_video((select auth.uid()), id)));
create policy access_read on public.video_tags for select to authenticated
  using ((select private.can_view_video((select auth.uid()), video_id)));
create policy access_read on public.program_videos for select to authenticated
  using ((select private.has_access((select auth.uid()), program_id, 'content')));

-- Readiness forms and tables: needed by any member with a day program; tables are not secret on their own.
grant select on public.forms, public.form_questions, public.form_bands, public.workout_tables to authenticated;
create policy member_read on public.forms for select to authenticated using (true);
create policy member_read on public.form_questions for select to authenticated using (true);
create policy member_read on public.form_bands for select to authenticated using (true);
create policy member_read on public.workout_tables for select to authenticated using (true);

-- ---------------------------------------------------------------- experiences (public schedule, private details via functions)
grant select on public.program_runs, public.itinerary_items, public.coaching_packages to anon, authenticated;
create policy public_read on public.program_runs for select to anon, authenticated using (status <> 'draft' or draft_note is not null);
create policy public_read on public.itinerary_items for select to anon, authenticated
  using (exists (select 1 from public.program_runs r where r.id = run_id and (r.status <> 'draft' or r.draft_note is not null)));
create policy public_read on public.coaching_packages for select to anon, authenticated using (is_active);

grant select on public.coaching_slots to authenticated;
create policy member_read on public.coaching_slots for select to authenticated using (is_open and starts_at > now());

-- join links only for booked participants
grant select on public.run_sessions to authenticated;
create policy booked_read on public.run_sessions for select to authenticated
  using (exists (select 1 from public.run_applications a where a.run_id = run_sessions.run_id and a.user_id = (select auth.uid()) and a.status = 'booked'));

-- ---------------------------------------------------------------- member-owned, member-writable
do $$ declare t text; begin
  foreach t in array array['lesson_positions', 'seen_markers', 'goals', 'member_plans', 'plan_items', 'notification_prefs',
                           'push_tokens', 'saved_videos', 'collections', 'run_checklist'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy own_all on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

grant select, insert, update, delete on public.collection_items to authenticated;
create policy own_all on public.collection_items for all to authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));

-- profile: read and edit own
grant select, update on public.profiles to authenticated;
create policy own_read on public.profiles for select to authenticated using (id = (select auth.uid()) or (select private.can_view_member((select auth.uid()), id)));
create policy own_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- enrollments: read own (and coach view); members may change only mode and pace settings
grant select on public.enrollments to authenticated;
grant update (mode, pace, training_days, missed_day_rule) on public.enrollments to authenticated;
create policy own_read on public.enrollments for select to authenticated using ((select private.can_view_member((select auth.uid()), user_id)));
create policy own_update on public.enrollments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- tool results and intake responses: insert and read own
grant select, insert on public.tool_results, public.intake_responses to authenticated;
create policy own_read on public.tool_results for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.tool_results for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_read on public.intake_responses for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.intake_responses for insert to authenticated with check (user_id = (select auth.uid()));

-- retreat applications: submit own (only as submitted), read own
grant select, insert on public.run_applications to authenticated;
create policy own_read on public.run_applications for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.run_applications for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'submitted' and order_id is null and admin_note is null);

-- ---------------------------------------------------------------- member-readable, server-written
do $$ declare t text; begin
  foreach t in array array['step_progress', 'readiness_results', 'run_archive', 'points_ledger', 'member_badges',
                           'certificates', 'access_grants', 'coaching_credits', 'coaching_bookings', 'referral_codes'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy own_read on public.%I for select to authenticated using ((select private.can_view_member((select auth.uid()), user_id)))', t);
  end loop;
end $$;

grant select on public.subscriptions to authenticated;
create policy own_read on public.subscriptions for select to authenticated using (user_id = (select auth.uid())
  or exists (select 1 from public.org_members m where m.org_id = subscriptions.org_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin') and m.status = 'active'));

grant select on public.orders to authenticated;
create policy own_read on public.orders for select to authenticated using (user_id = (select auth.uid()));
grant select on public.order_items to authenticated;
create policy own_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

grant select on public.referrals to authenticated;
create policy own_read on public.referrals for select to authenticated using (referrer_id = (select auth.uid()) or referred_id = (select auth.uid()));

-- ---------------------------------------------------------------- organizations
grant select on public.organizations, public.org_members, public.org_programs to authenticated;
create policy member_read on public.organizations for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy member_read on public.org_members for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_view_member((select auth.uid()), user_id)));
create policy member_read on public.org_programs for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = org_programs.org_id and m.user_id = (select auth.uid()) and m.status = 'active'));
grant select on public.org_invites to authenticated;
create policy org_admin_read on public.org_invites for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = org_invites.org_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin') and m.status = 'active'));

-- offers, offer_events, coupons, payment_events, audit_log: no client privileges at all.
-- Members reach offers through server functions; the admin studio writes every table through
-- server routes that verify the admin role and then use the service role (which bypasses RLS).
