-- Ejecutar en Supabase (SQL editor o `supabase db push`).
-- PostgREST no acepta `column::text` dentro de `.or()`; el filtro "libre" usa esta RPC.

CREATE OR REPLACE FUNCTION public.match_candidate_ids_by_libre(p_term text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
AS $$
  SELECT c.id
  FROM public.candidates c
  WHERE trim(p_term) <> ''
    AND (
      position(lower(trim(p_term)) IN lower(coalesce(c.resumen_ejecutivo, ''))) > 0
      OR position(lower(trim(p_term)) IN lower(c.lenguajes::text)) > 0
      OR position(lower(trim(p_term)) IN lower(c.frameworks::text)) > 0
      OR position(lower(trim(p_term)) IN lower(c.patrones::text)) > 0
      OR position(lower(trim(p_term)) IN lower(c.certificaciones::text)) > 0
      OR position(lower(trim(p_term)) IN lower(c.sectores::text)) > 0
    );
$$;

GRANT EXECUTE ON FUNCTION public.match_candidate_ids_by_libre(text) TO anon, authenticated;
