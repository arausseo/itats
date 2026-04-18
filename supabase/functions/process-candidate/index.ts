import { candidatePayloadSchema } from "./core/schema.ts";
import type { CandidatePayload } from "./core/schema.ts";
import { createSupabaseServiceClient } from "./infrastructure/supabase.ts";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mapPayloadToRow = (payload: CandidatePayload) => {
  const {
    datos_personales,
    perfil_tecnico,
    evaluacion,
    educacion_y_certificaciones,
    cv_storage_path,
    embedding,
  } = payload;
  return {
    nombre: datos_personales.nombre,
    email: normalizeEmail(datos_personales.email),
    pais_residencia: datos_personales.pais_residencia,
    telefono: datos_personales.telefono,
    rol_principal: perfil_tecnico.rol_principal,
    lenguajes: perfil_tecnico.lenguajes,
    frameworks: perfil_tecnico.frameworks_y_herramientas,
    patrones: perfil_tecnico.patrones_y_arquitectura,
    educacion_formal: educacion_y_certificaciones.educacion_formal.trim(),
    certificaciones: educacion_y_certificaciones.certificaciones,
    anos_experiencia_total: evaluacion.anos_experiencia_total,
    sectores: evaluacion.sectores,
    seniority_estimado: evaluacion.seniority_estimado,
    resumen_ejecutivo: evaluacion.resumen_ejecutivo,
    red_flags: evaluacion.red_flags,
    raw_analysis: payload,
    ...(cv_storage_path !== undefined ? { cv_storage_path } : {}),
    ...(embedding !== undefined ? { embedding } : {}),
  };
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse(
      { ok: false, error: "Method not allowed. Use POST." },
      400,
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const parsed = candidatePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: "Validation failed",
        issues: parsed.error.issues,
      },
      400,
    );
  }

  const supabaseResult = createSupabaseServiceClient();
  if (!supabaseResult.ok) {
    return jsonResponse({ ok: false, error: supabaseResult.error }, 500);
  }

  const row = mapPayloadToRow(parsed.data);

  try {
    const { data, error } = await supabaseResult.client
      .from("candidates")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return jsonResponse(
          {
            ok: false,
            error: "Ya existe un candidato con este email.",
          },
          409,
        );
      }
      return jsonResponse(
        { ok: false, error: error.message ?? "Database error" },
        500,
      );
    }

    return jsonResponse({ ok: true, id: data.id }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
