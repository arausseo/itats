"use server";

import { createClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { createClient as createSsrClient } from "@/src/utils/supabase/server";
import pLimit from "p-limit";
import {
  PROCESS_CONCURRENCY_LIMIT,
  MAX_FILE_SIZE_BYTES,
} from "@/src/lib/upload-config";
import { runCvPipeline } from "@/src/lib/cv-processor";
import {
  ensureUserProfile,
  getCurrentOrganizationId,
} from "@/src/lib/user-profile";
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

async function requireOrganizationId(): Promise<string> {
  const supabase = await createSsrClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  await ensureUserProfile();
  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) throw new Error("No autorizado");
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
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

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
  const te = await getTranslations("errors");

  let organizationId: string;
  try {
    organizationId = await requireOrganizationId();
  } catch {
    return { ok: false, error: te("unauthorized") };
  }

  if (!items.length) return { ok: false, error: te("nothingToProcess") };

  const limit = pLimit(PROCESS_CONCURRENCY_LIMIT);
  const results = await Promise.all(
    items.map((item) =>
      limit(() => runCvPipeline({ ...item, organizationId })),
    ),
  );

  return { ok: true, results };
}
