export type FileUploadStatus =
  | "pendiente"
  | "subiendo"
  | "en_cola"
  | "procesando"
  | "completado"
  | "duplicado"
  | "no_cv"
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

/** Resultado de subir un archivo a Storage y encolarlo en un solo paso. */
export type UploadAndEnqueueResult =
  | { ok: true; queueId: string }
  | { ok: false; error: string };

export interface CvProcessingItem {
  fileName: string;
  storagePath: string;
  positionId?: string | null;
  applicationAnswers?: ApplicationAnswer[];
}

/** Respuesta del candidato a una pregunta de la plaza (vive en `candidates.application_answers`). */
export interface ApplicationAnswer {
  question_id: string;
  position_id: string;
  question_text: string;
  question_type: "boolean" | "numeric" | "text";
  answer: string | number | boolean | null;
  answered_at: string;
}

/** Resultado de `runCvPipeline` por archivo (para sincronizar la UI). */
export type CvProcessingOutcome =
  | { storagePath: string; status: "completado" }
  | { storagePath: string; status: "duplicado"; message: string }
  | { storagePath: string; status: "no_cv"; message: string }
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
  readonly status:
    | "pending"
    | "processing"
    | "completed"
    | "duplicate"
    | "not_cv"
    | "error";
  readonly result_message: string | null;
  readonly locked_by: string | null;
  readonly locked_at: string | null;
  readonly created_at: string;
  readonly processed_at: string | null;
  readonly position_id: string | null;
  readonly application_answers: ApplicationAnswer[];
  readonly source: "internal" | "public_application";
}

export type EnqueueFileResult =
  | { storagePath: string; fileName: string; status: "enqueued"; queueId: string }
  | { storagePath: string; fileName: string; status: "error"; error: string };

export type EnqueueResult = EnqueueFileResult[];

export interface QueueStatus {
  readonly pending: number;
  readonly processing: number;
  readonly total: number;
  /** Si false, la organización pausó el procesamiento global de la cola. */
  readonly processingEnabled: boolean;
}

export type SetQueueProcessingResult =
  | { ok: true; processingEnabled: boolean }
  | { ok: false; error: string };

export interface QueueHistoryPage {
  readonly items: QueueItem[];
  readonly total: number;
}
