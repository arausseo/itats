-- Pipeline de selección: columna status para seguimiento del candidato.

CREATE TYPE public.candidate_status AS ENUM (
  'nuevo',
  'en_proceso',
  'en_espera',
  'rechazado',
  'contratado'
);

ALTER TABLE public.candidates
  ADD COLUMN status public.candidate_status NOT NULL DEFAULT 'nuevo';

COMMENT ON COLUMN public.candidates.status IS 'Estado del candidato en el pipeline de selección.';
