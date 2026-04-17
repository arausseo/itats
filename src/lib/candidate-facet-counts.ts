import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeStringArray } from "@/src/types/candidate";
import {
  applyCandidateFilters,
  type CandidateListFilterState,
  type FacetExclude,
} from "@/src/lib/candidate-filters-query";

const BATCH = 1000;

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

async function fetchRowsForFacet(
  supabase: SupabaseClient,
  filters: CandidateListFilterState,
  exclude: FacetExclude,
  select: string,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += BATCH) {
    const q = applyCandidateFilters(supabase, filters, exclude, select)
      .order("id", { ascending: true })
      .range(from, from + BATCH - 1);
    const { data, error } = await q;
    if (error) {
      throw error;
    }
    if (!data?.length) {
      break;
    }
    out.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < BATCH) {
      break;
    }
  }
  return out;
}

function tallyScalarColumn(
  rows: Record<string, unknown>[],
  column: string,
  options: string[],
): Record<string, number> {
  const counts = zeroRecord(options);
  for (const row of rows) {
    const v = String(row[column] ?? "").trim();
    if (v && counts[v] !== undefined) {
      counts[v]++;
    }
  }
  return counts;
}

function tallyJsonbArrayContains(
  rows: Record<string, unknown>[],
  column: string,
  options: string[],
): Record<string, number> {
  const counts = zeroRecord(options);
  const optSet = new Set(options);
  for (const row of rows) {
    const arr = normalizeStringArray(row[column]);
    const seen = new Set<string>();
    for (const raw of arr) {
      const s = raw.trim();
      if (s && optSet.has(s) && !seen.has(s)) {
        seen.add(s);
        counts[s]++;
      }
    }
  }
  return counts;
}

/**
 * Conteos por opción (faceta): mismos filtros que el listado salvo el campo de cada faceta.
 */
export async function computeFacetCounts(
  supabase: SupabaseClient,
  filters: CandidateListFilterState,
  opt: FacetCountOptions,
): Promise<FacetCountBundle> {
  const [
    seniorityRows,
    paisRows,
    rolRows,
    stackRows,
    fwRows,
    patRows,
  ] = await Promise.all([
    fetchRowsForFacet(supabase, filters, "seniority", "seniority_estimado"),
    fetchRowsForFacet(supabase, filters, "pais", "pais_residencia"),
    fetchRowsForFacet(supabase, filters, "rol", "rol_principal"),
    fetchRowsForFacet(supabase, filters, "stack", "lenguajes"),
    fetchRowsForFacet(supabase, filters, "frameworks", "frameworks"),
    fetchRowsForFacet(supabase, filters, "patrones", "patrones"),
  ]);

  return {
    seniority: tallyScalarColumn(seniorityRows, "seniority_estimado", opt.seniorityOptions),
    seniorityTotal: seniorityRows.length,
    pais: tallyScalarColumn(paisRows, "pais_residencia", opt.paisOptions),
    paisTotal: paisRows.length,
    rol: tallyScalarColumn(rolRows, "rol_principal", opt.rolOptions),
    rolTotal: rolRows.length,
    stack: tallyJsonbArrayContains(stackRows, "lenguajes", opt.stackOptions),
    stackTotal: stackRows.length,
    frameworks: tallyJsonbArrayContains(fwRows, "frameworks", opt.frameworkOptions),
    frameworksTotal: fwRows.length,
    patrones: tallyJsonbArrayContains(patRows, "patrones", opt.patronOptions),
    patronesTotal: patRows.length,
  };
}
