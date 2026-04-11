import { z } from "zod";

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
    red_flags: z.array(z.string()),
  }),
});

export type CandidatePayload = z.infer<typeof candidatePayloadSchema>;
