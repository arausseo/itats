"use client";

import { useEffect, useRef } from "react";
import { claimAndProcessNextQueueItem } from "@/src/lib/queue-actions";

const IDLE_POLL_MS = 30_000;
const ERROR_RETRY_MS = 6_000;
const PAUSED_POLL_MS = 5_000;

/**
 * Hook que drena la cola de procesamiento de CVs en segundo plano.
 *
 * - Genera un `tabId` único por instancia (no cambia entre renders).
 * - Mientras haya items pendientes, los procesa uno a uno sin pausa.
 * - Cuando la cola está vacía o bloqueada por otro procesador, espera `IDLE_POLL_MS`
 *   antes de volver a consultar.
 * - Si `processingEnabled` es false, no reclama items y reintenta cada `PAUSED_POLL_MS`.
 * - En caso de error de red, espera `ERROR_RETRY_MS` antes de reintentar.
 * - El procesamiento se detiene limpiamente cuando el componente se desmonta.
 *
 * Colocar en un Provider global (root layout) para que persista entre navegaciones.
 */
export function useQueueProcessor(processingEnabled: boolean): void {
  const tabIdRef = useRef<string>("");
  const stopRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(processingEnabled);
  const runLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!tabIdRef.current) {
      tabIdRef.current = crypto.randomUUID();
    }
    stopRef.current = false;

    function clearScheduled() {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function scheduleNext(delayMs: number) {
      if (stopRef.current) return;
      clearScheduled();
      timeoutRef.current = setTimeout(runLoop, delayMs);
    }

    async function runLoop() {
      if (stopRef.current) return;

      if (!enabledRef.current) {
        scheduleNext(PAUSED_POLL_MS);
        return;
      }

      try {
        const result = await claimAndProcessNextQueueItem(tabIdRef.current);
        if (stopRef.current) return;

        if (result.processed) {
          scheduleNext(0);
        } else {
          scheduleNext(IDLE_POLL_MS);
        }
      } catch {
        if (!stopRef.current) {
          scheduleNext(ERROR_RETRY_MS);
        }
      }
    }

    runLoopRef.current = () => {
      void runLoop();
    };

    void runLoop();

    return () => {
      stopRef.current = true;
      clearScheduled();
      runLoopRef.current = null;
    };
  }, []);

  useEffect(() => {
    enabledRef.current = processingEnabled;
    if (processingEnabled) {
      runLoopRef.current?.();
    }
  }, [processingEnabled]);
}
