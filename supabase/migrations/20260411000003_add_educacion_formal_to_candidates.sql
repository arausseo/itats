-- Campo educacion_formal en candidates (texto libre)

alter table public.candidates
  add column educacion_formal text not null default '';

comment on column public.candidates.educacion_formal is 'educacion_y_certificaciones.educacion_formal';
