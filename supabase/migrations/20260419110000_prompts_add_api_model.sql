-- Añadir columnas api y model a prompts para que cada registro defina qué proveedor y modelo usar.
-- Valores válidos de api: 'gemini' | 'openai'.

ALTER TABLE public.prompts
  ADD COLUMN api   text NOT NULL DEFAULT 'gemini',
  ADD COLUMN model text NOT NULL DEFAULT 'gemini-2.5-flash';

COMMENT ON COLUMN public.prompts.api   IS 'Proveedor de IA: gemini | openai';
COMMENT ON COLUMN public.prompts.model IS 'Nombre exacto del modelo en la API del proveedor.';

-- Actualizar filas existentes con los valores que estaban hardcodeados en cv-processor.ts.
UPDATE public.prompts
SET api = 'gemini', model = 'gemini-2.5-flash'
WHERE name IN ('cv_summary', 'candidate_json');

-- Nuevo registro de configuración de embeddings.
-- content vacío: los embeddings no usan texto de prompt.
INSERT INTO public.prompts (name, content, api, model)
VALUES ('embedding_config', '', 'openai', 'text-embedding-3-small')
ON CONFLICT (name) DO UPDATE
  SET api   = EXCLUDED.api,
      model = EXCLUDED.model;
