import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runCvPipeline } from "@/src/lib/cv-processor";
import type { ApplicationAnswer, QueueItem } from "@/src/types/upload";
import { log } from "./log";

// ---------------------------------------------------------------------------
// Cliente Supabase con service role
// ---------------------------------------------------------------------------

let cachedClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos");
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

// ---------------------------------------------------------------------------
// claimNext: invoca la RPC global y devuelve el item reclamado (o null)
// ---------------------------------------------------------------------------

export async function claimNext(
  lockedBy: string,
  lockTimeoutMinutes: number,
): Promise<QueueItem | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("claim_next_cv_queue_item_any_org", {
    p_locked_by: lockedBy,
    p_lock_timeout_minutes: lockTimeoutMinutes,
  });
  if (error) {
    throw new Error(`claim_next_cv_queue_item_any_org: ${error.message}`);
  }
  const items = (data ?? []) as QueueItem[];
  return items[0] ?? null;
}

// ---------------------------------------------------------------------------
// processItem: ejecuta la pipeline y actualiza la fila de la cola
// ---------------------------------------------------------------------------

type FinalStatus = "completed" | "duplicate" | "not_cv" | "error";

export async function processItem(item: QueueItem): Promise<FinalStatus> {
  const t0 = Date.now();
  log.info("claimed", {
    queueId: item.id,
    organizationId: item.organization_id,
    fileName: item.file_name,
  });

  let status: FinalStatus;
  let resultMessage: string | null = null;

  try {
    const result = await runCvPipeline({
      storagePath: item.storage_path,
      fileName: item.file_name,
      organizationId: item.organization_id,
      positionId: item.position_id ?? null,
      applicationAnswers: Array.isArray(item.application_answers)
        ? (item.application_answers as ApplicationAnswer[])
        : [],
    });

    if (result.status === "completado") {
      status = "completed";
    } else if (result.status === "duplicado") {
      status = "duplicate";
      resultMessage = result.message;
    } else if (result.status === "no_cv") {
      status = "not_cv";
      resultMessage = result.message;
    } else {
      status = "error";
      resultMessage = result.error;
    }
  } catch (err) {
    status = "error";
    resultMessage =
      err instanceof Error ? err.message : "Error inesperado al procesar el CV";
    log.error("pipeline_exception", {
      queueId: item.id,
      error: resultMessage,
    });
  }

  const supabase = getServiceClient();
  const { error: updateError } = await supabase
    .from("cv_processing_queue")
    .update({
      status,
      result_message: resultMessage,
      processed_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null,
    })
    .eq("id", item.id);

  if (updateError) {
    log.error("queue_update_failed", {
      queueId: item.id,
      status,
      error: updateError.message,
    });
  }

  log.info("processed", {
    queueId: item.id,
    organizationId: item.organization_id,
    status,
    durationMs: Date.now() - t0,
  });

  return status;
}
