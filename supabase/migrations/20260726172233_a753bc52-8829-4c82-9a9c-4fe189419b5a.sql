DROP POLICY "program_outline_insert" ON public.program_outline;
DROP POLICY "program_outline_update" ON public.program_outline;

ALTER TABLE public.program_outline ALTER COLUMN updated_by SET NOT NULL;

CREATE POLICY "program_outline_insert" ON public.program_outline
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = updated_by);
CREATE POLICY "program_outline_update" ON public.program_outline
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() = updated_by);