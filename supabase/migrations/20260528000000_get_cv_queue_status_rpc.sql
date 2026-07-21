-- RPC ligero: conteos de cola + flag de procesamiento en un solo round-trip (siempre 1 fila).

CREATE OR REPLACE FUNCTION public.get_cv_queue_status(p_organization_id uuid)
RETURNS TABLE (
  pending             bigint,
  processing          bigint,
  processing_enabled  boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT count(*)::bigint
      FROM public.cv_processing_queue
      WHERE organization_id = p_organization_id
        AND status = 'pending'
    ) AS pending,
    (
      SELECT count(*)::bigint
      FROM public.cv_processing_queue
      WHERE organization_id = p_organization_id
        AND status = 'processing'
    ) AS processing,
    COALESCE(
      (
        SELECT s.processing_enabled
        FROM public.cv_queue_settings s
        WHERE s.organization_id = p_organization_id
      ),
      true
    ) AS processing_enabled;
$$;
