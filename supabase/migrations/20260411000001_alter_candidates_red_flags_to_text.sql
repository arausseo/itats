-- red_flags: jsonb array -> text (ítems separados por salto de línea)
-- (USING no admite subconsultas; la conversión va en una función auxiliar temporal)

create or replace function public._candidates_red_flags_jsonb_to_text(j jsonb)
returns text
language sql
immutable
as $$
  select case jsonb_typeof(j)
    when 'array' then coalesce(
      (
        select string_agg(x, E'\n')
        from jsonb_array_elements_text(j) as t(x)
      ),
      ''
    )
    else j::text
  end;
$$;

alter table public.candidates
  alter column red_flags type text
  using (public._candidates_red_flags_jsonb_to_text(red_flags));

drop function public._candidates_red_flags_jsonb_to_text(jsonb);

alter table public.candidates
  alter column red_flags set default '';

comment on column public.candidates.red_flags is 'evaluacion.red_flags (texto; antes jsonb array, ítems unidos con salto de línea)';
