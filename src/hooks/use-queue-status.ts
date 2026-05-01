"use client";

import { useState, useEffect } from "react";
import { getQueueStatus } from "@/src/lib/queue-actions";
import type { QueueStatus } from "@/src/types/upload";

const POLL_INTERVAL_MS = 5_000;
const ERROR_RETRY_MS = 8_000;

const EMPTY_STATUS: QueueStatus = { pending: 0, processing: 0, total: 0 };

/**
 * Hook que consulta periódicamente el estado de la cola de procesamiento.
 * Usado por el badge global para mostrar cuántos CVs están pendientes/en proceso.
 */
export function useQueueStatus(): QueueStatus {
  const [status, setStatus] = useState<QueueStatus>(EMPTY_STATUS);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const s = await getQueueStatus();
        if (isMounted) {
          setStatus(s);
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (isMounted) {
          timeoutId = setTimeout(poll, ERROR_RETRY_MS);
        }
      }
    }

    poll();

    return () => {
      isMounted = false;
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, []);

  return status;
}
