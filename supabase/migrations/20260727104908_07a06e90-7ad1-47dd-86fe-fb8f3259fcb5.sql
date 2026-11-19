ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS program_level smallint,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_program_level_valid CHECK (program_level IS NULL OR program_level IN (1, 2));