import type { SupabaseClient } from "@supabase/supabase-js";
import { applyJsonbArrayMatchesAny } from "@/src/lib/supabase-candidate-filters";

/** UUID que no debería existir: fuerza 0 filas cuando el filtro libre no coincide con nadie. */
export const LIBRE_NO_MATCH_PLACEHOLDER_ID =
  "00000000-0000-0000-0000-000000000000";

export type CandidateListFilterState = {
  q: string;
  /** Subcadena en resumen_ejecutivo o en JSONB (lenguajes, frameworks, patrones, certificaciones, sectores). */
  libre: string;
  /** IDs devueltos por RPC `match_candidate_ids_by_libre`; obligatorio si `libre` no está vacío. */
  libreCandidateIds?: string[];
  seniority: string;
  pais: string;
  roles: string[];
  stacks: string[];
  frameworks: string[];
  patrones: string[];
  /** ISO date string YYYY-MM-DD inclusive lower bound on created_at */
  dateFrom?: string;
  /** ISO date string YYYY-MM-DD inclusive upper bound on created_at */
  dateTo?: string;
};

export type FacetExclude =
  | "seniority"
  | "pais"
  | "rol"
  | "stack"
  | "frameworks"
  | "patrones";

/**
 * Construye la query de listado. `exclude` omite un criterio para conteos de faceta.
 */
export function applyCandidateFilters(
  supabase: SupabaseClient,
  filters: CandidateListFilterState,
  exclude: FacetExclude | null,
  select: string,
  countOptions?: { count: "exact" | "estimated" | "planned"; head?: boolean },
) {
  let query = supabase.from("candidates").select(select, countOptions);

  if (filters.q) {
    query = query.ilike("nombre", `%${filters.q}%`);
  }
  const libreTrim = filters.libre.trim();
  if (libreTrim) {
    const ids = filters.libreCandidateIds;
    if (ids === undefined) {
      query = query.eq("id", LIBRE_NO_MATCH_PLACEHOLDER_ID);
    } else if (ids.length === 0) {
      query = query.eq("id", LIBRE_NO_MATCH_PLACEHOLDER_ID);
    } else {
      query = query.in("id", ids);
    }
  }
  if (exclude !== "seniority" && filters.seniority) {
    query = query.eq("seniority_estimado", filters.seniority);
  }
  if (exclude !== "pais" && filters.pais) {
    query = query.eq("pais_residencia", filters.pais);
  }
  if (exclude !== "rol" && filters.roles.length > 0) {
    query = query.in("rol_principal", filters.roles);
  }
  if (exclude !== "stack") {
    query = applyJsonbArrayMatchesAny(query, "lenguajes", filters.stacks);
  }
  if (exclude !== "frameworks") {
    query = applyJsonbArrayMatchesAny(query, "frameworks", filters.frameworks);
  }
  if (exclude !== "patrones") {
    query = applyJsonbArrayMatchesAny(query, "patrones", filters.patrones);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  return query;
}
