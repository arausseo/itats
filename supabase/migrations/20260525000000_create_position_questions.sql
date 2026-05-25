-- Preguntas opcionales por plaza para postulaciones públicas (landing).
-- Tipos: boolean (sí/no), numeric (entero/decimal positivo), text (libre).
-- `required = true` obliga al candidato a responder en el formulario público.

CREATE TYPE public.position_question_type AS ENUM ('boolean', 'numeric', 'text');

CREATE TABLE public.position_questions (
  id             uuid                          PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id    uuid                          NOT NULL REFERENCES public.positions (id) ON DELETE CASCADE,
  question_text  text                          NOT NULL,
  question_type  public.position_question_type NOT NULL,
  required       boolean                       NOT NULL DEFAULT false,
  order_index    int                           NOT NULL DEFAULT 0,
  created_at     timestamptz                   NOT NULL DEFAULT now(),
  updated_at     timestamptz                   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.position_questions IS 'Preguntas configurables por plaza, mostradas al postulante en la landing pública.';
COMMENT ON COLUMN public.position_questions.required IS 'Si true, el candidato debe responder para enviar la postulación.';
COMMENT ON COLUMN public.position_questions.order_index IS 'Orden de aparición en el formulario (asc).';

CREATE INDEX position_questions_position_id_idx
  ON public.position_questions (position_id, order_index);

ALTER TABLE public.position_questions ENABLE ROW LEVEL SECURITY;

-- Lectura/escritura sólo para miembros de la misma organización
CREATE POLICY "position_questions_select_same_org"
  ON public.position_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  );

CREATE POLICY "position_questions_insert_same_org"
  ON public.position_questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  );

CREATE POLICY "position_questions_update_same_org"
  ON public.position_questions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  );

CREATE POLICY "position_questions_delete_same_org"
  ON public.position_questions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions pos
      JOIN public.profiles prof ON prof.organization_id = pos.organization_id
      WHERE pos.id = position_id AND prof.id = auth.uid()
    )
  );
