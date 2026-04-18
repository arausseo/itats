-- Restringir lectura de candidates a usuarios autenticados únicamente.
-- Con autenticación añadida al frontend, el rol anon ya no necesita acceso.

DROP POLICY IF EXISTS "anon_read_candidates" ON public.candidates;

CREATE POLICY "authenticated_read_candidates"
  ON public.candidates
  FOR SELECT
  TO authenticated
  USING (true);
