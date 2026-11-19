CREATE TABLE public.program_intake_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Program intake',
  introduction text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_copy text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id)
);
GRANT SELECT ON public.program_intake_definitions TO authenticated;
GRANT ALL ON public.program_intake_definitions TO service_role;
ALTER TABLE public.program_intake_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read published program intake definitions"
ON public.program_intake_definitions FOR SELECT TO authenticated
USING (is_published OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can create program intake definitions"
ON public.program_intake_definitions FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update program intake definitions"
ON public.program_intake_definitions FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete program intake definitions"
ON public.program_intake_definitions FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.program_intake_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  guidance jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_intake_responses TO authenticated;
GRANT ALL ON public.program_intake_responses TO service_role;
ALTER TABLE public.program_intake_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read their program intake responses"
ON public.program_intake_responses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members can create their program intake responses"
ON public.program_intake_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can update their program intake responses"
ON public.program_intake_responses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can delete their program intake responses"
ON public.program_intake_responses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.self_guided_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My self-guided plan',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.self_guided_plans TO authenticated;
GRANT ALL ON public.self_guided_plans TO service_role;
ALTER TABLE public.self_guided_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read their self guided plans"
ON public.self_guided_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members can create their self guided plans"
ON public.self_guided_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can update their self guided plans"
ON public.self_guided_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can delete their self guided plans"
ON public.self_guided_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.self_guided_plan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.self_guided_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sequence integer NOT NULL DEFAULT 0,
  week_number integer NOT NULL DEFAULT 1 CHECK (week_number BETWEEN 1 AND 12),
  scheduled_on date,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.program_lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  rationale text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 240),
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.self_guided_plan_sessions TO authenticated;
GRANT ALL ON public.self_guided_plan_sessions TO service_role;
ALTER TABLE public.self_guided_plan_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read their self guided sessions"
ON public.self_guided_plan_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members can create their self guided sessions"
ON public.self_guided_plan_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can update their self guided sessions"
ON public.self_guided_plan_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can delete their self guided sessions"
ON public.self_guided_plan_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX program_intake_responses_user_program_idx ON public.program_intake_responses(user_id, program_id);
CREATE INDEX self_guided_plans_user_status_idx ON public.self_guided_plans(user_id, status);
CREATE INDEX self_guided_plan_sessions_plan_sequence_idx ON public.self_guided_plan_sessions(plan_id, sequence);