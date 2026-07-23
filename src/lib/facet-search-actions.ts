"use server";

import { createClient } from "@/src/utils/supabase/server";

export type FacetSuggestion = { value: string; count: number };

export type FacetKind =
  | "seniority"
  | "pais"
  | "rol"
  | "lenguajes"
  | "frameworks"
  | "patrones";

/**
 * Typeahead de valores de faceta (base counts) desde la cache
 * `candidate_facet_values`, vía RPC `search_facet_values`. RLS scopea por org.
 */
export async function searchFacetValues(
  kind: FacetKind,
  prefix: string,
): Promise<FacetSuggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_facet_values", {
    p_kind: kind,
    p_prefix: prefix?.trim() ?? "",
    p_limit: 20,
  });
  if (error || !data) return [];
  return data as FacetSuggestion[];
}
