CREATE TABLE public.course_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id TEXT NOT NULL,
  attempt_index INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  days_completed INTEGER NOT NULL DEFAULT 0,
  lessons_total INTEGER NOT NULL DEFAULT 0,
  days_total INTEGER NOT NULL DEFAULT 0,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_attempts TO authenticated;
GRANT ALL ON public.course_attempts TO service_role;

ALTER TABLE public.course_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own course attempts"
ON public.course_attempts FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX course_attempts_user_course_idx ON public.course_attempts (user_id, course_id, attempt_index DESC);