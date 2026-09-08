#!/usr/bin/env bash
set -euo pipefail

# Full local development setup for Cortex.
# Starts Postgres, installs deps, runs migrations, and starts dev servers.

echo "==> Cortex local development setup"
echo ""

# 1. Check prerequisites
echo "==> Checking prerequisites..."
for cmd in bun docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not found."
    exit 1
  fi
done
echo "    bun:    $(bun --version)"
echo "    docker: $(docker --version | head -1)"
echo ""

# 2. Create .env if it doesn't exist
if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example..."
  cp .env.example .env
  echo "    Edit .env with your API keys before starting the API server."
  echo ""
fi

# 3. Start Postgres via docker-compose
echo "==> Starting Postgres (pgvector)..."
docker compose up -d postgres
echo "    Waiting for Postgres to be ready..."
until docker compose exec -T postgres pg_isready -U postgres &>/dev/null; do
  sleep 1
done
echo "    Postgres is ready."
echo ""

# 4. Install dependencies
echo "==> Installing dependencies..."
bun install
echo ""

# 5. Run migrations
echo "==> Running database migrations..."
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/cortex}"
cd packages/db
bun run generate 2>/dev/null || true
bun run push
cd ../..
echo ""

# 6. Summary
echo "==> Setup complete!"
echo ""
echo "Start the development servers:"
echo "  bun run dev:api     # API server on http://localhost:4000"
echo "  bun run dev:worker  # Background worker"
echo "  bun run dev:web     # Web UI on http://localhost:3000"
echo ""
echo "Or start everything:"
echo "  bun run dev"
