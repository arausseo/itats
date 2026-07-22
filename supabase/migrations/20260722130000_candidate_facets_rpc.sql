-- Perf: RPC que agrega los conteos de facetas en la BD (un solo round-trip),
-- reemplazando el patron previo de traer TODAS las filas x6 y contar en app.
-- Semantica "excluir la propia faceta": cada faceta cuenta con todos los
-- filtros salvo el suyo (igual que el codigo actual).
-- SECURITY INVOKER → respeta RLS (scoping por organizacion del usuario).

-- Indices GIN para acelerar tanto el filtrado (@>) como el RPC (?|).
create index if not exists idx_candidates_lenguajes_gin on public.candidates using gin (lenguajes);
create index if not exists idx_candidates_frameworks_gin on public.candidates using gin (frameworks);
create index if not exists idx_candidates_patrones_gin on public.candidates using gin (patrones);

create or replace function public.get_candidate_facets(
  p_q text default '',
  p_libre_active boolean default false,
  p_libre_ids uuid[] default '{}',
  p_seniority text default '',
  p_pais text default '',
  p_roles text[] default '{}',
  p_stacks text[] default '{}',
  p_frameworks text[] default '{}',
  p_patrones text[] default '{}',
  p_date_from timestamptz default null,
  p_date_to timestamptz default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select c.id, c.seniority_estimado, c.pais_residencia, c.rol_principal,
           c.lenguajes, c.frameworks, c.patrones
    from public.candidates c
    where (p_q = '' or c.nombre ilike '%' || p_q || '%')
      and (not p_libre_active or c.id = any(p_libre_ids))
      and (p_date_from is null or c.created_at >= p_date_from)
      and (p_date_to is null or c.created_at <= p_date_to)
  )
  select jsonb_build_object(
    'seniority', (
      select coalesce(jsonb_object_agg(v, c), '{}'::jsonb) from (
        select b.seniority_estimado as v, count(*) as c
        from base b
        where (p_pais = '' or b.pais_residencia = p_pais)
          and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
          and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
          and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
          and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
          and coalesce(b.seniority_estimado, '') <> ''
        group by b.seniority_estimado
      ) s
    ),
    'seniorityTotal', (
      select count(*) from base b
      where (p_pais = '' or b.pais_residencia = p_pais)
        and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
        and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
        and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
        and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
    ),
    'pais', (
      select coalesce(jsonb_object_agg(v, c), '{}'::jsonb) from (
        select b.pais_residencia as v, count(*) as c
        from base b
        where (p_seniority = '' or b.seniority_estimado = p_seniority)
          and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
          and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
          and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
          and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
          and coalesce(b.pais_residencia, '') <> ''
        group by b.pais_residencia
      ) s
    ),
    'paisTotal', (
      select count(*) from base b
      where (p_seniority = '' or b.seniority_estimado = p_seniority)
        and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
        and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
        and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
        and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
    ),
    'rol', (
      select coalesce(jsonb_object_agg(v, c), '{}'::jsonb) from (
        select b.rol_principal as v, count(*) as c
        from base b
        where (p_seniority = '' or b.seniority_estimado = p_seniority)
          and (p_pais = '' or b.pais_residencia = p_pais)
          and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
          and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
          and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
          and coalesce(b.rol_principal, '') <> ''
        group by b.rol_principal
      ) s
    ),
    'rolTotal', (
      select count(*) from base b
      where (p_seniority = '' or b.seniority_estimado = p_seniority)
        and (p_pais = '' or b.pais_residencia = p_pais)
        and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
        and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
        and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
    ),
    'stack', (
      select coalesce(jsonb_object_agg(v, c), '{}'::jsonb) from (
        select elem as v, count(distinct b.id) as c
        from base b, lateral jsonb_array_elements_text(coalesce(b.lenguajes, '[]'::jsonb)) elem
        where (p_seniority = '' or b.seniority_estimado = p_seniority)
          and (p_pais = '' or b.pais_residencia = p_pais)
          and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
          and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
          and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
          and elem <> ''
        group by elem
      ) s
    ),
    'stackTotal', (
      select count(*) from base b
      where (p_seniority = '' or b.seniority_estimado = p_seniority)
        and (p_pais = '' or b.pais_residencia = p_pais)
        and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
        and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
        and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
    ),
    'frameworks', (
      select coalesce(jsonb_object_agg(v, c), '{}'::jsonb) from (
        select elem as v, count(distinct b.id) as c
        from base b, lateral jsonb_array_elements_text(coalesce(b.frameworks, '[]'::jsonb)) elem
        where (p_seniority = '' or b.seniority_estimado = p_seniority)
          and (p_pais = '' or b.pais_residencia = p_pais)
          and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
          and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
          and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
          and elem <> ''
        group by elem
      ) s
    ),
    'frameworksTotal', (
      select count(*) from base b
      where (p_seniority = '' or b.seniority_estimado = p_seniority)
        and (p_pais = '' or b.pais_residencia = p_pais)
        and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
        and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
        and (cardinality(p_patrones) = 0 or b.patrones ?| p_patrones)
    ),
    'patrones', (
      select coalesce(jsonb_object_agg(v, c), '{}'::jsonb) from (
        select elem as v, count(distinct b.id) as c
        from base b, lateral jsonb_array_elements_text(coalesce(b.patrones, '[]'::jsonb)) elem
        where (p_seniority = '' or b.seniority_estimado = p_seniority)
          and (p_pais = '' or b.pais_residencia = p_pais)
          and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
          and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
          and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
          and elem <> ''
        group by elem
      ) s
    ),
    'patronesTotal', (
      select count(*) from base b
      where (p_seniority = '' or b.seniority_estimado = p_seniority)
        and (p_pais = '' or b.pais_residencia = p_pais)
        and (cardinality(p_roles) = 0 or b.rol_principal = any(p_roles))
        and (cardinality(p_stacks) = 0 or b.lenguajes ?| p_stacks)
        and (cardinality(p_frameworks) = 0 or b.frameworks ?| p_frameworks)
    )
  );
$$;

grant execute on function public.get_candidate_facets(
  text, boolean, uuid[], text, text, text[], text[], text[], text[], timestamptz, timestamptz
) to authenticated;
