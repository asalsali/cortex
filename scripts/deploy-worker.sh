#!/usr/bin/env bash
set -euo pipefail

# Deploy the Cortex worker to Fly.io.
# Prerequisites: flyctl installed, authenticated, secrets set.

APP_NAME="${FLY_APP_WORKER:-cortex-worker}"
REGION="${FLY_REGION:-iad}"

echo "==> Deploying Cortex Worker to Fly.io ($APP_NAME in $REGION)"

# Ensure the app exists
if ! fly apps list | grep -q "$APP_NAME"; then
  echo "==> Creating Fly app: $APP_NAME"
  fly apps create "$APP_NAME" --org personal
fi

echo "==> Verifying secrets are configured..."
echo "    Required: DATABASE_URL (unpooled), VOYAGE_API_KEY, ANTHROPIC_API_KEY"
echo ""
echo "    Set via: fly secrets set KEY=VALUE -a $APP_NAME"

# Deploy from repo root (Dockerfile at apps/worker/Dockerfile)
echo "==> Building and deploying..."
fly deploy \
  --app "$APP_NAME" \
  --config apps/worker/fly.toml \
  --dockerfile apps/worker/Dockerfile \
  --region "$REGION" \
  --strategy rolling

echo "==> Deploy complete."
fly status --app "$APP_NAME"
