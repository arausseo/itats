/**
 * Fila debe tener en `column` (jsonb array de strings) al menos uno de `values`.
 * PostgREST: varias condiciones `cs` unidas con `or` en la misma columna.
 */
export function applyJsonbArrayMatchesAny<T extends { or: (s: string) => T }>(
  query: T,
  column: string,
  values: string[],
): T {
  if (values.length === 0) {
    return query;
  }
  const orClause = values
    .map((v) => `${column}.cs.${JSON.stringify([v])}`)
    .join(",");
  return query.or(orClause);
}
