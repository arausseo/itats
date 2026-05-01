"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { QueueStatus } from "@/src/types/upload";

interface QueueStatusBadgeProps {
  status: QueueStatus;
}

/**
 * Badge flotante estilo Google Photos que muestra el progreso de procesamiento
 * de CVs en segundo plano. Visible desde cualquier página mientras haya items
 * pendientes o en procesamiento.
 */
export function QueueStatusBadge({ status }: QueueStatusBadgeProps) {
  const t = useTranslations("queueBadge");

  if (status.total === 0) return null;

  return (
    <Link
      href="/upload"
      className={cn(
        "fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-4 py-2.5",
        "bg-card border border-border shadow-lg ring-1 ring-border/60",
        "text-sm font-medium text-foreground transition-all",
        "hover:shadow-xl hover:ring-primary/40",
      )}
    >
      <Spinner className="h-4 w-4 text-primary" />
      <span>{t("processing", { count: status.total })}</span>
    </Link>
  );
}
