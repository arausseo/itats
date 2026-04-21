-- Tabla de notas para candidatos
-- Permite a los reclutadores añadir comentarios y seguimiento

create table public.candidate_notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  content text not null,
  author_name text not null default 'Reclutador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.candidate_notes is 'Notas y comentarios de reclutadores sobre candidatos.';
comment on column public.candidate_notes.candidate_id is 'Referencia al candidato.';
comment on column public.candidate_notes.content is 'Contenido de la nota.';
comment on column public.candidate_notes.author_name is 'Nombre del autor de la nota.';

-- Índice para búsquedas por candidato
create index candidate_notes_candidate_id_idx on public.candidate_notes(candidate_id);

-- Índice para ordenar por fecha
create index candidate_notes_created_at_idx on public.candidate_notes(created_at desc);

-- Función para actualizar updated_at automáticamente
create or replace function public.update_candidate_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger para updated_at
create trigger candidate_notes_updated_at
  before update on public.candidate_notes
  for each row
  execute function public.update_candidate_notes_updated_at();

-- Habilitar RLS
alter table public.candidate_notes enable row level security;

-- Política para permitir todas las operaciones (ajustar según necesidades de auth)
create policy "Allow all operations on candidate_notes"
  on public.candidate_notes
  for all
  using (true)
  with check (true);
