/**
 * Parseo y validación de variables de entorno del worker.
 * Las credenciales (Supabase service role, OpenAI, Gemini) las consume
 * `cv-processor.ts` directamente; aquí solo validamos que existan y
 * exponemos los knobs de operación.
 */

function readString(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Variable de entorno faltante: ${name}`);
  }
  return v.trim();
}

function readNumber(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Variable ${name} inválida: ${raw}`);
  }
  return n;
}

export interface WorkerConfig {
  concurrency: number;
  idleMs: number;
  errorMs: number;
  lockTimeoutMinutes: number;
  healthPort: number;
}

export function loadConfig(): WorkerConfig {
  // Forzar la lectura para validar al arrancar; los valores vivos
  // se consultan en cv-processor con getEnv().
  readString("NEXT_PUBLIC_SUPABASE_URL");
  readString("SUPABASE_SERVICE_ROLE_KEY");
  readString("OPENAI_API_KEY");
  readString("GEMINI_API_KEY");

  return {
    concurrency: Math.max(1, readNumber("WORKER_CONCURRENCY", 1)),
    idleMs: readNumber("WORKER_IDLE_MS", 30_000),
    errorMs: readNumber("WORKER_ERROR_MS", 6_000),
    lockTimeoutMinutes: Math.max(1, readNumber("WORKER_LOCK_TIMEOUT_MIN", 10)),
    healthPort: readNumber("HEALTH_PORT", 8080),
  };
}
