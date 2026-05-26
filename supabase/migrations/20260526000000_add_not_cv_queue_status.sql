-- Permite el nuevo estado 'not_cv' en la cola de procesamiento.
-- Se asigna cuando la IA determina que el PDF subido no es un CV (es_cv = false en la respuesta).
-- A diferencia de 'error', es un resultado válido del pipeline: no se crea registro de candidato
-- ni se enlaza a ninguna plaza; el item queda en el historial para visibilidad.

ALTER TABLE public.cv_processing_queue
  DROP CONSTRAINT IF EXISTS cv_processing_queue_status_check;

ALTER TABLE public.cv_processing_queue
  ADD CONSTRAINT cv_processing_queue_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'duplicate', 'not_cv', 'error'));

COMMENT ON COLUMN public.cv_processing_queue.status IS
  'pending | processing | completed | duplicate | not_cv | error';
