"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { FileUploadEntry, FileUploadStatus } from "@/src/types/upload";

const STATUS_LABELS: Record<FileUploadStatus, string> = {
  pendiente: "Pendiente",
  subiendo: "Subiendo",
  procesando: "Procesando",
  completado: "Completado",
  duplicado: "Ya existía",
  error: "Error",
};

const STATUS_VARIANTS: Record<
  FileUploadStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pendiente: "outline",
  subiendo: "secondary",
  procesando: "secondary",
  completado: "default",
  duplicado: "outline",
  error: "destructive",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CvFileListProps {
  entries: FileUploadEntry[];
}

export function CvFileList({ entries }: CvFileListProps) {
  if (!entries.length) return null;

  return (
    <ul className="mt-4 max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
      {entries.map((entry) => (
        <li
          key={entry.key}
          className="flex items-center gap-3 px-4 py-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p
              className="truncate font-medium text-foreground"
              title={entry.fileName}
            >
              {entry.fileName}
            </p>
            {entry.errorMessage ? (
              <p
                className={cn(
                  "mt-0.5 truncate text-xs",
                  entry.status === "duplicado"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-destructive",
                )}
              >
                {entry.errorMessage}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatBytes(entry.fileSizeBytes)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {(entry.status === "subiendo" ||
              entry.status === "procesando") && (
              <Spinner className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Badge
              variant={STATUS_VARIANTS[entry.status]}
              className={cn(
                "text-xs",
                entry.status === "completado" &&
                  "bg-green-600 text-white hover:bg-green-600",
                entry.status === "duplicado" &&
                  "border-amber-500/60 bg-amber-50 text-amber-900 hover:bg-amber-50 dark:bg-amber-950/40 dark:text-amber-100",
              )}
            >
              {STATUS_LABELS[entry.status]}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
