"use client";

import { useEffect, useRef } from "react";
import { claimAndProcessNextQueueItem } from "@/src/lib/queue-actions";

const IDLE_POLL_MS = 4_000;
const ERROR_RETRY_MS = 6_000;

/**
 * Hook que drena la cola de procesamiento de CVs en segundo plano.
 *
 * - Genera un `tabId` único por instancia (no cambia entre renders).
 * - Mientras haya items pendientes, los procesa uno a uno sin pausa.
 * - Cuando la cola está vacía o bloqueada por otro procesador, espera `IDLE_POLL_MS`
 *   antes de volver a consultar.
 * - En caso de error de red, espera `ERROR_RETRY_MS` antes de reintentar.
 * - El procesamiento se detiene limpiamente cuando el componente se desmonta.
 *
 * Colocar en un Provider global (root layout) para que persista entre navegaciones.
 */
export function useQueueProcessor(): void {
  const tabIdRef = useRef<string>("");
  const stopRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tabIdRef.current = crypto.randomUUID();
    stopRef.current = false;

    function scheduleNext(delayMs: number) {
      if (stopRef.current) return;
      timeoutRef.current = setTimeout(runLoop, delayMs);
    }

    async function runLoop() {
      if (stopRef.current) return;

      try {
        const result = await claimAndProcessNextQueueItem(tabIdRef.current);
        if (stopRef.current) return;

        if (result.processed) {
          // Item completado → intentar el siguiente inmediatamente
          scheduleNext(0);
        } else {
          // Cola vacía o bloqueada por otro procesador → esperar antes de reintentar
          scheduleNext(IDLE_POLL_MS);
        }
      } catch {
        if (!stopRef.current) {
          scheduleNext(ERROR_RETRY_MS);
        }
      }
    }

    runLoop();

    return () => {
      stopRef.current = true;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
}
