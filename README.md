# Cortex

The company brain that remembers how you got here.

Cortex is a multi-tenant team knowledge base that ingests information from Slack, Notion, GitHub, and file uploads, builds a temporal knowledge graph showing how facts evolve over time, and consolidates overnight so the team always wakes up to a coherent picture. It serves both humans (via web UI) and AI agents (via MCP server and REST API) equally.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/asalsali/cortex.git && cd cortex
bun install

# 2. Start Postgres with pgvector
docker compose up -d postgres

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Run migrations
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cortex bun run db:push

# 5. Start everything
bun run dev
```

The API server starts on `http://localhost:4000`, the MCP server on port `4001`, and the web UI on `http://localhost:3000`.

Or use the setup script:

```bash
./scripts/setup.sh
```

## Architecture

```
                        SOURCES
    +---------+  +--------+  +--------+  +--------+
    |  Slack  |  | Notion |  | GitHub |  | Upload |
    +----+----+  +----+---+  +----+---+  +----+---+
         |            |           |           |
         v            v           v           v
    +----+------------+-----------+-----------+----+
    |          INGESTION WORKERS (per-source)       |
    |   Writeback Gate -> Dedup -> Chunk -> Extract |
    +------------------------+---------------------+
                             |
                             v
    +------------------------+---------------------+
    |          POSTGRES (Neon + pgvector)           |
    |  tenants | pages | facts | edges | chunks    |
    |  RLS tenant isolation | temporal versioning   |
    +--------+----------------+--------------------+
             |                |
    +--------+------+  +------+--------+  +--------+------+
    |   API SERVER  |  |  MCP SERVER   |  | DREAM WORKER  |
    |  Hono on Bun  |  | 7 memory verbs|  | 8 phases      |
    |  port 4000    |  | port 4001     |  | overnight     |
    +-------+-------+  +-------+-------+  +---------------+
            |                  |
    +-------+------------------+-------+
    |          WEB UI (Next.js)        |
    |  Search | Timeline | Entities    |
    |  Dashboard | Integrations        |
    +----------------------------------+
```

## Project Structure

```
cortex/
+-- apps/
|   +-- api/              Hono API server + MCP server (Bun)
|   +-- web/              Next.js 15 frontend
|   +-- worker/           Dream cycle + ingestion workers
+-- packages/
|   +-- db/               Drizzle schema, migrations, connection
|   +-- engine/           Search pipeline, facts engine, knowledge graph
|   +-- billing/          Stripe integration, plan enforcement
|   +-- connectors/       Source connectors (Slack, file upload)
|   +-- shared/           Types, writeback gate, chunking, hashing
+-- scripts/              Deploy and setup scripts
+-- docker-compose.yml    Local development (Postgres + pgvector)
```

## Deployment

### Infrastructure

| Service | Platform | Notes |
|---------|----------|-------|
| API + MCP | Fly.io | Always-on, health check at `/health` |
| Worker | Fly.io | Scales to zero when idle |
| Web UI | Vercel | Auto-deploy from GitHub |
| Database | Neon | Serverless Postgres + pgvector |

### Deploy Commands

```bash
# API server to Fly.io
./scripts/deploy-api.sh

# Worker to Fly.io
./scripts/deploy-worker.sh

# Web UI to Vercel
./scripts/deploy-web.sh            # preview
./scripts/deploy-web.sh --prod     # production

# Database migrations
DATABASE_URL=postgres://...@neon.tech/cortex ./scripts/migrate.sh
```

### Neon Database Setup

