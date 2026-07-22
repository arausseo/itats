-- Fase 5 (designV2): nivel de inglés (CEFR) inferido por IA en el análisis del CV.
-- Nullable: los candidatos existentes quedan en null (UI muestra "Sin datos").

alter table public.candidates
  add column if not exists nivel_ingles text
    check (nivel_ingles is null or nivel_ingles in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  add column if not exists nivel_ingles_confianza smallint
    check (nivel_ingles_confianza is null or nivel_ingles_confianza between 0 and 100);

comment on column public.candidates.nivel_ingles is
  'Nivel de inglés CEFR (A1..C2) inferido por IA desde el CV. Null = sin evaluar.';
comment on column public.candidates.nivel_ingles_confianza is
  'Confianza 0-100 de la estimación de nivel_ingles.';
