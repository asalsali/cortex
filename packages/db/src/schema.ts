import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  real,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Tenants ─────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Users ───────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").unique(),
    email: text("email").notNull(),
    name: text("name"),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantEmailUnique: uniqueIndex("users_tenant_email_unique").on(table.tenantId, table.email),
  })
);

// ─── Pages ───────────────────────────────────────────────────────

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    type: text("type").notNull().default("document"),
    title: text("title").notNull(),
    compiledTruth: text("compiled_truth"),
    rawContent: text("raw_content"),
    frontmatter: jsonb("frontmatter").notNull().default({}),
    sourceType: text("source_type"),
    sourceRef: text("source_ref"),
    sourceAuthorId: uuid("source_author_id").references(() => users.id),
    contentHash: text("content_hash"),
    extractedBy: text("extracted_by").default("llm"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantSlugUnique: uniqueIndex("pages_tenant_slug_unique").on(table.tenantId, table.slug),
    tenantIdx: index("idx_pages_tenant").on(table.tenantId),
    contentHashIdx: index("idx_pages_content_hash").on(table.tenantId, table.contentHash),
  })
);

// ─── Content Chunks ──────────────────────────────────────────────

export const contentChunks = pgTable(
  "content_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    chunkText: text("chunk_text").notNull(),
    chunkSource: text("chunk_source").notNull().default("content"),
    // embedding is vector(1536) -- handled via raw SQL in migrations
    embeddedAt: timestamp("embedded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index("idx_chunks_tenant").on(table.tenantId),
  })
);

// ─── Facts ───────────────────────────────────────────────────────

export const facts = pgTable(
  "facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    entitySlug: text("entity_slug").notNull(),
    content: text("content").notNull(),
    kind: text("kind").notNull(),
    confidence: real("confidence").notNull().default(1.0),
    visibility: text("visibility").notNull().default("public"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    sourceType: text("source_type"),
    sourceRef: text("source_ref"),
    sourceAuthorId: uuid("source_author_id").references(() => users.id),
    extractedBy: text("extracted_by").notNull().default("llm"),
    supersededBy: uuid("superseded_by"),
    supersessionReason: text("supersession_reason"),
    consolidatedInto: uuid("consolidated_into").references(() => pages.id),
    consolidatedAt: timestamp("consolidated_at", { withTimezone: true }),
    contentHash: text("content_hash"),
    // embedding is vector(1536) -- handled via raw SQL
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index("idx_facts_tenant").on(table.tenantId),
    entityCurrentIdx: index("idx_facts_entity_current").on(
      table.tenantId,
      table.entitySlug
    ),
    contentHashIdx: index("idx_facts_content_hash").on(table.tenantId, table.contentHash),
  })
);

// ─── Edges ───────────────────────────────────────────────────────

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    fromPageId: uuid("from_page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    toPageId: uuid("to_page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
    edgeType: text("edge_type").notNull(),
    edgeSource: text("edge_source").notNull().default("extracted"),
    weight: real("weight").notNull().default(1.0),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueEdge: uniqueIndex("edges_unique").on(
      table.tenantId,
      table.fromPageId,
      table.toPageId,
      table.edgeType
    ),
    tenantIdx: index("idx_edges_tenant").on(table.tenantId),
    fromIdx: index("idx_edges_from").on(table.tenantId, table.fromPageId),
    toIdx: index("idx_edges_to").on(table.tenantId, table.toPageId),
  })
);

// ─── Integrations ────────────────────────────────────────────────

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    config: jsonb("config").notNull().default({}),
    status: text("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index("idx_integrations_tenant").on(table.tenantId),
  })
);

// ─── Dream Runs ──────────────────────────────────────────────────

export const dreamRuns = pgTable(
  "dream_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: text("status").notNull().default("running"),
    phases: jsonb("phases").notNull().default({}),
    summary: text("summary"),
    factsCreated: integer("facts_created").notNull().default(0),
    factsSuperseded: integer("facts_superseded").notNull().default(0),
    edgesCreated: integer("edges_created").notNull().default(0),
    pagesUpdated: integer("pages_updated").notNull().default(0),
    llmCostUsd: real("llm_cost_usd").notNull().default(0.0),
    errors: jsonb("errors").notNull().default([]),
  },
  (table) => ({
    tenantIdx: index("idx_dream_runs_tenant").on(table.tenantId),
  })
);

// ─── Job Queue ───────────────────────────────────────────────────

export const jobQueue = pgTable(
  "job_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    queue: text("queue").notNull(),
    jobType: text("job_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: text("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    lockedBy: text("locked_by"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    queueStatusIdx: index("idx_jobs_queue_status").on(table.queue, table.status, table.scheduledAt),
  })
);

// ─── API Keys ────────────────────────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  name: text("name").notNull().default("Default"),
  scopes: text("scopes").array().notNull().default(sql`'{read}'`),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