1. Create a Neon project at [neon.tech](https://neon.tech)
2. Enable the `vector`, `pg_trgm`, and `uuid-ossp` extensions
3. Copy the pooled connection string for the API server (`DATABASE_URL`)
4. Copy the direct connection string for workers (`DATABASE_URL_UNPOOLED`)
5. Run migrations: `DATABASE_URL=<pooled-url> ./scripts/migrate.sh`

Connection string format:
```
postgres://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/cortex?sslmode=require
```

### Fly.io Secrets

Set secrets for the API and worker apps:

```bash
fly secrets set \
  DATABASE_URL="postgres://..." \
  CLERK_SECRET_KEY="sk_live_..." \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  VOYAGE_API_KEY="pa-..." \
  ANTHROPIC_API_KEY="sk-ant-..." \
  SLACK_CLIENT_ID="..." \
  SLACK_CLIENT_SECRET="..." \
  SLACK_SIGNING_SECRET="..." \
  -a cortex-api
```

## Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | API, Worker | Postgres connection string (pooled for API) |
| `DATABASE_URL_UNPOOLED` | Worker | Direct Postgres connection for long-running jobs |
| `API_PORT` | API | HTTP port for the API server (default: 4000) |
| `MCP_PORT` | API | Port for the MCP server (default: 4001) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Web | Clerk publishable key |
| `CLERK_SECRET_KEY` | API | Clerk secret key for JWT verification |
| `STRIPE_SECRET_KEY` | API | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | API | Stripe webhook signing secret |
| `STRIPE_PRICE_TEAM` | API | Stripe Price ID for Team plan |
| `STRIPE_PRICE_BUSINESS` | API | Stripe Price ID for Business plan |
| `SLACK_CLIENT_ID` | API | Slack app OAuth client ID |
| `SLACK_CLIENT_SECRET` | API | Slack app OAuth client secret |
| `SLACK_SIGNING_SECRET` | API | Slack request signing secret |
| `VOYAGE_API_KEY` | API, Worker | Voyage AI key for embeddings |
| `ANTHROPIC_API_KEY` | API, Worker | Anthropic key for extraction/synthesis |
| `R2_ACCESS_KEY_ID` | API | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | API | Cloudflare R2 secret key |
| `R2_BUCKET` | API | R2 bucket name |
| `R2_ENDPOINT` | API | R2 endpoint URL |
| `NEXT_PUBLIC_API_URL` | Web | API server URL for the frontend |
| `NEXT_PUBLIC_WEB_URL` | API | Web UI URL (for OAuth redirects) |

## API Endpoints

### Search and Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/search` | Hybrid search (keyword + vector + RRF) |
| POST | `/api/v1/facts` | Create a fact (remember) |
| GET | `/api/v1/facts/:entitySlug` | Recall facts for an entity |
| POST | `/api/v1/facts/:factId/forget` | Expire a fact (forget) |
| GET | `/api/v1/entities/:slug` | Entity card with compiled truth |
| GET | `/api/v1/timeline/:entitySlug` | Temporal view of an entity |
| POST | `/api/v1/ingest` | Manual content ingestion |
| GET | `/api/v1/delta?since=ISO8601` | Changes since timestamp |

### Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/billing/checkout` | Create Stripe checkout session |
| POST | `/api/v1/billing/webhook` | Stripe webhook handler |
| GET | `/api/v1/billing/status` | Current plan and usage |

### Slack Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/integrations/slack/authorize` | Start Slack OAuth flow |
| GET | `/api/v1/integrations/slack/callback` | OAuth callback |
| POST | `/api/v1/integrations/slack/channels` | List or subscribe channels |
| POST | `/api/v1/integrations/slack/sync` | Trigger manual sync |

All API routes (except `/health` and webhooks) require authentication via Clerk JWT or API key, plus `X-Tenant-Id` header.

### Billing Plans

| | Free | Team ($12/user/mo) | Business ($25/user/mo) |
|---|---|---|---|
| Users | 5 | 50 | Unlimited |
| Sources | 2 | Unlimited | Unlimited |
| Dream cycle | Weekly | Nightly | Nightly + on-demand |
| Search modes | Quick | Quick, Standard | Quick, Standard, Deep |

## MCP Server

The MCP server runs alongside the API server on port 4001, exposing 7 memory verbs for AI agent consumption:

| Verb | Description |
|------|-------------|
| `recall` | Retrieve facts by entity, kind, recency |
| `remember` | Save a fact with provenance |
| `entity` | Get compiled entity card |
| `synthesize` | Ask a question, get answer with citations |
| `forget` | Expire or supersede a fact |
| `timeline` | Temporal evolution of an entity |
| `delta` | What changed since timestamp T |

### Local Setup (stdio transport)

For local agents like Claude Code or Codex, configure the MCP client to connect to the HTTP server:

```json
{
  "mcpServers": {
    "cortex": {
      "url": "http://localhost:4001/mcp"
    }
  }
}
```

### Remote Setup (HTTP transport)

For remote agents, connect to the hosted MCP server with an API key:

```json
{
  "mcpServers": {
    "cortex": {
      "url": "https://cortex-api.fly.dev:4001/mcp",
      "headers": {
        "Authorization": "Bearer ctx_your_api_key"
      }
    }
  }
}
```

## Tech Stack

- **Runtime:** Bun
- **API Framework:** Hono
- **Database:** Postgres 16 + pgvector (Neon serverless)
- **ORM:** Drizzle
- **Frontend:** Next.js 15
- **Auth:** Clerk
- **Billing:** Stripe
- **Embeddings:** Voyage AI (voyage-3, 1536 dim)
- **LLM:** Claude (Haiku for extraction, Sonnet for synthesis)
- **Deployment:** Fly.io (API/Worker), Vercel (Web), Neon (DB)
