-- Habilitar RLS en candidates y permitir lectura a roles anon y authenticated.
-- service_role bypasses RLS por defecto — no necesita policy de escritura.

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_candidates"
  ON public.candidates
  FOR SELECT
  TO anon, authenticated
  USING (true);
