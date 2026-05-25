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
 * Badge flotante que muestra el progreso o la pausa del procesamiento de CVs.
 */
export function QueueStatusBadge({ status }: QueueStatusBadgeProps) {
  const t = useTranslations("queueBadge");

  if (status.total === 0) return null;

  const isPaused = !status.processingEnabled;

  return (
    <Link
      href="/upload"
      className={cn(
        "fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-4 py-2.5",
        "bg-card border border-border shadow-lg ring-1 ring-border/60",
        "text-sm font-medium text-foreground transition-all",
        "hover:shadow-xl hover:ring-primary/40",
        isPaused && "border-amber-500/50 ring-amber-500/30",
      )}
    >
      {!isPaused && <Spinner className="h-4 w-4 text-primary" />}
      <span>
        {isPaused
          ? t("paused", { count: status.total })
          : t("processing", { count: status.total })}
      </span>
    </Link>
  );
}
