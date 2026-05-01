-- Cola de procesamiento asíncrono de CVs.
-- Los archivos se encolan inmediatamente tras la subida.
-- Un hook de cliente drena la cola procesando un item a la vez por organización.

CREATE TABLE public.cv_processing_queue (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  storage_path    text        NOT NULL,
  file_name       text        NOT NULL,
  cv_sha256       text,
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'duplicate', 'error')),
  result_message  text,
  locked_by       text,       -- 'userId:tabId' — identifica al procesador activo
  locked_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);

CREATE INDEX cv_processing_queue_org_status_idx
  ON public.cv_processing_queue (organization_id, status, created_at);

ALTER TABLE public.cv_processing_queue ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer la cola de su organización
CREATE POLICY "queue_select_same_org"
  ON public.cv_processing_queue
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Usuarios autenticados pueden insertar en su organización
CREATE POLICY "queue_insert_same_org"
  ON public.cv_processing_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- UPDATE solo vía service_role (Server Actions) o SECURITY DEFINER functions.
-- Los usuarios autenticados NO pueden modificar estado de la cola directamente.

-- ---------------------------------------------------------------------------
-- RPC: reclamar el siguiente item pendiente de forma atómica
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_next_cv_queue_item(
  p_organization_id      uuid,
  p_locked_by            text,
  p_lock_timeout_minutes int DEFAULT 10
)
RETURNS SETOF public.cv_processing_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Liberar locks caducados (procesador que se cayó sin actualizar)
  UPDATE public.cv_processing_queue
  SET status = 'pending', locked_by = NULL, locked_at = NULL
  WHERE organization_id = p_organization_id
    AND status = 'processing'
    AND locked_at < now() - (p_lock_timeout_minutes || ' minutes')::interval;

  -- 2. Si hay otro procesador activo (distinto a quien llama) → no reclamar nada
  IF EXISTS (
    SELECT 1 FROM public.cv_processing_queue
    WHERE organization_id = p_organization_id
      AND status = 'processing'
      AND locked_by IS DISTINCT FROM p_locked_by
  ) THEN
    RETURN;
  END IF;

  -- 3. Reclamar atómicamente el siguiente item pendiente (SKIP LOCKED evita race conditions)
  RETURN QUERY
  UPDATE public.cv_processing_queue
  SET status = 'processing', locked_by = p_locked_by, locked_at = now()
  WHERE id = (
    SELECT id FROM public.cv_processing_queue
    WHERE organization_id = p_organization_id AND status = 'pending'
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
