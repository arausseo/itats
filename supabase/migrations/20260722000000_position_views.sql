-- Tracking de vistas de la página pública de postulación por plaza.
-- Las solicitudes ya se cuentan desde cv_processing_queue (source='public_application').

-- 1) Contador de vistas en positions
ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.positions.views IS
  'Vistas acumuladas de la página pública de postulación de la plaza.';

-- 2) RPC para incrementar vistas desde la página pública (usuario anónimo).
--    SECURITY DEFINER para saltarse RLS; sólo incrementa plazas abiertas.
CREATE OR REPLACE FUNCTION public.increment_position_views(p_position_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.positions
     SET views = views + 1
   WHERE id = p_position_id
     AND status = 'Open';
$$;

GRANT EXECUTE ON FUNCTION public.increment_position_views(uuid) TO anon, authenticated;
