FROM oven/bun:1 AS base
WORKDIR /app

# Copy workspace root
COPY package.json bun.lockb* ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/engine/package.json packages/engine/
COPY packages/connectors/package.json packages/connectors/
COPY apps/worker/package.json apps/worker/

# Install dependencies
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY packages/ packages/
COPY apps/worker/ apps/worker/

WORKDIR /app/apps/worker
CMD ["bun", "run", "src/index.ts"]
