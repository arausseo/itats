export type FileUploadStatus =
  | "pendiente"
  | "subiendo"
  | "en_cola"
  | "procesando"
  | "completado"
  | "duplicado"
  | "error";

export interface FileUploadEntry {
  key: string;
  fileName: string;
  fileSizeBytes: number;
  status: FileUploadStatus;
  storagePath: string | null;
  errorMessage: string | null;
}

export type UploadCvResult =
  | { ok: true; storagePath: string; sha256: string }
  | { ok: false; error: string };

export interface CvProcessingItem {
  fileName: string;
  storagePath: string;
}

/** Resultado de `runCvPipeline` por archivo (para sincronizar la UI). */
export type CvProcessingOutcome =
  | { storagePath: string; status: "completado" }
  | { storagePath: string; status: "duplicado"; message: string }
  | { storagePath: string; status: "error"; error: string };

export type StartProcessingResult =
  | { ok: true; results: CvProcessingOutcome[] }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Cola de procesamiento asíncrono
// ---------------------------------------------------------------------------

/** Fila de la tabla cv_processing_queue en Supabase. */
export interface QueueItem {
  readonly id: string;
  readonly organization_id: string;
  readonly storage_path: string;
  readonly file_name: string;
  readonly cv_sha256: string | null;
  readonly status: "pending" | "processing" | "completed" | "duplicate" | "error";
  readonly result_message: string | null;
  readonly locked_by: string | null;
  readonly locked_at: string | null;
  readonly created_at: string;
  readonly processed_at: string | null;
}

export type EnqueueFileResult =
  | { storagePath: string; fileName: string; status: "enqueued"; queueId: string }
  | { storagePath: string; fileName: string; status: "duplicate"; message: string }
  | { storagePath: string; fileName: string; status: "error"; error: string };

export type EnqueueResult = EnqueueFileResult[];

export interface QueueStatus {
  readonly pending: number;
  readonly processing: number;
  readonly total: number;
}

export interface QueueHistoryPage {
  readonly items: QueueItem[];
  readonly total: number;
}
