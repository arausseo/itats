import { z } from "zod";

/** Normaliza a texto para la columna `candidates.red_flags` (string o array legacy). */
export const redFlagsField = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => {
    if (typeof v === "string") return v.trim();
    return v.length ? v.join("\n") : "";
  });

/** Contrato exacto del body POST (validación estricta con Zod). */
export const candidatePayloadSchema = z.object({
  datos_personales: z.object({
    nombre: z.string(),
    pais_residencia: z.string(),
    email: z.string(),
    telefono: z.string(),
  }),
  perfil_tecnico: z.object({
    rol_principal: z.string(),
    lenguajes: z.array(z.string()),
    frameworks_y_herramientas: z.array(z.string()),
    patrones_y_arquitectura: z.array(z.string()),
  }),
  evaluacion: z.object({
    anos_experiencia_total: z.number().int(),
    sectores: z.array(z.string()),
    seniority_estimado: z.string(),
    resumen_ejecutivo: z.string(),
    red_flags: redFlagsField,
  }),
  educacion_y_certificaciones: z.object({
    educacion_formal: z.string(),
    certificaciones: z.array(z.string()).default([]),
  }),
  cv_storage_path: z.string().optional(),
  embedding: z.array(z.number()).length(1536).optional(),
});

export type CandidatePayload = z.infer<typeof candidatePayloadSchema>;
