-- Módulo de Gestión de Plazas (Positions)
-- Nuevas tablas: positions, position_candidates
-- ENUM: pipeline_status
-- RPC: match_candidates_for_position (búsqueda semántica excluyendo candidatos ya en el pipeline)

-- 1) Tabla de plazas
CREATE TABLE public.positions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id),
  title           text        NOT NULL,
  description     text        NOT NULL DEFAULT '',
  requirements    text        NOT NULL DEFAULT '',
  status          text        NOT NULL DEFAULT 'Open'
                              CHECK (status IN ('Open', 'Closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.positions            IS 'Plazas / posiciones abiertas por organización.';
COMMENT ON COLUMN public.positions.status     IS 'Open | Closed';
COMMENT ON COLUMN public.positions.requirements IS 'Requisitos técnicos y competencias buscadas.';

-- 2) ENUM de estados del pipeline
CREATE TYPE public.pipeline_status AS ENUM (
  'Sourced',
  'To Contact',
  'Screening',
  'Tech Assessment',
  'Interview',
  'Offer',
  'Hired',
  'Rejected'
);

-- 3) Tabla intermedia: candidato en pipeline de una plaza
CREATE TABLE public.position_candidates (
  id              uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id     uuid                   NOT NULL REFERENCES public.positions (id) ON DELETE CASCADE,
  candidate_id    uuid                   NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
  pipeline_status public.pipeline_status NOT NULL DEFAULT 'Sourced',
  notes           text                   NOT NULL DEFAULT '',
  created_at      timestamptz            NOT NULL DEFAULT now(),
  updated_at      timestamptz            NOT NULL DEFAULT now(),
  UNIQUE (position_id, candidate_id)
);

COMMENT ON TABLE public.position_candidates IS 'Pipeline de selección: relación candidato ↔ plaza con estado.';

CREATE INDEX position_candidates_position_id_idx ON public.position_candidates (position_id);
CREATE INDEX position_candidates_candidate_id_idx ON public.position_candidates (candidate_id);

-- 4) RLS para positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "positions_select_same_org"
  ON public.positions FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "positions_insert_same_org"
  ON public.positions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "positions_update_same_org"
  ON public.positions FOR UPDATE TO authenticated
  USING (
    organization_id = (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- 5) RLS para position_candidates (hereda org de la plaza)
ALTER TABLE public.position_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "position_candidates_select_same_org"
  ON public.position_candidates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  );

CREATE POLICY "position_candidates_insert_same_org"
  ON public.position_candidates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  );

CREATE POLICY "position_candidates_update_same_org"
  ON public.position_candidates FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  );

-- 6) RPC de búsqueda semántica
-- Corre como INVOKER: RLS de candidates filtra por org automáticamente.
-- Excluye candidatos que ya estén en el pipeline de la plaza (p_position_id).
CREATE OR REPLACE FUNCTION public.match_candidates_for_position(
  query_embedding   vector(1536),
  p_position_id     uuid,
  p_match_threshold float DEFAULT 0.5,
  p_match_count     int   DEFAULT 10
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
  ORDER BY c.embedding <=> query_embedding
  LIMIT p_match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_candidates_for_position TO authenticated;
