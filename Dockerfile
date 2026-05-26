# =============================================================================
# CV Queue Worker — standalone background service
#
# Multi-stage build:
#  1. `builder`  — instala todas las deps, compila TS → dist-worker/
#  2. `runtime`  — imagen slim solo con node_modules de producción y dist-worker/
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencias primero para cachear si no cambian
COPY package.json package-lock.json* ./
RUN npm ci

# Solo lo necesario para que tsc resuelva el alias @/* y compile el worker.
COPY tsconfig.json tsconfig.worker.json ./
COPY worker ./worker
COPY src/lib/cv-processor.ts ./src/lib/cv-processor.ts
COPY src/types ./src/types

RUN npm run worker:build

# Limpia devDeps para que la copia al runtime sea ligera.
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 2: runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist-worker ./dist-worker
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health >/dev/null 2>&1 || exit 1

CMD ["node", "dist-worker/worker/src/main.js"]
