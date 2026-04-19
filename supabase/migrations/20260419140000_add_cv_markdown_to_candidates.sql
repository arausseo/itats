-- Guarda el markdown extraído del PDF durante el pipeline de procesamiento.
-- Los candidatos existentes quedan con '' (sin contenido); el botón en la UI se desactiva cuando está vacío.
ALTER TABLE public.candidates
  ADD COLUMN cv_markdown text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.candidates.cv_markdown IS 'Texto markdown extraído del CV por la IA durante el pipeline.';
