CREATE TABLE public.coaching_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  timezone TEXT,
  focus TEXT,
  meeting_url TEXT,
  coach_notes TEXT,
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_sessions TO authenticated;
GRANT ALL ON public.coaching_sessions TO service_role;

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own coaching sessions"
ON public.coaching_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX coaching_sessions_user_time_idx ON public.coaching_sessions (user_id, scheduled_at DESC);

CREATE TRIGGER coaching_sessions_updated_at
BEFORE UPDATE ON public.coaching_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();