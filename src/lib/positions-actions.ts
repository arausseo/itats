"use server";

import OpenAI from "openai";
import { createClient } from "@/src/utils/supabase/server";
import { getCurrentOrganizationId } from "@/src/lib/user-profile";
import {
  PIPELINE_STATUSES,
  type PipelineStatus,
  type CandidateSearchResult,
  type Position,
  parsePositionRow,
} from "@/src/types/position";
import { type Candidate, parseCandidateRow } from "@/src/types/candidate";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireAuth(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; organizationId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) throw new Error("No autorizado");
  return { supabase, organizationId };
}

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Crear plaza ──────────────────────────────────────────────────────────────

export async function createPosition(
  formData: FormData,
): Promise<ActionResult<Position>> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();

  if (!title) return { ok: false, error: "El título es obligatorio." };

  try {
    const { supabase, organizationId } = await requireAuth();
    const { data, error } = await supabase
      .from("positions")
      .insert({ organization_id: organizationId, title, description, requirements })
      .select()
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? "Error al crear la plaza." };
    return { ok: true, data: parsePositionRow(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ─── Editar plaza ─────────────────────────────────────────────────────────────

export async function updatePosition(
  id: string,
  formData: FormData,
): Promise<ActionResult<Position>> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();

  if (!id) return { ok: false, error: "ID de plaza requerido." };
  if (!title) return { ok: false, error: "El título es obligatorio." };

  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("positions")
      .update({ title, description, requirements, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? "Error al actualizar la plaza." };
    return { ok: true, data: parsePositionRow(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ─── Cerrar plaza ─────────────────────────────────────────────────────────────

export async function closePosition(
  id: string,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "ID de plaza requerido." };
  try {
    const { supabase } = await requireAuth();
    const { error } = await supabase
      .from("positions")
      .update({ status: "Closed", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ─── Reabrir plaza ────────────────────────────────────────────────────────────

export async function reopenPosition(
  id: string,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "ID de plaza requerido." };
  try {
    const { supabase } = await requireAuth();
    const { error } = await supabase
      .from("positions")
      .update({ status: "Open", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ─── Agregar candidato al pipeline ────────────────────────────────────────────

export async function addCandidateToPosition(
  positionId: string,
  candidateId: string,
): Promise<ActionResult> {
  if (!positionId || !candidateId)
    return { ok: false, error: "IDs de plaza y candidato requeridos." };
  try {
    const { supabase } = await requireAuth();
    const { error } = await supabase
      .from("position_candidates")
      .insert({ position_id: positionId, candidate_id: candidateId, pipeline_status: "Sourced" });

    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "El candidato ya está en esta plaza." };
      return { ok: false, error: error.message };
    }
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ─── Actualizar estado en el pipeline ────────────────────────────────────────

export async function updatePipelineStatus(
  positionCandidateId: string,
  status: PipelineStatus,
): Promise<ActionResult> {
  if (!positionCandidateId) return { ok: false, error: "ID requerido." };
  if (!PIPELINE_STATUSES.includes(status)) return { ok: false, error: "Estado inválido." };
  try {
    const { supabase } = await requireAuth();
    const { error } = await supabase
      .from("position_candidates")
      .update({ pipeline_status: status, updated_at: new Date().toISOString() })
      .eq("id", positionCandidateId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
  }
}

// ─── Valores únicos de seniority ─────────────────────────────────────────────

export async function getSeniorityOptions(): Promise<string[]> {
  try {
    const { supabase } = await requireAuth();
    const { data } = await supabase
      .from("candidates")
      .select("seniority_estimado")
      .not("seniority_estimado", "is", null)
      .neq("seniority_estimado", "");

    if (!data) return [];

    const unique = Array.from(
      new Set(data.map((r) => (r.seniority_estimado as string).trim()).filter(Boolean)),
    ).sort();

    return unique;
  } catch {
    return [];
  }
}

// ─── Búsqueda semántica ───────────────────────────────────────────────────────

export async function searchCandidatesForPosition(
  query: string,
  positionId: string,
  seniority?: string,
): Promise<{ ok: true; results: CandidateSearchResult[] } | { ok: false; error: string }> {
  const q = query.trim();
  if (!positionId) return { ok: false, error: "ID de plaza requerido." };

  try {
    const { supabase } = await requireAuth();

    const { data: pos, error: posError } = await supabase
      .from("positions")
      .select("title, description, requirements")
      .eq("id", positionId)
      .single();
    if (posError || !pos) return { ok: false, error: "No se pudo leer la plaza." };

    const positionContext = [pos.title, pos.description, pos.requirements]
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!positionContext) return { ok: false, error: "La plaza no tiene datos suficientes para buscar." };

    // Siempre usa el contexto de la plaza; si hay query la añade para enfocar el embedding
    const input = q ? `${positionContext}\n${q}` : positionContext;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY no configurada.");

    const openai = new OpenAI({ apiKey });
    const embResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });
    const queryEmbedding = embResponse.data[0].embedding;

    const { data, error } = await supabase.rpc("match_candidates_for_position", {
      query_embedding: queryEmbedding,
      p_position_id: positionId,
      p_match_threshold: 0.4,
      p_match_count: 12,
      p_seniority: seniority?.trim() || null,
    });

    if (error) return { ok: false, error: error.message };

    const results: CandidateSearchResult[] = (
      (data ?? []) as Array<{
        id: string;
        nombre: string;
        rol_principal: string;
        seniority_estimado: string;
        similarity: number;
      }>
    ).map((r) => ({
      id: r.id,
      nombre: r.nombre,
      rol_principal: r.rol_principal,
      seniority_estimado: r.seniority_estimado,
      similarity: r.similarity,
    }));

    return { ok: true, results };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error en la búsqueda semántica.",
    };
  }
}

// ─── Obtener candidato por ID ─────────────────────────────────────────────────

export async function getCandidateById(
  candidateId: string,
): Promise<{ ok: true; candidate: Candidate } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Candidato no encontrado." };
    }

    return { ok: true, candidate: parseCandidateRow(data) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al obtener candidato.",
    };
  }
}
