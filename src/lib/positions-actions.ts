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
  dateFrom?: string,
  dateTo?: string,
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

    const pDateFrom = dateFrom?.trim()
      ? `${dateFrom.trim()}T00:00:00.000Z`
      : null;
    const pDateTo = dateTo?.trim()
      ? `${dateTo.trim()}T23:59:59.999Z`
      : null;

    const { data, error } = await supabase.rpc("match_candidates_for_position", {
      query_embedding: queryEmbedding,
      p_position_id: positionId,
      p_match_threshold: 0.4,
      p_match_count: 12,
      p_seniority: seniority?.trim() || null,
      p_date_from: pDateFrom,
      p_date_to: pDateTo,
    });

    if (error) return { ok: false, error: error.message };

    type RpcRow = {
      id: string;
      nombre: string;
      rol_principal: string;
      seniority_estimado: string;
      similarity: number;
    };

    const rows = (data ?? []) as RpcRow[];

    const results: CandidateSearchResult[] = rows.map((r) => ({
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

// ─── Refinar campo con IA ─────────────────────────────────────────────────────

export async function refinePositionField(
  field: "description" | "requirements",
  currentText: string,
  positionTitle: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const trimmed = currentText.trim();
  if (!trimmed) {
    return { ok: false, error: "Escribe algo antes de mejorar con IA." };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY no configurada." };

  const fieldLabel = field === "description" ? "descripción" : "requisitos";
  const systemPrompt = `Eres un experto en reclutamiento técnico. Mejora el texto de ${fieldLabel} de la oferta de trabajo que te proporciona el usuario para que sea óptimo como contexto de búsqueda semántica de candidatos. El texto se convertirá en un embedding que se comparará contra CVs y perfiles.
Reglas estrictas:
- Responde ÚNICAMENTE con el texto mejorado. Sin títulos, sin encabezados, sin explicaciones, sin frases como "Texto mejorado:" o "Plaza:".
- Usa terminología técnica precisa y específica.
- Menciona tecnologías, frameworks, lenguajes y años de experiencia cuando sea relevante.
- Elimina lenguaje corporativo vago o genérico.
- Mantén el idioma original del texto.
- No añadas información que no esté implícita en el texto original.`;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Título de la plaza: ${positionTitle}\n\nTexto actual:\n${trimmed}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    });

    const refined = response.choices[0]?.message?.content?.trim() ?? "";
    if (!refined) return { ok: false, error: "La IA no devolvió un resultado válido." };

    return { ok: true, text: refined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al conectar con la IA.",
    };
  }
}

// ─── Generar ranking IA de candidatos en pipeline ────────────────────────────

interface RankingEntry {
  candidate_id: string;
  ranking_score: number;
  ranking_phrase: string;
  ranking_analysis: string;
}

export async function generatePositionRanking(
  positionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!positionId) return { ok: false, error: "ID de plaza requerido." };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY no configurada." };

  try {
    const { supabase, organizationId } = await requireAuth();

    // Verificar que la plaza pertenece a la organización
    const { data: pos, error: posErr } = await supabase
      .from("positions")
      .select("id, title, description, requirements")
      .eq("id", positionId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (posErr || !pos) return { ok: false, error: "Plaza no encontrada." };

    // Obtener candidatos del pipeline con sus datos completos
    const { data: pcRows, error: pcErr } = await supabase
      .from("position_candidates")
      .select(`
        id, candidate_id,
        candidates(
          nombre, rol_principal, seniority_estimado,
          pais_residencia, resumen_ejecutivo,
          lenguajes, frameworks, patrones,
          anos_experiencia_total, sectores
        )
      `)
      .eq("position_id", positionId);

    if (pcErr) return { ok: false, error: pcErr.message };

    type PcRow = { id: string; candidate_id: string; candidates: unknown };
    const candidates = (pcRows ?? []) as PcRow[];

    if (candidates.length < 3) {
      return { ok: false, error: "Se necesitan al menos 3 candidatos para generar el ranking." };
    }

    function getCandidateRecord(raw: unknown): Record<string, unknown> {
      if (Array.isArray(raw)) return (raw[0] ?? {}) as Record<string, unknown>;
      if (raw && typeof raw === "object") return raw as Record<string, unknown>;
      return {};
    }

    // Construir descripción de cada candidato para el prompt
    const candidateDescriptions = candidates
      .map((pc, i) => {
        const c = getCandidateRecord(pc.candidates);
        return `Candidato ${i + 1} (ID: ${pc.candidate_id}):
- Nombre: ${c.nombre ?? "N/A"}
- Rol: ${c.rol_principal ?? "N/A"} — Seniority: ${c.seniority_estimado ?? "N/A"}
- Experiencia: ${c.anos_experiencia_total ?? 0} años
- Lenguajes: ${(Array.isArray(c.lenguajes) ? c.lenguajes : []).join(", ") || "N/A"}
- Frameworks: ${(Array.isArray(c.frameworks) ? c.frameworks : []).join(", ") || "N/A"}
- Patrones: ${(Array.isArray(c.patrones) ? c.patrones : []).join(", ") || "N/A"}
- Resumen: ${c.resumen_ejecutivo ?? "N/A"}`;
      })
      .join("\n\n");

    const systemPrompt = `Eres un experto en reclutamiento técnico. Tu tarea es analizar candidatos para una plaza y generar un ranking de recomendación.
Reglas estrictas:
- Responde ÚNICAMENTE con un JSON array válido. Sin texto adicional, sin markdown, sin explicaciones.
- El array debe contener un objeto por cada candidato con exactamente estas claves: candidate_id, ranking_score, ranking_phrase, ranking_analysis.
- ranking_score: número entero de posición (1 = mejor candidato, N = peor).
- ranking_phrase: frase de MÁXIMO 10 palabras que resuma por qué es buena opción para la plaza.
- ranking_analysis: párrafo corto de 2-3 oraciones con el razonamiento técnico detallado.
- Mantén el idioma del contenido de los candidatos.`;

    const userPrompt = `Plaza: ${pos.title}
Descripción: ${pos.description || "N/A"}
Requisitos: ${pos.requirements || "N/A"}

Candidatos a rankear:

${candidateDescriptions}`;

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) return { ok: false, error: "La IA no devolvió un resultado." };

    let parsed: unknown;
    try {
      const outer = JSON.parse(raw) as Record<string, unknown>;
      // El modelo puede devolver { ranking: [...] } o directamente [...]
      parsed = Array.isArray(outer) ? outer : (Object.values(outer)[0] ?? outer);
    } catch {
      return { ok: false, error: "La respuesta de la IA no es un JSON válido." };
    }

    if (!Array.isArray(parsed)) {
      return { ok: false, error: "La IA devolvió un formato inesperado." };
    }

    const entries = parsed as RankingEntry[];

    // Actualizar cada position_candidate con el ranking
    const now = new Date().toISOString();
    await Promise.all(
      entries.map((entry) => {
        const pc = candidates.find((c) => c.candidate_id === entry.candidate_id);
        if (!pc) return Promise.resolve();
        return supabase
          .from("position_candidates")
          .update({
            ranking_score: entry.ranking_score,
            ranking_phrase: entry.ranking_phrase,
            ranking_analysis: entry.ranking_analysis,
            ranking_generated_at: now,
          })
          .eq("id", pc.id);
      }),
    );

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al generar el ranking.",
    };
  }
}

