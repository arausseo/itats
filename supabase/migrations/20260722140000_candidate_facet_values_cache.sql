-- Perf: cache de valores de faceta por organizacion, para typeahead instantaneo
-- (base counts) en TODAS las facetas: seniority, pais, rol, lenguajes, frameworks,
-- patrones. Reemplaza el escaneo completo de columnas por carga y el conteo en app.
-- Tabla real (no vista materializada) para poder aplicar RLS por organizacion.

create extension if not exists pg_trgm;

create table if not exists public.candidate_facet_values (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('seniority', 'pais', 'rol', 'lenguajes', 'frameworks', 'patrones')),
  value text not null,
  count integer not null default 0,
  primary key (organization_id, kind, value)
);

comment on table public.candidate_facet_values is
  'Cache de valores distintos de faceta + count por organizacion. Refrescada por refresh_candidate_facets().';

alter table public.candidate_facet_values enable row level security;

create policy "facet_values_select_same_org"
  on public.candidate_facet_values
  for select
  to authenticated
  using (
    organization_id = (
      select p.organization_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Trigram para prefijo/substring en el typeahead; + lookup por (org, kind).
create index if not exists candidate_facet_values_value_trgm
  on public.candidate_facet_values using gin (value gin_trgm_ops);
create index if not exists candidate_facet_values_org_kind
  on public.candidate_facet_values (organization_id, kind);

-- Recomputa TODA la cache (DELETE + INSERT atomico). SECURITY DEFINER: escribe
-- across orgs, salteando RLS. La llama el ingest tras cada tanda y/o un cron.
create or replace function public.refresh_candidate_facets()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.candidate_facet_values;

  insert into public.candidate_facet_values (organization_id, kind, value, count)
  select organization_id, 'seniority', seniority_estimado, count(*)::int
    from public.candidates
    where coalesce(seniority_estimado, '') <> ''
    group by organization_id, seniority_estimado
  union all
  select organization_id, 'pais', pais_residencia, count(*)::int
    from public.candidates
    where coalesce(pais_residencia, '') <> ''
    group by organization_id, pais_residencia
  union all
  select organization_id, 'rol', rol_principal, count(*)::int
    from public.candidates
    where coalesce(rol_principal, '') <> ''
    group by organization_id, rol_principal
  union all
  select c.organization_id, 'lenguajes', elem, count(distinct c.id)::int
    from public.candidates c, lateral jsonb_array_elements_text(coalesce(c.lenguajes, '[]'::jsonb)) elem
    where elem <> ''
    group by c.organization_id, elem
  union all
  select c.organization_id, 'frameworks', elem, count(distinct c.id)::int
    from public.candidates c, lateral jsonb_array_elements_text(coalesce(c.frameworks, '[]'::jsonb)) elem
    where elem <> ''
    group by c.organization_id, elem
  union all
  select c.organization_id, 'patrones', elem, count(distinct c.id)::int
    from public.candidates c, lateral jsonb_array_elements_text(coalesce(c.patrones, '[]'::jsonb)) elem
    where elem <> ''
    group by c.organization_id, elem;
end;
$$;

-- Typeahead: valores que matchean + su base count, scopeado por RLS a la org.
create or replace function public.search_facet_values(
  p_kind text,
  p_prefix text default '',
  p_limit int default 20
)
returns table (value text, count int)
language sql
stable
security invoker
set search_path = public
as $$
  select v.value, v.count
  from public.candidate_facet_values v
  where v.kind = p_kind
    and (p_prefix = '' or v.value ilike '%' || p_prefix || '%')
  order by v.count desc, v.value asc
  limit greatest(1, least(p_limit, 100));
$$;

-- Permisos: buscar = authenticated (RLS filtra por org); refrescar = service_role.
revoke execute on function public.refresh_candidate_facets() from public;
grant execute on function public.refresh_candidate_facets() to service_role;
grant execute on function public.search_facet_values(text, text, int) to authenticated;

-- Populate inicial.
select public.refresh_candidate_facets();
