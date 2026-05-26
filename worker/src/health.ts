import { createServer, type Server } from "node:http";
import { log } from "./log";

export interface HealthState {
  shuttingDown: boolean;
  inFlight: () => number;
}

/**
 * Servidor HTTP mínimo para health checks (Docker HEALTHCHECK, k8s liveness).
 *   GET /health → 200 si no estamos apagando, 503 si shuttingDown.
 *   Cualquier otra ruta → 404.
 */
export function startHealthServer(port: number, state: HealthState): Server {
  const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      const ok = !state.shuttingDown;
      res.writeHead(ok ? 200 : 503, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok,
          shuttingDown: state.shuttingDown,
          inFlight: state.inFlight(),
        }),
      );
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  server.listen(port, () => {
    log.info("health_listening", { port });
  });

  return server;
}
