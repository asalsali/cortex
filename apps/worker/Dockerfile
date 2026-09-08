FROM oven/bun:1 AS base
WORKDIR /app

# ── Install dependencies ─────────────────────────────────────────
FROM base AS deps
COPY package.json bun.lock* bun.lockb* ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/engine/package.json packages/engine/
COPY packages/connectors/package.json packages/connectors/
COPY packages/billing/package.json packages/billing/
COPY apps/worker/package.json apps/worker/
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# ── Build ─────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/packages/*/node_modules packages/
COPY . .
RUN cd apps/worker && bun build src/index.ts --outdir dist --target bun

# ── Runtime ───────────────────────────────────────────────────────
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/packages packages
COPY --from=build /app/apps/worker apps/worker
COPY package.json ./

WORKDIR /app/apps/worker

CMD ["bun", "run", "src/index.ts"]
