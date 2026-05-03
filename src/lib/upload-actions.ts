"use server";

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { getTranslations } from "next-intl/server";
import { createClient as createSsrClient } from "@/src/utils/supabase/server";
import pLimit from "p-limit";
import {
  UPLOAD_CONCURRENCY_LIMIT,
  MAX_FILE_SIZE_BYTES,
} from "@/src/lib/upload-config";
import { runCvPipeline } from "@/src/lib/cv-processor";
import {
  ensureUserProfile,
  getCurrentOrganizationId,
} from "@/src/lib/user-profile";
import type {
  UploadCvResult,
  UploadAndEnqueueResult,
  StartProcessingResult,
  CvProcessingItem,
  EnqueueResult,
} from "@/src/types/upload";

function uploadLog(message: string, meta?: Record<string, unknown>): void {
  if (meta && Object.keys(meta).length > 0) {
    console.log(`[upload-actions] ${message}`, meta);
  } else {
    console.log(`[upload-actions] ${message}`);
  }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables de entorno de Supabase faltantes");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOrganizationId(): Promise<string> {
  const t0 = performance.now();

  const supabase = await createSsrClient();
  const t1 = performance.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  uploadLog("auth.getUser", { ms: Math.round(performance.now() - t1) });

  if (!user) throw new Error("No autorizado");

  const t2 = performance.now();
  await ensureUserProfile();
  uploadLog("ensureUserProfile", { ms: Math.round(performance.now() - t2) });

  const t3 = performance.now();
  const organizationId = await getCurrentOrganizationId();
  uploadLog("getCurrentOrganizationId", { ms: Math.round(performance.now() - t3) });

  if (!organizationId) throw new Error("No autorizado");
  uploadLog("requireOrganizationId total", { ms: Math.round(performance.now() - t0) });
  return organizationId;
}

export async function uploadCvFile(
  formData: FormData,
): Promise<UploadCvResult> {
  const te = await getTranslations("errors");

  let organizationId: string;
  try {
    organizationId = await requireOrganizationId();
  } catch {
    return { ok: false, error: te("unauthorized") };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: te("invalidFile") };
  if (file.type !== "application/pdf")
    return { ok: false, error: te("pdfOnly") };
  if (file.size > MAX_FILE_SIZE_BYTES)
    return { ok: false, error: te("fileTooLarge") };

  const bytes = await file.arrayBuffer();
  const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { error } = await getServiceClient()
    .storage.from("resumes")
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storagePath, sha256 };
}

/**
 * Sube un archivo a Storage y lo encola para procesamiento, en una sola
 * Server Action. Evita el doble ciclo de autenticación que ocurre al llamar
 * `uploadCvFile` y `enqueueFiles` por separado.
 */
export async function uploadAndEnqueueFile(
  formData: FormData,
): Promise<UploadAndEnqueueResult> {
  const te = await getTranslations("errors");

  let organizationId: string;
  try {
    organizationId = await requireOrganizationId();
  } catch {
    return { ok: false, error: te("unauthorized") };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: te("invalidFile") };
  if (file.type !== "application/pdf")
    return { ok: false, error: te("pdfOnly") };
  if (file.size > MAX_FILE_SIZE_BYTES)
    return { ok: false, error: te("fileTooLarge") };

  const tFile = performance.now();
  const bytes = await file.arrayBuffer();
  const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  uploadLog("sha256 calculado", { fileName: file.name, sizeKB: Math.round(file.size / 1024), ms: Math.round(performance.now() - tFile) });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const supabase = getServiceClient();

  const tStorage = performance.now();
  const { error: storageError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });
  uploadLog("storage.upload", { fileName: file.name, ms: Math.round(performance.now() - tStorage) });

  if (storageError) return { ok: false, error: storageError.message };

  const tQueue = performance.now();
  const { data: queueItem, error: queueError } = await supabase
    .from("cv_processing_queue")
    .insert({
      organization_id: organizationId,
      storage_path: storagePath,
      file_name: file.name,
      cv_sha256: sha256,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();
  uploadLog("queue.insert", { fileName: file.name, ms: Math.round(performance.now() - tQueue) });

  if (queueError ?? !queueItem) {
    return { ok: false, error: queueError?.message ?? "Error al encolar el archivo" };
  }

  return { ok: true, queueId: queueItem.id };
}

/** Encola archivos ya subidos a Storage para procesamiento asíncrono con IA. */
export async function enqueueFiles(
  items: ReadonlyArray<{ storagePath: string; fileName: string; sha256: string }>,
): Promise<EnqueueResult> {
  let organizationId: string;
  try {
    organizationId = await requireOrganizationId();
  } catch {
    return items.map((item) => ({
      storagePath: item.storagePath,
      fileName: item.fileName,
      status: "error" as const,
      error: "No autorizado",
    }));
  }

  const supabase = getServiceClient();
  const results: EnqueueResult = [];

  for (const item of items) {
    // Insertar en la cola de procesamiento
    const { data: queueItem, error } = await supabase
      .from("cv_processing_queue")
      .insert({
        organization_id: organizationId,
        storage_path: item.storagePath,
        file_name: item.fileName,
        cv_sha256: item.sha256,
        status: "pending",
      })
      .select("id")
      .single<{ id: string }>();

    if (error ?? !queueItem) {
      results.push({
        storagePath: item.storagePath,
        fileName: item.fileName,
        status: "error",
        error: error?.message ?? "Error al encolar el archivo",
      });
    } else {
      results.push({
        storagePath: item.storagePath,
        fileName: item.fileName,
        status: "enqueued",
        queueId: queueItem.id,
      });
    }
  }

  return results;
}

/** @deprecated Usar enqueueFiles + useQueueProcessor para no bloquear la UI. */
export async function startCvProcessing(
  items: CvProcessingItem[],
): Promise<StartProcessingResult> {
  const te = await getTranslations("errors");

  let organizationId: string;
  try {
    organizationId = await requireOrganizationId();
  } catch {
    return { ok: false, error: te("unauthorized") };
  }

  if (!items.length) return { ok: false, error: te("nothingToProcess") };

  const limit = pLimit(UPLOAD_CONCURRENCY_LIMIT);
  const results = await Promise.all(
    items.map((item) =>
      limit(() => runCvPipeline({ ...item, organizationId })),
    ),
  );

  return { ok: true, results };
}
