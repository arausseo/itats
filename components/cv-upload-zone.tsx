"use client";

import { useRef, useState, useCallback } from "react";
import pLimit from "p-limit";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CvFileList } from "@/components/cv-file-list";
import { uploadCvFile, startCvProcessing } from "@/src/lib/upload-actions";
import {
  UPLOAD_CONCURRENCY_LIMIT,
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
} from "@/src/lib/upload-config";
import type {
  FileUploadEntry,
  CvProcessingItem,
} from "@/src/types/upload";

type Phase = "idle" | "uploading" | "processing" | "done";

function buildKey(file: File, index: number) {
  return `${index}-${file.name}-${file.size}`;
}

export function CvUploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);
  const [entries, setEntries] = useState<FileUploadEntry[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function updateEntry(
    key: string,
    patch: Partial<FileUploadEntry>,
  ) {
    setEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    );
  }

  const validateAndSetFiles = useCallback((files: File[]) => {
    setGlobalError(null);

    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      setGlobalError(
        `Puedes subir como máximo ${MAX_FILES} archivos a la vez.`,
      );
      return;
    }

    const invalid = files.filter(
      (f) => f.type !== "application/pdf" || f.size > MAX_FILE_SIZE_BYTES,
    );
    if (invalid.length > 0) {
      setGlobalError(
        `${invalid.length} archivo(s) no son PDF válidos o superan 20 MB: ${invalid.map((f) => f.name).join(", ")}`,
      );
      return;
    }

    const newEntries: FileUploadEntry[] = files.map((f, i) => ({
      key: buildKey(f, Date.now() + i),
      fileName: f.name,
      fileSizeBytes: f.size,
      status: "pendiente",
      storagePath: null,
      errorMessage: null,
    }));

    filesRef.current = files;
    setEntries(newEntries);
    setPhase("idle");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    validateAndSetFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    validateAndSetFiles(files);
  }, [validateAndSetFiles]);

  async function handleUpload() {
    if (!entries.length || phase === "uploading" || phase === "processing")
      return;

    setPhase("uploading");
    setGlobalError(null);

    const fileMap = new Map<string, File>();
    for (const entry of entries) {
      const match = filesRef.current.find(
        (f) => f.name === entry.fileName && f.size === entry.fileSizeBytes,
      );
      if (match) fileMap.set(entry.key, match);
    }

    const limit = pLimit(UPLOAD_CONCURRENCY_LIMIT);
    const successItems: CvProcessingItem[] = [];

    await Promise.allSettled(
      entries.map((entry) =>
        limit(async () => {
          const file = fileMap.get(entry.key);
          if (!file) {
            updateEntry(entry.key, {
              status: "error",
              errorMessage: "Archivo no disponible",
            });
            return;
          }

          updateEntry(entry.key, { status: "subiendo" });

          const formData = new FormData();
          formData.append("file", file);

          const result = await uploadCvFile(formData);

          if (result.ok) {
            updateEntry(entry.key, {
              status: "procesando",
              storagePath: result.storagePath,
            });
            successItems.push({
              fileName: entry.fileName,
              storagePath: result.storagePath,
            });
          } else {
            updateEntry(entry.key, {
              status: "error",
              errorMessage: result.error,
            });
          }
        }),
      ),
    );

    if (successItems.length > 0) {
      setPhase("processing");
      const proc = await startCvProcessing(successItems);
      if (proc.ok) {
        setEntries((prev) =>
          prev.map((e) => {
            const r = proc.results.find((x) => x.storagePath === e.storagePath);
            if (!r) return e;
            if (r.status === "completado") {
              return { ...e, status: "completado", errorMessage: null };
            }
            if (r.status === "duplicado") {
              return {
                ...e,
                status: "duplicado",
                errorMessage: r.message,
              };
            }
            return { ...e, status: "error", errorMessage: r.error };
          }),
        );
      } else {
        setEntries((prev) =>
          prev.map((e) =>
            successItems.some((s) => s.storagePath === e.storagePath)
              ? {
                  ...e,
                  status: "error",
                  errorMessage: proc.error,
                }
              : e,
          ),
        );
      }
    }

    setPhase("done");
  }

  const canUpload =
    entries.length > 0 &&
    entries.some((e) => e.status === "pendiente") &&
    phase === "idle";

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Arrastra archivos aquí o{" "}
            <span className="text-primary underline-offset-2 hover:underline">
              selecciona
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Solo PDF · Máximo {MAX_FILES} archivos · 20 MB por archivo
          </p>
        </div>
      </div>

      {/* Global error */}
      {globalError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {globalError}
        </p>
      )}

      {/* File list */}
      <CvFileList entries={entries} />

      {/* Actions */}
      {entries.length > 0 && phase !== "done" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {entries.length} archivo(s) seleccionado(s)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                filesRef.current = [];
                setEntries([]);
                setPhase("idle");
                setGlobalError(null);
              }}
              disabled={phase === "uploading" || phase === "processing"}
            >
              Limpiar
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={!canUpload}
            >
              {phase === "uploading"
                ? "Subiendo…"
                : phase === "processing"
                  ? "Procesando…"
                  : "Subir CVs"}
            </Button>
          </div>
        </div>
      )}

      {/* Done state */}
      {phase === "done" && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          <p className="font-medium">
            Carga completada.{" "}
            {entries.some((e) => e.status === "completado") &&
              "Los candidatos nuevos ya están en el sistema."}
            {entries.some((e) => e.status === "duplicado") &&
              " Algunos CVs no se importaron porque ya existía ese candidato."}
            {entries.some((e) => e.status === "error") &&
              " Revisa los archivos marcados con error."}
          </p>
          <div className="mt-2 flex gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                Ver candidatos
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                filesRef.current = [];
                setEntries([]);
                setPhase("idle");
                setGlobalError(null);
              }}
            >
              Subir más
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
