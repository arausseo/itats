"use client";

import { useQueueProcessor } from "@/src/hooks/use-queue-processor";
import { useQueueStatus } from "@/src/hooks/use-queue-status";
import { QueueStatusBadge } from "@/components/queue-status-badge";

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
  useQueueProcessor();
  const status = useQueueStatus();

  return (
    <>
      {children}
      <QueueStatusBadge status={status} />
    </>
  );
}
