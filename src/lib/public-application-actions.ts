"use server";

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { getPublicApplicationContext } from "@/src/lib/public-application";
import { MAX_FILE_SIZE_BYTES } from "@/src/lib/upload-config";
import type { ApplicationAnswer } from "@/src/types/upload";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables de entorno de Supabase faltantes");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SubmitApplicationResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Recibe la postulación pública: valida, sube el PDF a Storage y encola el item
 * con `position_id` + `application_answers` para que el pipeline lo procese
 * normalmente y enlace al candidato a la plaza.
 *
 * No requiere autenticación. Usa service_role para bypass de RLS.
 */
export async function submitPublicApplication(
  orgSlug: string,
  positionId: string,
  formData: FormData,
): Promise<SubmitApplicationResult> {
  const context = await getPublicApplicationContext(orgSlug, positionId);
  if (!context) {
    return { ok: false, error: "La plaza no está disponible para postulaciones." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Debes adjuntar tu CV en PDF." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Sólo se aceptan archivos PDF." };
  }
  if (file.size === 0) {
    return { ok: false, error: "El archivo está vacío." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "El archivo excede el tamaño máximo permitido." };
  }

  // ── Recoger y validar respuestas ──────────────────────────────────────────
  const fieldErrors: Record<string, string> = {};
  const answers: ApplicationAnswer[] = [];
  const answeredAt = new Date().toISOString();

  for (const question of context.questions) {
    const raw = formData.get(`q:${question.id}`);
    const provided = typeof raw === "string" ? raw.trim() : "";

    if (!provided) {
      if (question.required) {
        fieldErrors[question.id] = "Esta pregunta es obligatoria.";
      }
      continue;
    }

    let parsedAnswer: ApplicationAnswer["answer"];
    switch (question.question_type) {
      case "boolean": {
        if (provided !== "true" && provided !== "false") {
          fieldErrors[question.id] = "Selecciona Sí o No.";
          continue;
        }
        parsedAnswer = provided === "true";
        break;
      }
      case "numeric": {
        const n = Number(provided.replace(",", "."));
        if (!Number.isFinite(n)) {
          fieldErrors[question.id] = "Ingresa un valor numérico válido.";
          continue;
        }
        parsedAnswer = n;
        break;
      }
      case "text": {
        parsedAnswer = provided;
        break;
      }
    }

    answers.push({
      question_id: question.id,
      position_id: context.position.id,
      question_text: question.question_text,
      question_type: question.question_type,
      answer: parsedAnswer,
      answered_at: answeredAt,
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Revisa las respuestas marcadas en rojo.",
      fieldErrors,
    };
  }

  // ── Subir PDF a Storage ───────────────────────────────────────────────────
  const bytes = await file.arrayBuffer();
  const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${context.organization.id}/applications/${context.position.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const supabase = getServiceClient();

  const { error: storageError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });

  if (storageError) {
    return { ok: false, error: storageError.message };
  }

  // ── Encolar para procesamiento asíncrono ──────────────────────────────────
  const { error: queueError } = await supabase
    .from("cv_processing_queue")
    .insert({
      organization_id: context.organization.id,
      storage_path: storagePath,
      file_name: file.name,
      cv_sha256: sha256,
      status: "pending",
      position_id: context.position.id,
      application_answers: answers,
      source: "public_application",
    });

  if (queueError) {
    return { ok: false, error: queueError.message };
  }

  return { ok: true };
}
