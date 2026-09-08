#!/usr/bin/env bash
set -euo pipefail

# Deploy the Cortex web UI to Vercel.
# Prerequisites: vercel CLI installed, authenticated, project linked.

echo "==> Deploying Cortex Web to Vercel"

# Check if Vercel CLI is available
if ! command -v vercel &>/dev/null; then
  echo "Error: vercel CLI not found. Install with: bun add -g vercel"
  exit 1
fi

# Deploy from the web app directory
cd apps/web

echo "==> Required environment variables (set in Vercel dashboard):"
echo "    NEXT_PUBLIC_API_URL"
echo "    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"

# Production deploy
if [[ "${1:-}" == "--prod" ]]; then
  echo "==> Deploying to production..."
  vercel --prod
else
  echo "==> Deploying preview..."
  echo "    Use --prod for production deployment."
  vercel
fi

echo "==> Deploy complete."
