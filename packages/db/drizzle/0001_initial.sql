-- Cortex Initial Schema
-- Generated from architecture spec v0.1

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tenants
CREATE TABLE tenants (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  plan            text NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'team', 'business')),
  stripe_customer_id   text,
  stripe_subscription_id text,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Users
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_user_id   text UNIQUE,
  email           text NOT NULL,
  name            text,
  role            text NOT NULL DEFAULT 'member'
                    CHECK (role IN ('admin', 'member', 'viewer', 'agent')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- Pages
CREATE TABLE pages (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  type            text NOT NULL DEFAULT 'document'
                    CHECK (type IN ('entity', 'document', 'decision', 'transcript')),
  title           text NOT NULL,
  compiled_truth  text,
  raw_content     text,
  frontmatter     jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_type     text CHECK (source_type IN ('slack', 'notion', 'git', 'manual', 'agent', 'meeting', 'google_docs')),
  source_ref      text,
  source_author_id uuid REFERENCES users(id),
  content_hash    text,
  extracted_by    text DEFAULT 'llm'
                    CHECK (extracted_by IN ('human', 'llm', 'connector')),
  created_by      uuid REFERENCES users(id),
  updated_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

-- Content Chunks
CREATE TABLE content_chunks (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id         uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chunk_index     int NOT NULL,
  chunk_text      text NOT NULL,
  chunk_source    text NOT NULL DEFAULT 'content'
                    CHECK (chunk_source IN ('content', 'compiled_truth')),
  embedding       vector(1536),
  embedded_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Facts
CREATE TABLE facts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_slug     text NOT NULL,
  content         text NOT NULL,
  kind            text NOT NULL
                    CHECK (kind IN ('decision', 'architecture', 'process',
                                    'policy', 'context', 'event')),
  confidence      float NOT NULL DEFAULT 1.0
                    CHECK (confidence >= 0.0 AND confidence <= 1.0),
  visibility      text NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'team', 'private')),
  valid_from      timestamptz NOT NULL DEFAULT now(),
  valid_until     timestamptz,
  source_type     text CHECK (source_type IN ('slack', 'notion', 'git', 'manual', 'agent', 'meeting', 'google_docs')),
  source_ref      text,
  source_author_id uuid REFERENCES users(id),
  extracted_by    text NOT NULL DEFAULT 'llm'
                    CHECK (extracted_by IN ('human', 'llm', 'connector', 'agent')),
  superseded_by   uuid REFERENCES facts(id),
  supersession_reason text,
  consolidated_into uuid REFERENCES pages(id),
  consolidated_at timestamptz,
  embedding       vector(1536),
  content_hash    text,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Edges
CREATE TABLE edges (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_page_id    uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  to_page_id      uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  edge_type       text NOT NULL
                    CHECK (edge_type IN ('owns', 'maintains', 'depends_on',
                                         'supersedes', 'relates_to', 'authored')),
  edge_source     text NOT NULL DEFAULT 'extracted'
                    CHECK (edge_source IN ('extracted', 'manual', 'connector')),
  weight          float NOT NULL DEFAULT 1.0,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, from_page_id, to_page_id, edge_type)
);

-- Integrations
CREATE TABLE integrations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type     text NOT NULL
                    CHECK (source_type IN ('slack', 'notion', 'google_docs',
                                           'git', 'confluence', 'linear', 'jira')),
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'error', 'disconnected')),
  last_sync_at    timestamptz,
  last_error      text,
  created_by      uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Dream Runs
CREATE TABLE dream_runs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  status          text NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  phases          jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary         text,
  facts_created   int NOT NULL DEFAULT 0,
  facts_superseded int NOT NULL DEFAULT 0,
  edges_created   int NOT NULL DEFAULT 0,
  pages_updated   int NOT NULL DEFAULT 0,
  llm_cost_usd    float NOT NULL DEFAULT 0.0,
  errors          jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Job Queue
CREATE TABLE job_queue (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE,
  queue           text NOT NULL,
  job_type        text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  priority        int NOT NULL DEFAULT 0,
  attempts        int NOT NULL DEFAULT 0,
  max_attempts    int NOT NULL DEFAULT 3,
  last_error      text,
  locked_by       text,
  locked_at       timestamptz,
  scheduled_at    timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- API Keys
CREATE TABLE api_keys (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_prefix      text NOT NULL,
  key_hash        text NOT NULL,
  name            text NOT NULL DEFAULT 'Default',
  scopes          text[] NOT NULL DEFAULT '{read}',
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes

-- Vector search (HNSW)
CREATE INDEX idx_chunks_embedding ON content_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_facts_embedding ON facts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Full-text search
CREATE INDEX idx_pages_fts ON pages
  USING gin (to_tsvector('english',
    coalesce(title, '') || ' ' || coalesce(raw_content, '')));

CREATE INDEX idx_facts_fts ON facts
  USING gin (to_tsvector('english', content));

-- Trigram fuzzy matching
CREATE INDEX idx_pages_title_trgm ON pages
  USING gin (title gin_trgm_ops);

-- JSONB
CREATE INDEX idx_pages_frontmatter ON pages
  USING gin (frontmatter jsonb_path_ops);

-- Tenant-scoped lookups
CREATE INDEX idx_pages_tenant ON pages (tenant_id);
CREATE INDEX idx_facts_tenant ON facts (tenant_id);
CREATE INDEX idx_chunks_tenant ON content_chunks (tenant_id);
CREATE INDEX idx_edges_tenant ON edges (tenant_id);
CREATE INDEX idx_integrations_tenant ON integrations (tenant_id);
CREATE INDEX idx_dream_runs_tenant ON dream_runs (tenant_id);
CREATE INDEX idx_jobs_queue_status ON job_queue (queue, status, scheduled_at)
  WHERE status = 'pending';

-- Temporal queries
CREATE INDEX idx_facts_entity_current ON facts (tenant_id, entity_slug, valid_from DESC)
  WHERE valid_until IS NULL;

CREATE INDEX idx_facts_entity_history ON facts (tenant_id, entity_slug, valid_from ASC);

CREATE INDEX idx_facts_supersession ON facts (superseded_by)
  WHERE superseded_by IS NOT NULL;

-- Content dedup
CREATE INDEX idx_pages_content_hash ON pages (tenant_id, content_hash)
  WHERE content_hash IS NOT NULL;

CREATE INDEX idx_facts_content_hash ON facts (tenant_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Graph traversal
CREATE INDEX idx_edges_from ON edges (tenant_id, from_page_id);
CREATE INDEX idx_edges_to ON edges (tenant_id, to_page_id);
