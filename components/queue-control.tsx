"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { setQueueProcessingEnabled } from "@/src/lib/queue-actions";
import { useQueueStatusContext } from "@/components/providers/queue-provider";
import type { QueueStatus } from "@/src/types/upload";

interface QueueControlProps {
  initialStatus: QueueStatus;
}

export function QueueControl({ initialStatus }: QueueControlProps) {
  const t = useTranslations("queueControl");
  const liveStatus = useQueueStatusContext();
  const status = liveStatus.total > 0 ? liveStatus : initialStatus;

  const [processingEnabled, setOptimisticEnabled] = useOptimistic(
    liveStatus.processingEnabled,
    (_current, next: boolean) => next,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleProcessing(enabled: boolean) {
    setError(null);
    startTransition(async () => {
      setOptimisticEnabled(enabled);
      const result = await setQueueProcessingEnabled(enabled);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={processingEnabled ? "secondary" : "outline"}
            className="text-xs"
          >
            {processingEnabled ? t("statusRunning") : t("statusPaused")}
          </Badge>
          {status.total > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("pendingCount", { count: status.total })}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {processingEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleProcessing(false)}
              disabled={isPending}
            >
              {isPending ? <Spinner className="h-4 w-4" /> : t("stop")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => toggleProcessing(true)}
              disabled={isPending}
            >
              {isPending ? <Spinner className="h-4 w-4" /> : t("start")}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!processingEnabled && (
        <p className="text-xs text-muted-foreground">{t("pausedHint")}</p>
      )}
    </div>
  );
}
