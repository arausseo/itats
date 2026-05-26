/**
 * Logger minimalista: una línea JSON por evento.
 * Pensado para que los agregadores (Loki, Datadog, etc.) parseen sin esfuerzo.
 */

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };
  if (meta) Object.assign(entry, meta);
  // Errores van a stderr para que Docker los marque correctamente.
  const out = level === "error" ? console.error : console.log;
  out(JSON.stringify(entry));
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
