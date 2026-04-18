export type FileUploadStatus =
  | "pendiente"
  | "subiendo"
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
  | { ok: true; storagePath: string }
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
