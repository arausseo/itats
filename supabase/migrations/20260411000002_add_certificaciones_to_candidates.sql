-- Campo certificaciones en candidates (lista, mismo patrón que lenguajes/sectores)

alter table public.candidates
  add column certificaciones jsonb not null default '[]'::jsonb;

comment on column public.candidates.certificaciones is 'perfil_tecnico.certificaciones (jsonb array)';
