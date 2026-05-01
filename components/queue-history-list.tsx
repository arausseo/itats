"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Cancel01Icon, Clock01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { getRecentQueueItems } from "@/src/lib/queue-actions";
import type { QueueItem } from "@/src/types/upload";

const PAGE_SIZE_DEFAULT = 20;
const AUTO_REFRESH_MS = 5_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function hasActiveItems(items: QueueItem[]): boolean {
  return items.some((i) => i.status === "pending" || i.status === "processing");
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

type QueueItemStatus = QueueItem["status"];

const STATUS_ICON: Record<QueueItemStatus, typeof Tick02Icon | null> = {
  pending: null,
  processing: null,
  completed: Tick02Icon,
  duplicate: null,
  error: Cancel01Icon,
};

function StatusBadge({ status, t }: { status: QueueItemStatus; t: ReturnType<typeof useTranslations> }) {
  const isProcessing = status === "processing";
  const icon = STATUS_ICON[status];

  return (
    <Badge
      variant={
        status === "error"
          ? "destructive"
          : status === "pending" || status === "duplicate"
            ? "outline"
            : "secondary"
      }
      className={cn(
        "flex items-center gap-1 text-xs",
        status === "completed" && "bg-green-600 text-white hover:bg-green-600",
        status === "duplicate" &&
          "border-amber-500/60 bg-amber-50 text-amber-900 hover:bg-amber-50 dark:bg-amber-950/40 dark:text-amber-100",
      )}
    >
      {isProcessing && <Spinner className="h-3 w-3" />}
      {icon && <HugeiconsIcon icon={icon} className="h-3 w-3" strokeWidth={2} />}
      {t(status)}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// QueueHistoryList
// ---------------------------------------------------------------------------

interface QueueHistoryListProps {
  initialItems: QueueItem[];
  initialTotal: number;
  pageSize?: number;
}

export function QueueHistoryList({
  initialItems,
  initialTotal,
  pageSize = PAGE_SIZE_DEFAULT,
}: QueueHistoryListProps) {
  const t = useTranslations("upload");
  const tStatus = useTranslations("queueStatus");
  const tPag = useTranslations("pagination");

  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchPage = useCallback(
    (targetPage: number) => {
      startTransition(async () => {
        const result = await getRecentQueueItems(targetPage, pageSize);
        setItems(result.items);
        setTotal(result.total);
      });
    },
    [pageSize],
  );

  // Auto-refresh: solo en página 1 y cuando hay items activos
  useEffect(() => {
    if (page !== 1) return;
    if (!hasActiveItems(items)) return;

    const id = setTimeout(() => fetchPage(1), AUTO_REFRESH_MS);
    return () => clearTimeout(id);
  }, [items, page, fetchPage]);

  function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) return;
    setPage(next);
    fetchPage(next);
  }

  if (items.length === 0 && total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("historyEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lista de items */}
      <div
        className={cn(
          "divide-y divide-border rounded-lg border border-border",
          isPending && "opacity-60 transition-opacity",
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-3 text-sm"
          >
            {/* Icono de tipo */}
            <div className="mt-0.5 shrink-0 text-muted-foreground">
              <HugeiconsIcon
                icon={
                  item.status === "completed"
                    ? Tick02Icon
                    : item.status === "error"
                      ? Cancel01Icon
                      : item.status === "processing"
                        ? Clock01Icon
                        : UserAdd01Icon
                }
                className={cn(
                  "h-4 w-4",
                  item.status === "completed" && "text-green-600",
                  item.status === "error" && "text-destructive",
                  item.status === "processing" && "text-primary",
                )}
                strokeWidth={2}
              />
            </div>

            {/* Nombre y mensaje */}
            <div className="min-w-0 flex-1">
              <p
                className="truncate font-medium text-foreground"
                title={item.file_name}
              >
                {item.file_name}
              </p>
              {item.result_message && (
                <p
                  className={cn(
                    "mt-0.5 truncate text-xs",
                    item.status === "duplicate"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground",
                    item.status === "error" && "text-destructive",
                  )}
                  title={item.result_message}
                >
                  {item.result_message}
                </p>
              )}
            </div>

            {/* Estado */}
            <div className="shrink-0">
              <StatusBadge status={item.status} t={tStatus} />
            </div>

            {/* Fecha relativa */}
            <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatRelativeTime(item.created_at)}
            </p>
          </div>
        ))}
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {tPag("pageOf", { page, totalPages })}
            {" · "}
            {total} {total === 1 ? "resultado" : "resultados"}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isPending}
            >
              {tPag("prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || isPending}
            >
              {tPag("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
