CREATE TABLE public.prompts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        UNIQUE NOT NULL,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prompts IS 'Plantillas de prompt para el pipeline de análisis de CVs con IA.';

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_prompts"
  ON public.prompts
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.prompts (name, content) VALUES
(
  'cv_summary',
  'Eres un asistente experto en análisis de currículos. A partir del CV adjunto en PDF, extrae toda la información relevante del candidato y redacta un resumen estructurado en Markdown. Incluye: datos personales, experiencia laboral (empresa, rol, fechas, responsabilidades), stack tecnológico, educación formal, certificaciones y cualquier otro dato relevante. Sé exhaustivo y fiel al contenido original.'
),
(
  'candidate_json',
  E'Eres un analizador de CVs técnicos. A partir del siguiente resumen en Markdown, genera un JSON estrictamente válido con esta estructura exacta:\n\n{"datos_personales":{"nombre":"","pais_residencia":"","email":"","telefono":""},"perfil_tecnico":{"rol_principal":"","lenguajes":[],"frameworks_y_herramientas":[],"patrones_y_arquitectura":[]},"evaluacion":{"anos_experiencia_total":0,"sectores":[],"seniority_estimado":"","resumen_ejecutivo":"","red_flags":""},"educacion_y_certificaciones":{"educacion_formal":"","certificaciones":[]}}\n\nReglas:\n- seniority_estimado debe ser uno de: Junior, Semi-Senior, Senior, Lead, Principal.\n- anos_experiencia_total es un número entero.\n- red_flags es texto libre o "Nada relevante".\n- Responde SOLO con el JSON válido, sin markdown ni explicaciones adicionales.\n\nResumen del candidato:\n'
);
