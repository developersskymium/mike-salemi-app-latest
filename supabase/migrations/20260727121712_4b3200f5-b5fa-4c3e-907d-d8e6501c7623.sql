CREATE TABLE public.reminder_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'training',
  channel text NOT NULL DEFAULT 'in_app',
  title text NOT NULL,
  body text,
  detail text,
  status text NOT NULL DEFAULT 'sent',
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_events TO authenticated;
GRANT ALL ON public.reminder_events TO service_role;

ALTER TABLE public.reminder_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminder_events_all_own ON public.reminder_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX reminder_events_user_created_idx ON public.reminder_events (user_id, created_at DESC);