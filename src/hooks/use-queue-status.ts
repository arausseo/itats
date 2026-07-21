"use client";

import { useState, useEffect } from "react";
import { getQueueStatus } from "@/src/lib/queue-actions";
import type { QueueStatus } from "@/src/types/upload";

const POLL_ACTIVE_MS = 5_000;
const POLL_IDLE_MS = 60_000;
const ERROR_RETRY_MS = 8_000;

const EMPTY_STATUS: QueueStatus = {
  pending: 0,
  processing: 0,
  total: 0,
  processingEnabled: true,
};

function pollDelayFor(status: QueueStatus): number {
  return status.total > 0 ? POLL_ACTIVE_MS : POLL_IDLE_MS;
}

/**
 * Hook que consulta periódicamente el estado de la cola de procesamiento.
 * - Cola activa: poll cada 5 s.
 * - Cola vacía: poll cada 60 s (menos presión al servidor).
 * - Pestaña oculta: pausa hasta volver a ser visible.
 */
export function useQueueStatus(): QueueStatus {
  const [status, setStatus] = useState<QueueStatus>(EMPTY_STATUS);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function clearScheduled() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function scheduleNext(delayMs: number) {
      if (!isMounted) return;
      clearScheduled();
      timeoutId = setTimeout(() => {
        void poll();
      }, delayMs);
    }

    async function poll() {
      if (!isMounted) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }

      try {
        const s = await getQueueStatus();
        if (!isMounted) return;
        setStatus(s);
        scheduleNext(pollDelayFor(s));
      } catch {
        if (isMounted) {
          scheduleNext(ERROR_RETRY_MS);
        }
      }
    }

    function handleVisibilityChange() {
      if (!isMounted) return;
      if (document.visibilityState === "visible") {
        void poll();
      } else {
        clearScheduled();
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    void poll();

    return () => {
      isMounted = false;
      clearScheduled();
      if (typeof document !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      }
    };
  }, []);

  return status;
}
