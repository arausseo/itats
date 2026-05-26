# CV Queue Worker

Servicio Node.js standalone que drena la cola `cv_processing_queue` ejecutando
la pipeline `runCvPipeline` (la misma que usaba el navegador). Reemplaza el
procesador del cliente que dependía de tener la app abierta en una pestaña.

## Cómo corre

1. Cada iteración llama a la RPC `claim_next_cv_queue_item_any_org` que reclama
   atómicamente el item `pending` más antiguo entre **todas las organizaciones**
   con `processing_enabled` activo.
2. Si hay item, ejecuta `runCvPipeline` (PDF → markdown → embedding → JSON →
   Edge Function) y actualiza la fila con el estado final.
3. Si no hay item, duerme `WORKER_IDLE_MS` y reintenta.

Garantías:

- Un solo procesador activo por organización a la vez (lock por `locked_by`).
- Locks abandonados se liberan automáticamente tras `WORKER_LOCK_TIMEOUT_MIN`.
- `FOR UPDATE SKIP LOCKED` protege contra carreras entre instancias del worker
  y entre worker y procesador del navegador (durante la convivencia).

## Desarrollo local

```bash
cp .env.worker.example .env.worker
# Completa SUPABASE / OPENAI / GEMINI

npm install
npm run worker:dev   # tsx watch, recarga al cambiar código
```

## Compilar y correr build

```bash
npm run worker:build
npm run worker:start
```

## Docker

```bash
cp .env.worker.example .env.worker
docker compose up --build worker
```

El contenedor expone `/health` en el puerto 8080 (configurable vía
`HEALTH_PORT`). `docker compose` está configurado con `stop_grace_period: 120s`
para permitir que un item en curso termine antes de matar el contenedor.

## Apagado seguro

`SIGTERM` / `SIGINT` activan el shutdown:

1. Se setea `state.shuttingDown = true`, el loop sale en la siguiente vuelta.
2. Se espera a que todos los items in-flight terminen (con catch para que
   ninguno cuelgue el shutdown).
3. Se cierra el servidor de salud y se hace `process.exit(0)`.

Un timeout de seguridad de 5s fuerza la salida si algo se traba.

## Variables de entorno

Ver `.env.worker.example` para la lista completa. Las credenciales (Supabase,
OpenAI, Gemini) las consume `src/lib/cv-processor.ts` directamente; el worker
solo valida que existan al arrancar.

## Convivencia con el procesador del navegador

Durante la transición, ambos procesadores pueden estar activos. El navegador
solo procesa si `NEXT_PUBLIC_CLIENT_QUEUE_PROCESSOR_ENABLED=true` (default
`false`). Si ambos están activos, la RPC garantiza que ninguno duplica items:
el primero que reclama gana y el segundo recibe vacío.

## Observabilidad

Logs en una línea JSON por evento (`{ts, level, msg, ...meta}`). Eventos clave:

- `worker_starting` — arranque, config, lockedBy
- `loop_started` — el loop principal arrancó
- `claimed` — se reclamó un item (queueId, organizationId, fileName)
- `processed` — terminó un item (status, durationMs)
- `pipeline_exception` — falla atrapada dentro de processItem
- `claim_failed` — error en la RPC (red, BD)
- `shutdown_signal` — SIGTERM/SIGINT recibido
- `worker_stopped` — exit limpio
