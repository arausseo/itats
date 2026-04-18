-- Multi-tenant por organización: organizations, profiles, candidates.organization_id, RLS y trigger en auth.users.
-- Asignar otra organización a un usuario nuevo: invitación / signup con raw_user_meta_data JSON {"organization_id":"<uuid de organizations>"}.
-- Si falta o el UUID no existe en organizations, se usa la organización slug 'default'.

-- 1) Organizaciones
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS 'Inquilinos del ATS; cada usuario tiene una fila en profiles con organization_id.';

INSERT INTO public.organizations (id, name, slug)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'Default',
  'default'
);

-- 2) Perfiles (1:1 con auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_organization_id_idx ON public.profiles (organization_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select_own_org"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Mitigación usuarios sin trigger: solo pueden crearse con la org por defecto (invites con otra org van por trigger SECURITY DEFINER).
CREATE POLICY "profiles_insert_own_default_org"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND organization_id = (
      SELECT o.id
      FROM public.organizations o
      WHERE o.slug = 'default'
      LIMIT 1
    )
  );

-- 3) Candidatos: columna tenant y unicidad de email por organización
ALTER TABLE public.candidates
  ADD COLUMN organization_id uuid REFERENCES public.organizations (id);

UPDATE public.candidates
SET organization_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.candidates
  ALTER COLUMN organization_id SET NOT NULL;

DROP INDEX IF EXISTS public.candidates_email_lower_trim_unique;

CREATE UNIQUE INDEX candidates_organization_email_lower_trim_unique
  ON public.candidates (organization_id, (lower(trim(email))));

COMMENT ON COLUMN public.candidates.organization_id IS 'Tenant: debe coincidir con profiles.organization_id del usuario que ingiere el CV.';

-- 4) RLS candidatos (sustituye lectura global)
DROP POLICY IF EXISTS "authenticated_read_candidates" ON public.candidates;

CREATE POLICY "candidates_select_same_org"
  ON public.candidates
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "candidates_update_same_org"
  ON public.candidates
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- 5) Backfill perfiles para usuarios ya existentes
INSERT INTO public.profiles (id, organization_id)
SELECT
  u.id,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 6) Trigger: perfil al crear usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta text;
  org_from_meta uuid;
  default_org uuid;
BEGIN
  SELECT o.id INTO default_org
  FROM public.organizations o
  WHERE o.slug = 'default'
  LIMIT 1;

  meta := trim(COALESCE(new.raw_user_meta_data->>'organization_id', ''));

  IF meta <> '' THEN
    BEGIN
      org_from_meta := meta::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        org_from_meta := NULL;
    END;
  ELSE
    org_from_meta := NULL;
  END IF;

  IF org_from_meta IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = org_from_meta
  ) THEN
    INSERT INTO public.profiles (id, organization_id)
    VALUES (new.id, org_from_meta)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.profiles (id, organization_id)
    VALUES (new.id, default_org)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- 7) RPC búsqueda libre: solo usuarios autenticados (RLS filtra candidates por org)
REVOKE EXECUTE ON FUNCTION public.match_candidate_ids_by_libre(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_candidate_ids_by_libre(text) TO authenticated;
