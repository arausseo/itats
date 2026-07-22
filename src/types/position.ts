export type PositionStatus = "Open" | "Closed";

export const PIPELINE_STATUSES = [
  "Sourced",
  "To Contact",
  "Screening",
  "Tech Assessment",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export interface Position {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  requirements: string;
  status: PositionStatus;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface PositionCandidate {
  id: string;
  position_id: string;
  candidate_id: string;
  pipeline_status: PipelineStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  ranking_score: number | null;
  ranking_phrase: string | null;
  ranking_analysis: string | null;
  ranking_generated_at: string | null;
}

export interface PositionCandidateWithCandidate extends PositionCandidate {
  candidate: {
    nombre: string;
    rol_principal: string;
    seniority_estimado: string;
    email: string;
    pais_residencia: string;
    resumen_ejecutivo: string;
    lenguajes: string[];
    frameworks: string[];
    patrones: string[];
    anos_experiencia_total: number;
  };
}

export interface CandidateSearchResult {
  id: string;
  nombre: string;
  rol_principal: string;
  seniority_estimado: string;
  similarity: number;
}

export interface PositionWithCount extends Position {
  candidate_count: number;
  /** Solicitudes recibidas por la página pública (cv_processing_queue). */
  application_count: number;
}

// ─── Parsers ────────────────────────────────────────────────────────────────

export function parsePositionRow(row: unknown): Position {
  if (!row || typeof row !== "object") throw new Error("Invalid position row");
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    organization_id: String(r.organization_id ?? ""),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    requirements: String(r.requirements ?? ""),
    status: r.status === "Closed" ? "Closed" : "Open",
    views: Number(r.views ?? 0),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v) return [v];
  return [];
}

export function parsePositionCandidateWithCandidate(
  row: unknown,
): PositionCandidateWithCandidate {
  if (!row || typeof row !== "object")
    throw new Error("Invalid position_candidate row");
  const r = row as Record<string, unknown>;
  const c = (r.candidates ?? r.candidate ?? {}) as Record<string, unknown>;
  const ps = String(r.pipeline_status ?? "Sourced");
  return {
    id: String(r.id ?? ""),
    position_id: String(r.position_id ?? ""),
    candidate_id: String(r.candidate_id ?? ""),
    pipeline_status: PIPELINE_STATUSES.includes(ps as PipelineStatus)
      ? (ps as PipelineStatus)
      : "Sourced",
    notes: String(r.notes ?? ""),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    ranking_score: typeof r.ranking_score === "number" ? r.ranking_score : null,
    ranking_phrase: typeof r.ranking_phrase === "string" ? r.ranking_phrase : null,
    ranking_analysis: typeof r.ranking_analysis === "string" ? r.ranking_analysis : null,
    ranking_generated_at: typeof r.ranking_generated_at === "string" ? r.ranking_generated_at : null,
    candidate: {
      nombre: String(c.nombre ?? ""),
      rol_principal: String(c.rol_principal ?? ""),
      seniority_estimado: String(c.seniority_estimado ?? ""),
      email: String(c.email ?? ""),
      pais_residencia: String(c.pais_residencia ?? ""),
      resumen_ejecutivo: String(c.resumen_ejecutivo ?? ""),
      lenguajes: toStringArray(c.lenguajes),
      frameworks: toStringArray(c.frameworks),
      patrones: toStringArray(c.patrones),
      anos_experiencia_total: typeof c.anos_experiencia_total === "number"
        ? c.anos_experiencia_total
        : Number(c.anos_experiencia_total ?? 0),
    },
  };
}
