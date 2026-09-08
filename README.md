# Cortex

The company brain that remembers how you got here.

Cortex is a living company knowledge base that serves humans and AI agents equally. It ingests knowledge from across the organization, builds a temporal knowledge graph showing how facts evolve, and consolidates overnight so the team always wakes up to a coherent picture.

## Architecture

```
cortex/
├── apps/
│   ├── api/          # Hono API server (Bun) + MCP server
│   ├── web/          # Next.js web UI
│   └── worker/       # Dream cycle + ingestion workers
├── packages/
│   ├── db/           # Drizzle schema, migrations, connection
│   ├── engine/       # Core brain (search, facts, graph)
│   ├── connectors/   # Source connector interface + Slack
│   └── shared/       # Types, constants, writeback gate
├── docker-compose.yml
└── package.json
```

## Tech Stack

- **Runtime:** Bun
- **API:** Hono
- **Database:** Postgres 16 + pgvector (Neon for prod, local for dev)
- **ORM:** Drizzle
- **Frontend:** Next.js 15
- **Agent Interface:** MCP server (7 memory verbs)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.1
- [Docker](https://www.docker.com/) (for local Postgres)

### 1. Start the database

```bash
docker compose up -d postgres
```

This starts Postgres 16 with pgvector. The initial migration at `packages/db/drizzle/0001_initial.sql` runs automatically.

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment

```bash
cp .env.example .env
# Edit .env with your database URL (default works with docker compose)
```

### 4. Run the API server

```bash
bun run dev:api
```

The API server starts on port 3001 with these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/v1/search | Search the knowledge base |
| POST | /api/v1/facts | Create a fact (remember) |
| GET | /api/v1/facts/:entitySlug | Recall facts for an entity |
| POST | /api/v1/facts/:factId/forget | Expire a fact |
| GET | /api/v1/entities/:slug | Entity card (compiled truth + facts + graph) |
| GET | /api/v1/timeline/:entitySlug | Temporal view of an entity |
| POST | /api/v1/ingest | Manual content upload |
| GET | /api/v1/delta?since=ISO8601 | Changes since timestamp |

All API routes require `X-Tenant-Id` header.

### 5. Run the MCP server

The MCP server starts automatically alongside the API server on port 3002, exposing 7 memory verbs:

- **recall** -- retrieve facts by entity, kind, recency
- **remember** -- save a fact with provenance
- **entity** -- get compiled entity card
- **synthesize** -- ask a question, get an answer with citations
- **forget** -- expire or supersede a fact
- **timeline** -- temporal evolution of an entity
- **delta** -- what changed since timestamp T

### 6. Run the worker

```bash
bun run dev:worker
```

The worker runs the job queue consumer (SKIP LOCKED pattern) and the dream cycle scheduler.

### 7. Run the web UI

```bash
bun run dev:web
```

Next.js dev server on port 3000.

## Core Concepts

### Temporal Knowledge Model

Every fact in Cortex is immutable. Updates create new facts that supersede the old. This creates supersession chains that answer "why did we change from X to Y?"

### Ambient Writeback Gate

A deterministic zero-LLM pre-filter catches noise before any LLM processing. Messages like "thanks", "ok", slash commands, and operational chatter are filtered. 7 rules:

1. Empty content
2. Too short (< 3 chars)
3. Ack or greeting ("thanks", "ok", "hey")
4. Slash commands (/remind, /poll)
5. Question-only ("???")
6. Quoted or tool output
7. Bulk paste (large code blocks without commentary)

### Search Pipeline

12-stage hybrid search: intent classification, parallel keyword + vector search, RRF fusion (k=60), compiled truth boost, cosine re-score, floor-ratio gate, metadata boosts (recency, graph adjacency, cross-source, title phrase, confidence), reranker, autocut, token budget enforcement, evidence stamping.

### Dream Cycle

8 overnight phases per tenant: sync, extract, embed, consolidate, drift (weekly), orphans, health, notify.
