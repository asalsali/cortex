#!/usr/bin/env bash
set -euo pipefail

# Deploy the Cortex API server to Fly.io.
# Prerequisites: flyctl installed, authenticated, secrets set.

APP_NAME="${FLY_APP_API:-cortex-api}"
REGION="${FLY_REGION:-iad}"

echo "==> Deploying Cortex API to Fly.io ($APP_NAME in $REGION)"

# Ensure the app exists
if ! fly apps list | grep -q "$APP_NAME"; then
  echo "==> Creating Fly app: $APP_NAME"
  fly apps create "$APP_NAME" --org personal
fi

# Set secrets if not already set (idempotent)
echo "==> Verifying secrets are configured..."
echo "    Required: DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,"
echo "    SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET,"
echo "    CLERK_SECRET_KEY, VOYAGE_API_KEY, ANTHROPIC_API_KEY"
echo ""
echo "    Set via: fly secrets set KEY=VALUE -a $APP_NAME"

# Deploy from repo root (Dockerfile at apps/api/Dockerfile)
echo "==> Building and deploying..."
fly deploy \
  --app "$APP_NAME" \
  --config apps/api/fly.toml \
  --dockerfile apps/api/Dockerfile \
  --region "$REGION" \
  --strategy rolling

echo "==> Deploy complete. Health check:"
fly status --app "$APP_NAME"
echo ""
echo "API URL: https://$APP_NAME.fly.dev"
