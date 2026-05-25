-- Metadata por candidato: respuestas a las preguntas configuradas en la plaza
-- al momento de postularse. Las respuestas viven en el candidato (no en
-- position_candidates) — son una propiedad del perfil del candidato.
--
-- Formato JSON:
-- [
--   {
--     "question_id": "uuid",
--     "position_id": "uuid",
--     "question_text": "...",
--     "question_type": "boolean" | "numeric" | "text",
--     "answer": <boolean | number | string>,
--     "answered_at": "ISO timestamp"
--   },
--   ...
-- ]

ALTER TABLE public.candidates
  ADD COLUMN application_answers jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.candidates.application_answers IS
  'Respuestas del candidato a las preguntas de la plaza por la que se postuló (metadata del candidato).';
