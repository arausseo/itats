"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createSsrClient } from "@/src/utils/supabase/server";
import pLimit from "p-limit";
import {
  PROCESS_CONCURRENCY_LIMIT,
  MAX_FILE_SIZE_BYTES,
} from "@/src/lib/upload-config";
import { runCvPipeline } from "@/src/lib/cv-processor";
import type {
  UploadCvResult,
  StartProcessingResult,
  CvProcessingItem,
} from "@/src/types/upload";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables de entorno de Supabase faltantes");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertAuthenticated(): Promise<void> {
  const supabase = await createSsrClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
}

export async function uploadCvFile(
  formData: FormData,
): Promise<UploadCvResult> {
  try {
    await assertAuthenticated();
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Archivo inválido" };
  if (file.type !== "application/pdf")
    return { ok: false, error: "Solo se aceptan archivos PDF" };
  if (file.size > MAX_FILE_SIZE_BYTES)
    return { ok: false, error: "El archivo supera el tamaño máximo de 20 MB" };

  const bytes = await file.arrayBuffer();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { error } = await getServiceClient()
    .storage.from("resumes")
    .upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storagePath };
}

export async function startCvProcessing(
  items: CvProcessingItem[],
): Promise<StartProcessingResult> {
  try {
    await assertAuthenticated();
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  if (!items.length) return { ok: false, error: "Sin archivos para procesar" };

  const limit = pLimit(PROCESS_CONCURRENCY_LIMIT);
  const results = await Promise.all(
    items.map((item) => limit(() => runCvPipeline(item))),
  );

  return { ok: true, results };
}
