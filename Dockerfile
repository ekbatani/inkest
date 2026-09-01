# ── All-in-One Self-Hosted Dockerfile (Next.js + Embedded PostgreSQL + pgvector) ──
FROM node:20-bookworm-slim AS base
RUN corepack enable && npm i -g bun@1

# Install PostgreSQL 16 & pgvector
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-16 \
    postgresql-16-pgvector \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Dependencies ──────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/local.db
RUN mkdir -p /app/data /app/storage
RUN node scripts/migrate.mjs || true
RUN bun run build

# ── Runtime Stage ─────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy Next.js Standalone Build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /data/postgres /app/storage && \
    chown -R postgres:postgres /data

EXPOSE 3000

VOLUME ["/data", "/app/storage"]

ENTRYPOINT ["./docker-entrypoint.sh"]
