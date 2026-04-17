import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeStringArray } from "@/src/types/candidate";

export async function fetchSeniorityOptions(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("candidates")
    .select("seniority_estimado");
  if (error || !data) {
    return [];
  }
  const set = new Set<string>();
  for (const row of data as { seniority_estimado?: string }[]) {
    const s = row.seniority_estimado;
    if (typeof s === "string" && s.trim()) {
      set.add(s.trim());
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export async function fetchPaisOptions(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("candidates")
    .select("pais_residencia");
  if (error || !data) {
    return [];
  }
  const set = new Set<string>();
  for (const row of data as { pais_residencia?: string }[]) {
    const s = row.pais_residencia;
    if (typeof s === "string" && s.trim()) {
      set.add(s.trim());
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export async function fetchRolOptions(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase.from("candidates").select("rol_principal");
  if (error || !data) {
    return [];
  }
  const set = new Set<string>();
  for (const row of data as { rol_principal?: string }[]) {
    const s = row.rol_principal;
    if (typeof s === "string" && s.trim()) {
      set.add(s.trim());
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function mergeJsonbStringSets(
  data: unknown,
  column: string,
  into: Set<string>,
) {
  if (!Array.isArray(data)) {
    return;
  }
  for (const row of data) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const v = (row as Record<string, unknown>)[column];
    for (const s of normalizeStringArray(v)) {
      if (s.trim()) {
        into.add(s.trim());
      }
    }
  }
}

export async function fetchJsonbArrayOptions(
  supabase: SupabaseClient,
  column: "lenguajes" | "frameworks" | "patrones",
): Promise<string[]> {
  const { data, error } = await supabase
    .from("candidates")
    .select(column);
  if (error || !data) {
    return [];
  }
  const set = new Set<string>();
  mergeJsonbStringSets(data, column, set);
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
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
