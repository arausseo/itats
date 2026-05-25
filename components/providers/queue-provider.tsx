"use client";

import { createContext, useContext } from "react";
import { useQueueProcessor } from "@/src/hooks/use-queue-processor";
import { useQueueStatus } from "@/src/hooks/use-queue-status";
import { QueueStatusBadge } from "@/components/queue-status-badge";
import type { QueueStatus } from "@/src/types/upload";

const QueueStatusContext = createContext<QueueStatus | null>(null);

export function useQueueStatusContext(): QueueStatus {
  const status = useContext(QueueStatusContext);
  if (!status) {
    throw new Error("useQueueStatusContext debe usarse dentro de QueueProvider");
  }
  return status;
}

interface QueueProviderProps {
  children: React.ReactNode;
}

/**
 * Provider global que:
 * 1. Inicia el loop de procesamiento de la cola en segundo plano (useQueueProcessor).
 * 2. Consulta periódicamente el estado de la cola (useQueueStatus).
 * 3. Renderiza el badge flotante con el progreso (QueueStatusBadge).
 *
 * Debe colocarse dentro de NextIntlClientProvider para acceder a traducciones.
 */
export function QueueProvider({ children }: QueueProviderProps) {
  const status = useQueueStatus();
  useQueueProcessor(status.processingEnabled);

  return (
    <QueueStatusContext.Provider value={status}>
      {children}
      <QueueStatusBadge status={status} />
    </QueueStatusContext.Provider>
  );
}
