CREATE TABLE public.day_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id text NOT NULL,
  day_id text NOT NULL,
  active_lesson_id text,
  draft_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_state TO authenticated;
GRANT ALL ON public.day_state TO service_role;

ALTER TABLE public.day_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY day_state_all_own ON public.day_state
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER day_state_set_updated_at
  BEFORE UPDATE ON public.day_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();