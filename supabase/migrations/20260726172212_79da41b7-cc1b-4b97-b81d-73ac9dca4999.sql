CREATE TABLE public.program_outline (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_outline TO authenticated;
GRANT ALL ON public.program_outline TO service_role;

ALTER TABLE public.program_outline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "program_outline_select" ON public.program_outline
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "program_outline_insert" ON public.program_outline
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "program_outline_update" ON public.program_outline
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_program_outline_updated_at
  BEFORE UPDATE ON public.program_outline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();