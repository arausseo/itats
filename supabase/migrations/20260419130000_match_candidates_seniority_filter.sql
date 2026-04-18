-- Actualiza match_candidates_for_position para aceptar un filtro opcional de seniority.
-- p_seniority: cuando se pasa un valor no nulo, solo devuelve candidatos con ese seniority_estimado.
CREATE OR REPLACE FUNCTION public.match_candidates_for_position(
  query_embedding   vector(1536),
  p_position_id     uuid,
  p_match_threshold float   DEFAULT 0.5,
  p_match_count     int     DEFAULT 10,
  p_seniority       text    DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  nombre            text,
  rol_principal     text,
  seniority_estimado text,
  similarity        float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.nombre,
    c.rol_principal,
    c.seniority_estimado,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM public.candidates c
  WHERE c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) > p_match_threshold
    AND NOT EXISTS (
      SELECT 1 FROM public.position_candidates pc
      WHERE pc.position_id = p_position_id
        AND pc.candidate_id = c.id
    )
    AND (p_seniority IS NULL OR c.seniority_estimado = p_seniority)
  ORDER BY c.embedding <=> query_embedding
  LIMIT p_match_count;
$$;
