CREATE TABLE public.program_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.program_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_lesson_progress TO authenticated;
GRANT ALL ON public.program_lesson_progress TO service_role;
ALTER TABLE public.program_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read their program lesson progress"
ON public.program_lesson_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members can create their program lesson progress"
ON public.program_lesson_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can update their program lesson progress"
ON public.program_lesson_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can delete their program lesson progress"
ON public.program_lesson_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX program_lesson_progress_user_program_idx ON public.program_lesson_progress(user_id, program_id);