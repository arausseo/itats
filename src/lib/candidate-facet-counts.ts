import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidateListFilterState } from "@/src/lib/candidate-filters-query";

export type FacetCountBundle = {
  seniority: Record<string, number>;
  seniorityTotal: number;
  pais: Record<string, number>;
  paisTotal: number;
  rol: Record<string, number>;
  rolTotal: number;
  stack: Record<string, number>;
  stackTotal: number;
  frameworks: Record<string, number>;
  frameworksTotal: number;
  patrones: Record<string, number>;
  patronesTotal: number;
};

export type FacetCountOptions = {
  seniorityOptions: string[];
  paisOptions: string[];
  rolOptions: string[];
  stackOptions: string[];
  frameworkOptions: string[];
  patronOptions: string[];
};

function zeroRecord(keys: string[]): Record<string, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
}

export function emptyFacetBundle(opt: FacetCountOptions): FacetCountBundle {
  return {
    seniority: zeroRecord(opt.seniorityOptions),
    seniorityTotal: 0,
    pais: zeroRecord(opt.paisOptions),
    paisTotal: 0,
    rol: zeroRecord(opt.rolOptions),
    rolTotal: 0,
    stack: zeroRecord(opt.stackOptions),
    stackTotal: 0,
    frameworks: zeroRecord(opt.frameworkOptions),
    frameworksTotal: 0,
    patrones: zeroRecord(opt.patronOptions),
    patronesTotal: 0,
  };
}

/**
 * Conteos por opción (faceta): mismos filtros que el listado salvo el campo de
 * cada faceta. La agregación se hace en Postgres vía el RPC `get_candidate_facets`
 * (un round-trip, respeta RLS), en lugar de traer todas las filas y contar en app.
 */
export async function computeFacetCounts(
  supabase: SupabaseClient,
  filters: CandidateListFilterState,
  opt: FacetCountOptions,
): Promise<FacetCountBundle> {
  const libreActive = filters.libre.trim() !== "";

  const { data, error } = await supabase.rpc("get_candidate_facets", {
    p_q: filters.q ?? "",
    p_libre_active: libreActive,
    p_libre_ids: filters.libreCandidateIds ?? [],
    p_seniority: filters.seniority ?? "",
    p_pais: filters.pais ?? "",
    p_roles: filters.roles ?? [],
    p_stacks: filters.stacks ?? [],
    p_frameworks: filters.frameworks ?? [],
    p_patrones: filters.patrones ?? [],
    p_date_from: filters.dateFrom ? `${filters.dateFrom}T00:00:00.000Z` : null,
    p_date_to: filters.dateTo ? `${filters.dateTo}T23:59:59.999Z` : null,
  });

  if (error) throw error;

  const r = (data ?? {}) as Record<string, unknown>;
  // Combina con zeroRecord para que TODAS las opciones aparezcan (0 si no hay).
  const rec = (key: string, options: string[]): Record<string, number> => ({
    ...zeroRecord(options),
    ...((r[key] as Record<string, number> | undefined) ?? {}),
  });
  const num = (key: string): number => Number(r[key] ?? 0);

  return {
    seniority: rec("seniority", opt.seniorityOptions),
    seniorityTotal: num("seniorityTotal"),
    pais: rec("pais", opt.paisOptions),
    paisTotal: num("paisTotal"),
    rol: rec("rol", opt.rolOptions),
    rolTotal: num("rolTotal"),
    stack: rec("stack", opt.stackOptions),
    stackTotal: num("stackTotal"),
    frameworks: rec("frameworks", opt.frameworkOptions),
    frameworksTotal: num("frameworksTotal"),
    patrones: rec("patrones", opt.patronOptions),
    patronesTotal: num("patronesTotal"),
  };
}
