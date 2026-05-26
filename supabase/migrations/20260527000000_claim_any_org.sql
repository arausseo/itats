-- RPC global: reclama el siguiente item pendiente entre todas las organizaciones
-- activas (processing_enabled distinto de false). Diseñada para el worker en
-- contenedor que procesa la cola en background, sin discriminar por org.
--
-- Devuelve la fila completa de cv_processing_queue (incluye organization_id,
-- position_id, application_answers) para que el worker tenga el contexto
-- necesario para correr la pipeline.
--
-- Convive con `claim_next_cv_queue_item` (por-org) que sigue usando el
-- procesador del navegador como fallback durante la transición.

CREATE OR REPLACE FUNCTION public.claim_next_cv_queue_item_any_org(
  p_locked_by            text,
  p_lock_timeout_minutes int DEFAULT 10
)
RETURNS SETOF public.cv_processing_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Liberar locks caducados a nivel global (procesador caído sin update)
  UPDATE public.cv_processing_queue
  SET status = 'pending', locked_by = NULL, locked_at = NULL
  WHERE status = 'processing'
    AND locked_at < now() - (p_lock_timeout_minutes || ' minutes')::interval;

  -- 2. Reclamar atómicamente el siguiente item pendiente. Restricciones:
  --    - La organización debe tener processing_enabled distinto de false
  --      (NULL en cv_queue_settings se interpreta como habilitado por default).
  --    - No debe haber otro procesador activo (status='processing' con
  --      locked_by distinto) para la misma organización — mantiene la
  --      invariante de "un procesador activo por org".
  --    - FOR UPDATE SKIP LOCKED previene race conditions entre instancias del
  --      worker o entre worker y procesador del navegador durante convivencia.
  RETURN QUERY
  UPDATE public.cv_processing_queue
  SET status = 'processing', locked_by = p_locked_by, locked_at = now()
  WHERE id = (
    SELECT q.id
    FROM public.cv_processing_queue q
    LEFT JOIN public.cv_queue_settings s
      ON s.organization_id = q.organization_id
    WHERE q.status = 'pending'
      AND COALESCE(s.processing_enabled, true) = true
      AND NOT EXISTS (
        SELECT 1 FROM public.cv_processing_queue q2
        WHERE q2.organization_id = q.organization_id
          AND q2.status = 'processing'
          AND q2.locked_by IS DISTINCT FROM p_locked_by
      )
    ORDER BY q.created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
