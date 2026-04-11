-- Tabla de candidatos para ATS (Edge Function process-candidate)

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  pais_residencia text not null,
  telefono text not null,
  rol_principal text not null,
  seniority_estimado text not null,
  anos_experiencia_total integer not null,
  resumen_ejecutivo text not null,
  lenguajes jsonb not null default '[]'::jsonb,
  frameworks jsonb not null default '[]'::jsonb,
  patrones jsonb not null default '[]'::jsonb,
  sectores jsonb not null default '[]'::jsonb,
  red_flags jsonb not null default '[]'::jsonb,
  raw_analysis jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.candidates is 'Candidatos ingestados desde Dify / pipeline de análisis.';
comment on column public.candidates.nombre is 'datos_personales.nombre';
comment on column public.candidates.email is 'datos_personales.email (unicidad lógica: lower(trim(email)))';
comment on column public.candidates.pais_residencia is 'datos_personales.pais_residencia';
comment on column public.candidates.telefono is 'datos_personales.telefono';
comment on column public.candidates.rol_principal is 'perfil_tecnico.rol_principal';
comment on column public.candidates.lenguajes is 'perfil_tecnico.lenguajes (jsonb array)';
comment on column public.candidates.frameworks is 'perfil_tecnico.frameworks_y_herramientas (jsonb array)';
comment on column public.candidates.patrones is 'perfil_tecnico.patrones_y_arquitectura (jsonb array)';
comment on column public.candidates.anos_experiencia_total is 'evaluacion.anos_experiencia_total';
comment on column public.candidates.sectores is 'evaluacion.sectores (jsonb array)';
comment on column public.candidates.seniority_estimado is 'evaluacion.seniority_estimado';
comment on column public.candidates.resumen_ejecutivo is 'evaluacion.resumen_ejecutivo';
comment on column public.candidates.red_flags is 'evaluacion.red_flags (jsonb array)';
comment on column public.candidates.raw_analysis is 'Payload validado completo (JSON de análisis / Dify).';

create unique index candidates_email_lower_trim_unique
  on public.candidates (lower(trim(email)));
