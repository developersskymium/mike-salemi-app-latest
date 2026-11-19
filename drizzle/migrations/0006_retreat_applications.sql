CREATE TABLE IF NOT EXISTS public.retreat_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  retreat_slug text NOT NULL,
  cohort_starts_on date,
  cohort_ends_on date,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'waitlist', 'call_scheduled', 'accepted', 'declined', 'withdrawn')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, retreat_slug)
);

GRANT SELECT, INSERT, UPDATE ON public.retreat_applications TO authenticated;
GRANT ALL ON public.retreat_applications TO service_role;

ALTER TABLE public.retreat_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY retreat_applications_read ON public.retreat_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY retreat_applications_insert ON public.retreat_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status IN ('submitted', 'waitlist'));

CREATE POLICY retreat_applications_admin_update ON public.retreat_applications
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER retreat_applications_updated_at
  BEFORE UPDATE ON public.retreat_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();