CREATE TABLE IF NOT EXISTS public.intake_responses (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_responses TO authenticated;
GRANT ALL ON public.intake_responses TO service_role;

ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intake_responses_all_own" ON public.intake_responses;
CREATE POLICY "intake_responses_all_own" ON public.intake_responses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_intake_responses_updated_at ON public.intake_responses;
CREATE TRIGGER update_intake_responses_updated_at
  BEFORE UPDATE ON public.intake_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();