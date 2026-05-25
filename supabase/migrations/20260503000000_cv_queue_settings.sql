-- Configuración global de procesamiento de cola por organización.
-- processing_enabled = false impide reclamar nuevos items pending.

CREATE TABLE public.cv_queue_settings (
  organization_id    uuid        PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  processing_enabled boolean     NOT NULL DEFAULT true,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cv_queue_settings ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer la configuración de su organización
CREATE POLICY "queue_settings_select_same_org"
  ON public.cv_queue_settings
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- INSERT/UPDATE solo vía service_role (Server Actions)

-- Crear fila por defecto para organizaciones existentes
INSERT INTO public.cv_queue_settings (organization_id, processing_enabled)
SELECT id, true FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RPC: respetar processing_enabled antes de reclamar items
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
DECLARE
  v_processing_enabled boolean;
BEGIN
  -- 0. Verificar si el procesamiento está habilitado para la organización
  SELECT COALESCE(
    (SELECT s.processing_enabled
     FROM public.cv_queue_settings s
     WHERE s.organization_id = p_organization_id),
    true
  ) INTO v_processing_enabled;

  IF NOT v_processing_enabled THEN
    RETURN;
  END IF;

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
