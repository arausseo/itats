"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSsrClient } from "@/src/utils/supabase/server";
import { runCvPipeline } from "@/src/lib/cv-processor";
import type {
  QueueItem,
  QueueHistoryPage,
  QueueStatus,
  SetQueueProcessingResult,
} from "@/src/types/upload";

// ---------------------------------------------------------------------------
// Cliente de servicio (service_role) — singleton por proceso Node
// ---------------------------------------------------------------------------

let serviceClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables de entorno de Supabase faltantes");

  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

async function getOrganizationId(): Promise<string | null> {
  try {
    const supabase = await createSsrClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle<{ organization_id: string }>();

    return data?.organization_id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// claimAndProcessNextQueueItem
// ---------------------------------------------------------------------------

type ClaimResult =
  | { processed: true; queueId: string; status: string }
  | { processed: false };

/**
 * Reclamar y procesar atómicamente el siguiente item pendiente de la cola.
 * Solo un procesador por organización puede estar activo a la vez (RPC garantiza esto).
 *
 * @param lockedBy Identificador único del tab/sesión del procesador ('userId:tabId').
 */
export async function claimAndProcessNextQueueItem(
  lockedBy: string,
): Promise<ClaimResult> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { processed: false };

  const supabase = getServiceClient();

  // Reclamar atómicamente el siguiente item pendiente vía RPC (SECURITY DEFINER)
  const { data, error } = await supabase.rpc("claim_next_cv_queue_item", {
    p_organization_id: organizationId,
    p_locked_by: lockedBy,
    p_lock_timeout_minutes: 10,
  });

  if (error) {
    console.error("[queue-actions] Error al reclamar item:", error.message);
    return { processed: false };
  }

  const items = data as QueueItem[] | null;
  if (!items || items.length === 0) return { processed: false };

  const item = items[0];
  if (!item) return { processed: false };

  // Ejecutar el pipeline de IA con el pre-check ya implementado
  let queueStatus: "completed" | "duplicate" | "not_cv" | "error";
  let resultMessage: string | null = null;

  try {
    const result = await runCvPipeline({
      storagePath: item.storage_path,
      fileName: item.file_name,
      organizationId,
      positionId: item.position_id ?? null,
      applicationAnswers: Array.isArray(item.application_answers)
        ? item.application_answers
        : [],
    });

    if (result.status === "completado") {
      queueStatus = "completed";
    } else if (result.status === "duplicado") {
      queueStatus = "duplicate";
      resultMessage = result.message;
    } else if (result.status === "no_cv") {
      queueStatus = "not_cv";
      resultMessage = result.message;
    } else {
      queueStatus = "error";
      resultMessage = result.error;
    }
  } catch (err) {
    queueStatus = "error";
    resultMessage = err instanceof Error ? err.message : "Error inesperado al procesar el CV";
    console.error("[queue-actions] Error procesando item:", item.id, err);
  }

  // Actualizar el estado del item en la cola
  await supabase
    .from("cv_processing_queue")
    .update({
      status: queueStatus,
      result_message: resultMessage,
      processed_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null,
    })
    .eq("id", item.id);

  // Al vaciarse la cola, refrescar la cache de facetas (una vez por tanda,
  // no por item). refresh_candidate_facets requiere service_role.
  const { count: pendingLeft } = await supabase
    .from("cv_processing_queue")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  if ((pendingLeft ?? 0) === 0) {
    const { error: refreshErr } = await supabase.rpc("refresh_candidate_facets");
    if (refreshErr) {
      console.error("[queue-actions] refresh_candidate_facets:", refreshErr.message);
    }
  }

  return { processed: true, queueId: item.id, status: queueStatus };
}

// ---------------------------------------------------------------------------
// getRecentQueueItems
// ---------------------------------------------------------------------------

/** Retorna una página de items de la cola ordenados por fecha descendente. */
export async function getRecentQueueItems(
  page: number = 1,
  pageSize: number = 20,
): Promise<QueueHistoryPage> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { items: [], total: 0 };

  const supabase = getServiceClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("cv_processing_queue")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[queue-actions] Error al obtener historial:", error.message);
    return { items: [], total: 0 };
  }

  return {
    items: (data ?? []) as QueueItem[],
    total: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// getQueueStatus
// ---------------------------------------------------------------------------

type QueueStatusRpcRow = {
  pending: number;
  processing: number;
  processing_enabled: boolean;
};

/** Retorna el conteo de items pendientes y en procesamiento para el badge global. */
export async function getQueueStatus(): Promise<QueueStatus> {
  const organizationId = await getOrganizationId();
  if (!organizationId) {
    return { pending: 0, processing: 0, total: 0, processingEnabled: true };
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("get_cv_queue_status", {
    p_organization_id: organizationId,
  });

  if (error) {
    console.error("[queue-actions] Error al obtener estado de cola:", error.message);
    return { pending: 0, processing: 0, total: 0, processingEnabled: true };
  }

  const row = ((data ?? []) as QueueStatusRpcRow[])[0];
  if (!row) {
    return { pending: 0, processing: 0, total: 0, processingEnabled: true };
  }

  const pending = Number(row.pending) || 0;
  const processing = Number(row.processing) || 0;
  return {
    pending,
    processing,
    total: pending + processing,
    processingEnabled: row.processing_enabled ?? true,
  };
}

/** Activa o detiene el procesamiento global de la cola para la organización. */
export async function setQueueProcessingEnabled(
  enabled: boolean,
): Promise<SetQueueProcessingResult> {
  const organizationId = await getOrganizationId();
  if (!organizationId) {
    return { ok: false, error: "No autorizado" };
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from("cv_queue_settings").upsert(
    {
      organization_id: organizationId,
      processing_enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) {
    console.error(
      "[queue-actions] Error al actualizar configuración de cola:",
      error.message,
    );
    return { ok: false, error: error.message };
  }

  return { ok: true, processingEnabled: enabled };
}
