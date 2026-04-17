/** Valor JSON almacenado en `raw_analysis` (jsonb). */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** JSONB columnas con default [] — se asumen strings; valores inesperados se filtran en runtime. */
export type JsonbStringArray = string[];

export interface Candidate {
  id: string;
  nombre: string;
  email: string;
  pais_residencia: string;
  telefono: string;
  rol_principal: string;
  seniority_estimado: string;
  anos_experiencia_total: number;
  resumen_ejecutivo: string;
  lenguajes: JsonbStringArray;
  frameworks: JsonbStringArray;
  patrones: JsonbStringArray;
  sectores: JsonbStringArray;
  red_flags: string;
  raw_analysis: JsonValue;
  created_at: string;
  certificaciones: JsonbStringArray;
  educacion_formal: string;
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(
      (v) => v === undefined || isJsonValue(v),
    );
  }
  return false;
}

/**
 * Normaliza una fila PostgREST/Supabase a `Candidate` con comprobaciones mínimas.
 */
export function parseCandidateRow(row: unknown): Candidate {
  if (!row || typeof row !== "object") {
    throw new Error("Fila de candidato inválida");
  }
  const r = row as Record<string, unknown>;
  const raw = r.raw_analysis;
  return {
    id: String(r.id ?? ""),
    nombre: String(r.nombre ?? ""),
    email: String(r.email ?? ""),
    pais_residencia: String(r.pais_residencia ?? ""),
    telefono: String(r.telefono ?? ""),
    rol_principal: String(r.rol_principal ?? ""),
    seniority_estimado: String(r.seniority_estimado ?? ""),
    anos_experiencia_total: Number(r.anos_experiencia_total ?? 0),
    resumen_ejecutivo: String(r.resumen_ejecutivo ?? ""),
    lenguajes: normalizeStringArray(r.lenguajes),
    frameworks: normalizeStringArray(r.frameworks),
    patrones: normalizeStringArray(r.patrones),
    sectores: normalizeStringArray(r.sectores),
    red_flags: String(r.red_flags ?? ""),
    raw_analysis: isJsonValue(raw) ? raw : {},
    created_at: String(r.created_at ?? ""),
    certificaciones: normalizeStringArray(r.certificaciones),
    educacion_formal: String(r.educacion_formal ?? ""),
  };
}

export function parseCandidateRows(rows: unknown): Candidate[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => parseCandidateRow(row));
}

/** Vacío o texto tipo "Nada relevante" se considera sin alertas. */
export function redFlagsIsClear(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.length === 0 || t.includes("nada relevante");
}