// ─── Generar reporte Markdown del ranking ────────────────────────────────────

export async function generateRankingReport(
  positionId: string,
): Promise<{ ok: true; markdown: string; filename: string } | { ok: false; error: string }> {
  if (!positionId) return { ok: false, error: "ID de plaza requerido." };

  try {
    const { supabase, organizationId } = await requireAuth();

    const { data: pos, error: posErr } = await supabase
      .from("positions")
      .select("id, title, description, requirements, created_at")
      .eq("id", positionId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (posErr || !pos) return { ok: false, error: "Plaza no encontrada." };

    const { data: pcRows, error: pcErr } = await supabase
      .from("position_candidates")
      .select(`
        candidate_id, ranking_score, ranking_phrase, ranking_analysis, ranking_generated_at,
        candidates(
          nombre, pais_residencia, resumen_ejecutivo,
          lenguajes, frameworks, anos_experiencia_total
        )
      `)
      .eq("position_id", positionId)
      .not("ranking_score", "is", null)
      .order("ranking_score", { ascending: true });

    if (pcErr) return { ok: false, error: pcErr.message };

    type RankedRow = {
      candidate_id: string;
      ranking_score: number;
      ranking_phrase: string | null;
      ranking_analysis: string | null;
      ranking_generated_at: string | null;
      candidates: unknown;
    };
    const ranked = (pcRows ?? []) as RankedRow[];

    function getCandidateField(raw: unknown): Record<string, unknown> {
      if (Array.isArray(raw)) return (raw[0] ?? {}) as Record<string, unknown>;
      if (raw && typeof raw === "object") return raw as Record<string, unknown>;
      return {};
    }

    if (ranked.length === 0) {
      return { ok: false, error: "No hay ranking generado para esta plaza." };
    }

    const generatedAt = ranked[0].ranking_generated_at
      ? new Date(ranked[0].ranking_generated_at).toLocaleDateString("es-ES", {
          day: "2-digit", month: "long", year: "numeric",
        })
      : new Date().toLocaleDateString("es-ES");

    const lines: string[] = [
      `# Reporte de Ranking — ${pos.title}`,
      "",
      `**Generado:** ${generatedAt}`,
      "",
      "---",
      "",
      "## Candidatos evaluados",
      "",
      "> Los datos de contacto han sido omitidos intencionalmente.",
      "",
    ];

    for (const pc of ranked) {
      const c = getCandidateField(pc.candidates);
      const fullName = String(c.nombre ?? "").trim();
      const firstName = fullName.split(" ")[0] ?? "el candidato";
      const pais = String(c.pais_residencia ?? "N/A");
      const lenguajes = (Array.isArray(c.lenguajes) ? c.lenguajes : []).join(", ") || "N/A";
      const frameworks = (Array.isArray(c.frameworks) ? c.frameworks : []).join(", ") || "N/A";
      const anos = typeof c.anos_experiencia_total === "number" ? c.anos_experiencia_total : 0;

      // Reemplazar nombre completo por primer nombre en resumen y análisis
      function sanitize(text: string): string {
        if (!fullName) return text;
        return text.replaceAll(fullName, firstName);
      }

      const resumen = sanitize(String(c.resumen_ejecutivo ?? "N/A"));
      const analysis = sanitize(String(pc.ranking_analysis ?? ""));
      const phrase = sanitize(String(pc.ranking_phrase ?? ""));

      lines.push(`### Candidato #${pc.ranking_score} — ${firstName}`);
      lines.push("");
      lines.push(`| Campo | Valor |`);
      lines.push(`|---|---|`);
      lines.push(`| País | ${pais} |`);
      lines.push(`| Experiencia | ${anos} años |`);
      lines.push(`| Lenguajes | ${lenguajes} |`);
      lines.push(`| Frameworks | ${frameworks} |`);
      lines.push("");
      lines.push(`**Resumen profesional:**`);
      lines.push(resumen);
      lines.push("");
      lines.push(`**Análisis de ranking:**`);
      lines.push(`> ${phrase}`);
      lines.push("");
      lines.push(analysis);
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    const markdown = lines.join("\n");
    const safeTitle = pos.title.replace(/[^a-zA-Z0-9\-_\u00C0-\u024F]/g, "-").toLowerCase();
    const filename = `ranking-${safeTitle}.md`;

    return { ok: true, markdown, filename };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al generar el reporte.",
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
