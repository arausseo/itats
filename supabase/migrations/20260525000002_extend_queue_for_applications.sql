-- Extiende la cola de procesamiento para soportar postulaciones públicas:
-- - `position_id`: si la subida proviene de la landing pública, asocia al candidato
--   con la plaza creando `position_candidates` tras el insert exitoso.
-- - `application_answers`: respuestas pendientes que se escribirán en la columna
--   `candidates.application_answers` cuando el pipeline complete.
-- - `source`: distingue cargas internas ('internal') de postulaciones públicas
--   ('public_application') — útil para auditoría y reporting.

ALTER TABLE public.cv_processing_queue
  ADD COLUMN IF NOT EXISTS position_id         uuid REFERENCES public.positions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source              text  NOT NULL DEFAULT 'internal'
                                                    CHECK (source IN ('internal', 'public_application'));

COMMENT ON COLUMN public.cv_processing_queue.position_id IS
  'Plaza a la que se postuló el candidato (sólo cargas vía landing pública).';
COMMENT ON COLUMN public.cv_processing_queue.application_answers IS
  'Respuestas pendientes; se copian a candidates.application_answers tras el insert.';
COMMENT ON COLUMN public.cv_processing_queue.source IS
  'internal = subida desde el panel; public_application = postulación LinkedIn.';

CREATE INDEX IF NOT EXISTS cv_processing_queue_position_id_idx
  ON public.cv_processing_queue (position_id)
  WHERE position_id IS NOT NULL;
