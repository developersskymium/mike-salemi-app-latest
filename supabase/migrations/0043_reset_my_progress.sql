-- 0043 Admin testing tool: reset the signed-in admin's own member progress so they can start again from
-- the welcome intake. Admin role, subscription, purchases, orders and billing are kept. Only ever touches
-- rows of auth.uid(); refuses anyone who is not an admin.
create or replace function public.reset_my_progress()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_t text;
  v_n int;
  v_total int := 0;
  v_tables text[] := array[
    'plan_items','training_sessions','member_plans','mtk_plans','step_progress','lesson_positions','video_positions',
    'seen_markers','intake_responses','points_ledger','member_badges','certificates','setup_checks','setup_profiles',
    'training_profiles','member_settings','day_notes','day_feels','exercise_weights','goals','phase_sessions',
    'readiness_results','benchmark_attempts','tool_results','roadmap_node_states','roadmap_placements',
    'swing_program_sets','swing_program_runs','saved_list_items','saved_lists','saved_videos','collections',
    'notification_events','offer_events','enrollments'];
begin
  if v_user is null then raise exception 'not signed in'; end if;
  if not private.has_role(v_user, 'admin') then raise exception 'admins only'; end if;
  foreach v_t in array v_tables loop
    if to_regclass('public.' || v_t) is not null then
      execute format('delete from public.%I where user_id = $1', v_t) using v_user;
      get diagnostics v_n = row_count;
      v_total := v_total + v_n;
    end if;
  end loop;
  update public.profiles set onboarding = '{}'::jsonb where id = v_user;
  return jsonb_build_object('ok', true, 'rows', v_total);
end $$;

revoke all on function public.reset_my_progress() from public, anon;
grant execute on function public.reset_my_progress() to authenticated;
