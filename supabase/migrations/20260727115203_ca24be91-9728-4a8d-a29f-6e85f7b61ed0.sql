-- 1. Roles infrastructure (roles stored in their own table, never on profiles)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. program_outline: admin-only writes, signed-in reads
DROP POLICY IF EXISTS program_outline_insert ON public.program_outline;
DROP POLICY IF EXISTS program_outline_update ON public.program_outline;

CREATE POLICY program_outline_insert
  ON public.program_outline
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = updated_by);

CREATE POLICY program_outline_update
  ON public.program_outline
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = updated_by);

-- 3. program_structure: admin-only writes, signed-in reads
DROP POLICY IF EXISTS program_structure_insert ON public.program_structure;
DROP POLICY IF EXISTS program_structure_update ON public.program_structure;

CREATE POLICY program_structure_insert
  ON public.program_structure
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = updated_by);

CREATE POLICY program_structure_update
  ON public.program_structure
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = updated_by);

-- 4. referrals: owner-only reads (drop the read-everything policy)
DROP POLICY IF EXISTS "signed in can read codes" ON public.referrals;