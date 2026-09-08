#!/usr/bin/env bash
set -euo pipefail

# Apply database migrations to the target DATABASE_URL.
# Uses drizzle-kit from the @cortex/db package.

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL environment variable is required."
  echo ""
  echo "Usage:"
  echo "  DATABASE_URL=postgres://user:pass@host/db ./scripts/migrate.sh"
  echo ""
  echo "For Neon:"
  echo "  DATABASE_URL=postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/cortex ./scripts/migrate.sh"
  exit 1
fi

echo "==> Running migrations against: ${DATABASE_URL%%@*}@***"

cd packages/db

# Generate migration files from schema changes (if any)
echo "==> Generating migrations..."
bun run generate

# Apply migrations
echo "==> Applying migrations..."
bun run migrate

echo "==> Migrations complete."
