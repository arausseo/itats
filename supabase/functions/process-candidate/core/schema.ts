import { z } from "zod";

/** Normaliza a texto para la columna `candidates.red_flags` (string o array legacy). */
export const redFlagsField = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => {
    if (typeof v === "string") return v.trim();
    return v.length ? v.join("\n") : "";
  });

/**
 * Contrato del body POST.
 *
 * Cuando la IA determina que el archivo no es un CV debe devolver
 * `{ "es_cv": false }` (sin necesidad de poblar el resto del payload).
 * En ese caso el Edge NO inserta candidato; responde 200 con `not_cv: true`
 * y el pipeline marca el item de la cola como `not_cv`.
 *
 * Cuando `es_cv` es true u omitido, se asume que la IA pudo extraer el perfil
 * y se valida el shape completo.
 */
export const candidatePayloadSchema = z.object({
  organization_id: z.string().uuid(),
  /** Bandera explícita de la IA. Si false ⇒ no se crea candidato. */
  es_cv: z.boolean().optional(),
  datos_personales: z
    .object({
      nombre: z.string(),
      pais_residencia: z.string(),
      email: z.string(),
      telefono: z.string(),
    })
    .optional(),
  perfil_tecnico: z
    .object({
      rol_principal: z.string(),
      lenguajes: z.array(z.string()),
      frameworks_y_herramientas: z.array(z.string()),
      patrones_y_arquitectura: z.array(z.string()),
    })
    .optional(),
  evaluacion: z
    .object({
      anos_experiencia_total: z.number().int(),
      sectores: z.array(z.string()),
      seniority_estimado: z.string(),
      resumen_ejecutivo: z.string(),
      red_flags: redFlagsField,
    })
    .optional(),
  educacion_y_certificaciones: z
    .object({
      educacion_formal: z.string(),
      certificaciones: z.array(z.string()).default([]),
    })
    .optional(),
  cv_storage_path: z.string().optional(),
  cv_markdown: z.string().optional(),
  cv_sha256: z.string().optional(),
  embedding: z.array(z.number()).length(1536).optional(),
  /** Si viene, el candidato se enlaza a la plaza (status 'Sourced') tras insertarse. */
  position_id: z.string().uuid().optional(),
  /** Respuestas del candidato al formulario de la plaza (metadata del candidato). */
  application_answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        position_id: z.string().uuid(),
        question_text: z.string(),
        question_type: z.enum(["boolean", "numeric", "text"]),
        answer: z.union([z.string(), z.number(), z.boolean(), z.null()]),
        answered_at: z.string(),
      }),
    )
    .optional(),
});

export type CandidatePayload = z.infer<typeof candidatePayloadSchema>;
export type ApplicationAnswer = NonNullable<
  CandidatePayload["application_answers"]
>[number];
