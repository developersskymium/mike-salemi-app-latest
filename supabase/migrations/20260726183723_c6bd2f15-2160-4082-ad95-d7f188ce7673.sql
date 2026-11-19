-- 1. Program structure (v2)
CREATE TABLE public.program_structure (
  key text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.program_structure TO authenticated;
GRANT ALL ON public.program_structure TO service_role;
ALTER TABLE public.program_structure ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_structure_select ON public.program_structure FOR SELECT TO authenticated USING (true);
CREATE POLICY program_structure_insert ON public.program_structure FOR INSERT TO authenticated WITH CHECK (auth.uid() = updated_by);
CREATE POLICY program_structure_update ON public.program_structure FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() = updated_by);
CREATE TRIGGER program_structure_updated_at BEFORE UPDATE ON public.program_structure FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Schedules
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My schedule',
  course_id text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  fallback_rule text NOT NULL DEFAULT 'shift',
  reminders_enabled boolean NOT NULL DEFAULT true,
  reminder_time time NOT NULL DEFAULT '07:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedules_all_own ON public.schedules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.schedule_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  phase_id text NOT NULL,
  day_id text NOT NULL,
  scheduled_on date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, day_id)
);
CREATE INDEX schedule_days_by_date ON public.schedule_days (user_id, scheduled_on);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_days TO authenticated;
GRANT ALL ON public.schedule_days TO service_role;
ALTER TABLE public.schedule_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedule_days_all_own ON public.schedule_days FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER schedule_days_updated_at BEFORE UPDATE ON public.schedule_days FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Notification preferences
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  training_reminders boolean NOT NULL DEFAULT true,
  reminder_time time NOT NULL DEFAULT '07:00',
  reminder_days jsonb NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  streak_nudges boolean NOT NULL DEFAULT true,
  weekly_summary boolean NOT NULL DEFAULT true,
  new_content boolean NOT NULL DEFAULT true,
  announcements boolean NOT NULL DEFAULT false,
  channel_email boolean NOT NULL DEFAULT true,
  channel_in_app boolean NOT NULL DEFAULT true,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time NOT NULL DEFAULT '21:00',
  quiet_hours_end time NOT NULL DEFAULT '07:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_preferences_all_own ON public.notification_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Workout tables
CREATE TABLE public.workout_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  phase_id text NOT NULL,
  day_id text NOT NULL,
  lesson_id text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  table_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workout_tables_by_day ON public.workout_tables (user_id, day_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_tables TO authenticated;
GRANT ALL ON public.workout_tables TO service_role;
ALTER TABLE public.workout_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_tables_all_own ON public.workout_tables FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER workout_tables_updated_at BEFORE UPDATE ON public.workout_tables FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Badges + certificates
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_badges_all_own ON public.user_badges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  title text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY certificates_all_own ON public.certificates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);