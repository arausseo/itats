export const CANDIDATE_STATUSES = [
  "nuevo",
  "en_proceso",
  "en_espera",
  "rechazado",
  "contratado",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  nuevo: "Nuevo",
  en_proceso: "En proceso",
  en_espera: "En espera",
  rechazado: "Rechazado",
  contratado: "Contratado",
};

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
  /** Nivel de inglés CEFR (A1..C2) inferido por IA. Null = sin evaluar. */
  nivel_ingles: string | null;
  /** Confianza 0-100 de la estimación de nivel_ingles. */
  nivel_ingles_confianza: number | null;
  raw_analysis: JsonValue;
  created_at: string;
  certificaciones: JsonbStringArray;
  educacion_formal: string;
  status: CandidateStatus;
  /** Ruta en el bucket `resumes` de Supabase Storage; null si no hay PDF asociado. */
  cv_storage_path: string | null;
  /** Texto markdown extraído del CV por la IA. Vacío en registros anteriores a la migración. */
  cv_markdown: string;
  /** Respuestas del candidato al postularse vía landing pública de una plaza. */
  application_answers: ApplicationAnswer[];
}

export interface ApplicationAnswer {
  question_id: string;
  position_id: string;
  question_text: string;
  question_type: "boolean" | "numeric" | "text";
  answer: string | number | boolean | null;
  answered_at: string;
}

function parseApplicationAnswers(value: unknown): ApplicationAnswer[] {
  if (!Array.isArray(value)) return [];
  const out: ApplicationAnswer[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const type = r.question_type;
    if (type !== "boolean" && type !== "numeric" && type !== "text") continue;
    const ans = r.answer;
    const validAns =
      typeof ans === "string" ||
      typeof ans === "number" ||
      typeof ans === "boolean" ||
      ans === null;
    if (!validAns) continue;
    out.push({
      question_id: String(r.question_id ?? ""),
      position_id: String(r.position_id ?? ""),
      question_text: String(r.question_text ?? ""),
      question_type: type,
      answer: ans,
      answered_at: String(r.answered_at ?? ""),
    });
  }
  return out;
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
    nivel_ingles:
      typeof r.nivel_ingles === "string" && r.nivel_ingles.trim().length > 0
        ? r.nivel_ingles.trim()
        : null,
    nivel_ingles_confianza:
      typeof r.nivel_ingles_confianza === "number"
        ? r.nivel_ingles_confianza
        : null,
    raw_analysis: isJsonValue(raw) ? raw : {},
    created_at: String(r.created_at ?? ""),
    certificaciones: normalizeStringArray(r.certificaciones),
    educacion_formal: String(r.educacion_formal ?? ""),
    status: CANDIDATE_STATUSES.includes(r.status as CandidateStatus)
      ? (r.status as CandidateStatus)
      : "nuevo",
    cv_storage_path:
      typeof r.cv_storage_path === "string" && r.cv_storage_path.trim().length > 0
        ? r.cv_storage_path.trim()
        : null,
    cv_markdown: String(r.cv_markdown ?? ""),
    application_answers: parseApplicationAnswers(r.application_answers),
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
