import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { loadConfig } from "./config";
import { startHealthServer } from "./health";
import { runLoop, type LoopState } from "./loop";
import { log } from "./log";

async function main(): Promise<void> {
  const config = loadConfig();

  const lockedBy = `worker:${hostname()}:${randomUUID()}`;
  const state: LoopState = {
    shuttingDown: false,
    inFlight: new Set(),
  };

  const healthServer = startHealthServer(config.healthPort, {
    shuttingDown: false,
    inFlight: () => state.inFlight.size,
  });

  // Mantener el flag de salud sincronizado.
  Object.defineProperty(healthServer, "shuttingDown", {
    get: () => state.shuttingDown,
  });

  log.info("worker_starting", { lockedBy, config });

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (state.shuttingDown) return;
    state.shuttingDown = true;
    log.info("shutdown_signal", {
      signal,
      remainingInFlight: state.inFlight.size,
    });

    // Esperar a que el loop salga y a que todos los items en vuelo terminen.
    // El loop revisa shuttingDown en cada iteración, pero puede estar dormido;
    // la espera de inFlight es lo que realmente bloquea.
    try {
      await Promise.allSettled(Array.from(state.inFlight));
    } catch {
      // intencional: drainamos sin fallar.
    }

    healthServer.close(() => {
      log.info("worker_stopped");
      process.exit(0);
    });

    // Salida forzada por si healthServer.close se cuelga.
    setTimeout(() => {
      log.warn("force_exit_after_grace");
      process.exit(0);
    }, 5_000).unref();
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    log.error("unhandled_rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
  process.on("uncaughtException", (err) => {
    log.error("uncaught_exception", { error: err.message, stack: err.stack });
  });

  await runLoop(config, lockedBy, state);
}

main().catch((err) => {
  log.error("fatal", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
