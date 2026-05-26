import { claimNext, processItem } from "./claim";
import type { WorkerConfig } from "./config";
import { log } from "./log";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface LoopState {
  shuttingDown: boolean;
  inFlight: Set<Promise<void>>;
}

/**
 * Main loop: reclama items y los procesa respetando `concurrency`.
 *
 * Comportamiento:
 * - Si el slot está lleno, espera a que alguno termine.
 * - Si la RPC devuelve null (cola vacía o todas las orgs pausadas/bloqueadas),
 *   duerme `idleMs`.
 * - Ante error de RPC/red, duerme `errorMs` y reintenta.
 * - Sale del loop cuando state.shuttingDown=true; el llamador es responsable
 *   de esperar a `state.inFlight` antes de exit.
 */
export async function runLoop(
  config: WorkerConfig,
  lockedBy: string,
  state: LoopState,
): Promise<void> {
  log.info("loop_started", {
    lockedBy,
    concurrency: config.concurrency,
    idleMs: config.idleMs,
  });

  while (!state.shuttingDown) {
    // Limita concurrencia: si está lleno, esperar a que alguno termine.
    if (state.inFlight.size >= config.concurrency) {
      await Promise.race(state.inFlight);
      continue;
    }

    let item;
    try {
      item = await claimNext(lockedBy, config.lockTimeoutMinutes);
    } catch (err) {
      log.error("claim_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      await sleep(config.errorMs);
      continue;
    }

    if (!item) {
      await sleep(config.idleMs);
      continue;
    }

    // Lanzar procesamiento sin bloquear el loop.
    const p = (async () => {
      try {
        await processItem(item);
      } catch (err) {
        // processItem ya maneja excepciones internamente; este catch es defensa
        // adicional para que un crash inesperado no tumbe el loop.
        log.error("process_unhandled", {
          queueId: item.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })().finally(() => {
      state.inFlight.delete(p);
    });
    state.inFlight.add(p);
  }

  log.info("loop_exited", { remainingInFlight: state.inFlight.size });
}
