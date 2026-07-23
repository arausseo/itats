import type { SupabaseClient } from "@supabase/supabase-js";
import { getLocale } from "next-intl/server";

function sortLocaleTag(locale: string): string {
  return locale === "en" ? "en" : "es";
}

export type FacetOption = { value: string; count: number };

/**
 * Opciones de faceta desde la cache `candidate_facet_values` (RLS por org).
 * Reemplaza el escaneo completo de columnas. Para selects escalares
 * (seniority/pais) que necesitan la lista precargada con su base count.
 */
export async function fetchFacetOptionsFromCache(
  supabase: SupabaseClient,
  kind: "seniority" | "pais" | "rol" | "lenguajes" | "frameworks" | "patrones",
): Promise<FacetOption[]> {
  const collator = sortLocaleTag(await getLocale());
  const { data, error } = await supabase
    .from("candidate_facet_values")
    .select("value, count")
    .eq("kind", kind);
  if (error || !data) return [];
  return (data as FacetOption[])
    .filter((r) => r.value && r.value.trim())
    .sort((a, b) => a.value.localeCompare(b.value, collator));
}

/** Requiere la migración `match_candidate_ids_by_libre` en Supabase. */
export async function fetchLibreCandidateIds(
  supabase: SupabaseClient,
  term: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("match_candidate_ids_by_libre", {
    p_term: term,
  });
  if (error) {
    throw error;
  }
  return (data ?? []) as string[];
}
