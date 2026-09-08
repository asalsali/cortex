/**
 * Seed script for Cortex development database.
 * Creates a demo tenant, users, pages, facts, and graph edges.
 *
 * Usage: bun run scripts/seed.ts
 */

import { createDb, schema } from "@cortex/db";
import { contentHash } from "@cortex/shared";
import { eq, and } from "drizzle-orm";

const db = createDb(
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/cortex"
);

async function seed() {
  console.log("Seeding Cortex database...\n");

  // ─── Tenant ─────────────────────────────────────────────────────
  console.log("Creating tenant: Meridian...");
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: "Meridian",
      slug: "meridian",
      plan: "team",
      settings: {
        timezone: "America/New_York",
        dream_cycle_hour: 3,
        max_sources: 10,
        max_users: 25,
      },
    })
    .onConflictDoNothing()
    .returning();

  if (!tenant) {
    // Tenant already exists, look it up
    const [existing] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, "meridian"));
    if (!existing) {
      throw new Error("Failed to create or find tenant");
    }
    console.log("  Tenant already exists, using existing.\n");
    var tenantId = existing.id;
  } else {
    var tenantId = tenant.id;
  }

  // ─── Users ──────────────────────────────────────────────────────
  console.log("Creating users...");
  const usersData = [
    { email: "sarah.chen@meridian.io", name: "Sarah Chen", role: "admin" as const },
    { email: "james.liu@meridian.io", name: "James Liu", role: "member" as const },
    { email: "alex.kim@meridian.io", name: "Alex Kim", role: "member" as const },
    { email: "priya.patel@meridian.io", name: "Priya Patel", role: "member" as const },
  ];

  const userIds: string[] = [];
  for (const u of usersData) {
    const [user] = await db
      .insert(schema.users)
      .values({ tenantId, ...u })
      .onConflictDoNothing()
      .returning();
    if (user) {
      userIds.push(user.id);
      console.log(`  Created user: ${u.name}`);
    } else {
      const [existing] = await db
        .select()
        .from(schema.users)
        .where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.email, u.email)));
      if (existing) userIds.push(existing.id);
    }
  }
  console.log();

  // ─── Pages (Entity Cards) ──────────────────────────────────────
  console.log("Creating pages...");

  const pagesData = [
    {
      slug: "auth-service",
      type: "entity" as const,
      title: "Auth Service",
      rawContent:
        "The authentication service handles user login, session management, and API key validation. Built with Node.js and Express. Uses JWT tokens with 15-minute expiry and refresh token rotation. Deployed on Kubernetes with 3 replicas for high availability.",
      compiledTruth:
        "Auth Service is the central authentication and authorization system for Meridian. It handles user login via email/password and OAuth (Google, GitHub), manages sessions using JWT with 15-minute expiry and refresh token rotation, and validates API keys for programmatic access. Built with Node.js and Express, deployed on Kubernetes with 3 replicas. The service was migrated from a monolithic architecture in Q1 2025.",
    },
    {
      slug: "data-pipeline",
      type: "entity" as const,
      title: "Data Pipeline",
      rawContent:
        "The main data processing pipeline ingests events from Kafka, transforms them using Apache Beam, and writes results to BigQuery. Handles approximately 2M events per day. The pipeline was recently migrated from batch processing to streaming.",
      compiledTruth:
        "Data Pipeline is Meridian's core data processing infrastructure. It ingests events from Kafka topics, transforms them using Apache Beam (streaming mode, migrated from batch in Q2 2025), and writes results to BigQuery for analytics. Current throughput is approximately 2M events/day. The pipeline team is led by James Liu.",
    },
    {
      slug: "sarah-chen",
      type: "entity" as const,
      title: "Sarah Chen",
      rawContent:
        "Sarah Chen is the engineering lead at Meridian. She oversees the platform team and has been driving the migration from monolith to microservices. Previously at Stripe for 4 years working on payments infrastructure.",
      compiledTruth:
        "Sarah Chen is the Engineering Lead at Meridian, overseeing the platform team. She is driving the monolith-to-microservices migration that began in Q4 2024. Before Meridian, she spent 4 years at Stripe working on payments infrastructure. She champions observability-first development and introduced the company's SLO framework.",
    },
    {
      slug: "james-liu",
      type: "entity" as const,
      title: "James Liu",
      rawContent:
        "James Liu is a senior engineer focused on data infrastructure. He leads the data pipeline team and is responsible for the Kafka-to-BigQuery streaming migration. Background in distributed systems from his time at Databricks.",
    },
    {
      slug: "api-gateway",
      type: "entity" as const,
      title: "API Gateway",
      rawContent:
        "The API Gateway routes all external traffic to internal microservices. Built on Kong, it handles rate limiting, authentication forwarding, and request transformation. Average latency is 12ms at p99.",
    },
    {
      slug: "database-migration",
      type: "decision" as const,
      title: "Database Migration",
      rawContent:
        "Decision to migrate from MongoDB to PostgreSQL for the core data store. Motivated by the need for strong consistency, better tooling, and the ability to use extensions like pgvector for embedding storage. Migration started Q1 2025, expected completion Q3 2025.",
    },
    {
      slug: "kubernetes-cluster",
      type: "entity" as const,
      title: "Kubernetes Cluster",
      rawContent:
        "Production Kubernetes cluster running on GKE. 12 nodes, auto-scaling between 8 and 20. Uses Istio service mesh for inter-service communication. Prometheus + Grafana for monitoring.",
    },
    {
      slug: "alex-kim",
      type: "entity" as const,
      title: "Alex Kim",
      rawContent:
        "Alex Kim is a full-stack engineer working on the web application and developer tooling. She built the internal CLI for deployment automation and maintains the CI/CD pipeline. Joined from Vercel.",
    },
    {
      slug: "notification-system",
      type: "entity" as const,
      title: "Notification System",
      rawContent:
        "Handles email, push, and in-app notifications. Uses a priority queue with retry logic. Integrates with SendGrid for email, Firebase for push. Average delivery latency: 2 seconds for push, 30 seconds for email.",
    },
    {
      slug: "priya-patel",
      type: "entity" as const,
      title: "Priya Patel",
      rawContent:
        "Priya Patel joined as a backend engineer focused on the auth and security domain. She is implementing the new RBAC system and leading the SOC 2 compliance effort. Previously at Okta for 3 years.",
    },
    {
      slug: "search-service",
      type: "entity" as const,
      title: "Search Service",
      rawContent:
        "Full-text search powered by Elasticsearch. Indexes product data, documentation, and internal knowledge base. Recently added vector search capability using Elasticsearch's kNN feature for semantic queries.",
    },
    {
      slug: "ci-cd-pipeline",
      type: "entity" as const,
      title: "CI/CD Pipeline",
      rawContent:
        "Continuous integration and deployment pipeline built on GitHub Actions. Runs tests, linting, security scans, and deploys to staging and production. Average pipeline time: 8 minutes. Maintained by Alex Kim.",
    },
    {
      slug: "observability-stack",
      type: "entity" as const,
      title: "Observability Stack",
      rawContent:
        "Meridian's observability infrastructure: Prometheus for metrics, Grafana for dashboards, Jaeger for distributed tracing, and PagerDuty for alerting. SLO dashboard tracks key service health indicators.",
    },
  ];

  const pageIds: Record<string, string> = {};

  for (const p of pagesData) {
    const hash = contentHash(p.rawContent ?? "");
    const [page] = await db
      .insert(schema.pages)
      .values({
        tenantId,
        slug: p.slug,
        type: p.type,
        title: p.title,
        rawContent: p.rawContent,
        compiledTruth: (p as any).compiledTruth ?? null,
        sourceType: "manual",
        extractedBy: "human",
        contentHash: hash,
        createdBy: userIds[0],
      })
      .onConflictDoNothing()
      .returning();

    if (page) {
      pageIds[p.slug] = page.id;
      console.log(`  Created page: ${p.title}`);
    } else {
      const [existing] = await db
        .select()
        .from(schema.pages)
        .where(and(eq(schema.pages.tenantId, tenantId), eq(schema.pages.slug, p.slug)));
      if (existing) pageIds[p.slug] = existing.id;
    }
  }
  console.log();

  // ─── Facts ─────────────────────────────────────────────────────
  console.log("Creating facts...");

  const factsData = [
    // Auth Service facts
    { entitySlug: "auth-service", content: "Auth Service uses JWT tokens with 15-minute expiry", kind: "architecture", confidence: 1.0 },
    { entitySlug: "auth-service", content: "Auth Service implements refresh token rotation for security", kind: "architecture", confidence: 1.0 },
    { entitySlug: "auth-service", content: "Auth Service was extracted from the monolith in Q1 2025", kind: "event", confidence: 0.9 },
    { entitySlug: "auth-service", content: "Auth Service is deployed on Kubernetes with 3 replicas", kind: "architecture", confidence: 1.0 },

    // Database migration supersession chain: MongoDB -> PostgreSQL -> PostgreSQL 16
    { entitySlug: "database-migration", content: "Primary database is MongoDB Atlas on M30 tier", kind: "architecture", confidence: 1.0, validFrom: "2024-01-15T00:00:00Z" },
    { entitySlug: "database-migration", content: "Decision to migrate from MongoDB to PostgreSQL for strong consistency and pgvector support", kind: "decision", confidence: 1.0, validFrom: "2025-01-10T00:00:00Z" },
    { entitySlug: "database-migration", content: "Migration target upgraded to PostgreSQL 16 for improved JSON and parallel query performance", kind: "decision", confidence: 0.95, validFrom: "2025-03-20T00:00:00Z" },
    { entitySlug: "database-migration", content: "PostgreSQL 16 migration 60% complete, core tables migrated, analytics tables pending", kind: "context", confidence: 0.9, validFrom: "2025-06-01T00:00:00Z" },

    // Data Pipeline facts
    { entitySlug: "data-pipeline", content: "Data Pipeline processes approximately 2M events per day", kind: "context", confidence: 0.9 },
    { entitySlug: "data-pipeline", content: "Data Pipeline migrated from batch to streaming using Apache Beam in Q2 2025", kind: "event", confidence: 1.0 },
    { entitySlug: "data-pipeline", content: "Data Pipeline ingests from Kafka and writes to BigQuery", kind: "architecture", confidence: 1.0 },

    // People facts
    { entitySlug: "sarah-chen", content: "Sarah Chen is the Engineering Lead overseeing the platform team", kind: "context", confidence: 1.0 },
    { entitySlug: "sarah-chen", content: "Sarah Chen introduced the company SLO framework", kind: "event", confidence: 0.9 },
    { entitySlug: "sarah-chen", content: "Sarah Chen previously worked at Stripe for 4 years on payments infrastructure", kind: "context", confidence: 1.0 },
    { entitySlug: "james-liu", content: "James Liu leads the data pipeline team", kind: "context", confidence: 1.0 },
    { entitySlug: "james-liu", content: "James Liu has a background in distributed systems from Databricks", kind: "context", confidence: 0.9 },
    { entitySlug: "alex-kim", content: "Alex Kim built the internal deployment CLI", kind: "event", confidence: 1.0 },
    { entitySlug: "alex-kim", content: "Alex Kim maintains the CI/CD pipeline", kind: "context", confidence: 1.0 },
    { entitySlug: "priya-patel", content: "Priya Patel is implementing the new RBAC system", kind: "process", confidence: 0.95 },
    { entitySlug: "priya-patel", content: "Priya Patel is leading the SOC 2 compliance effort", kind: "process", confidence: 1.0 },

    // System facts
    { entitySlug: "api-gateway", content: "API Gateway built on Kong with 12ms p99 latency", kind: "architecture", confidence: 1.0 },
    { entitySlug: "kubernetes-cluster", content: "Production cluster on GKE with 12 nodes, auto-scaling 8-20", kind: "architecture", confidence: 1.0 },
    { entitySlug: "kubernetes-cluster", content: "Kubernetes cluster uses Istio service mesh for inter-service communication", kind: "architecture", confidence: 1.0 },
    { entitySlug: "notification-system", content: "Notification system delivers push notifications in average 2 seconds", kind: "context", confidence: 0.9 },
    { entitySlug: "search-service", content: "Search service recently added vector search using Elasticsearch kNN", kind: "event", confidence: 1.0 },
    { entitySlug: "ci-cd-pipeline", content: "CI/CD pipeline runs on GitHub Actions with 8-minute average pipeline time", kind: "architecture", confidence: 1.0 },
  ];

  // Track fact IDs for supersession chains
  const factIdsByEntity: Record<string, string[]> = {};

  for (const f of factsData) {
    try {
      const hash = contentHash(f.content);
      const [fact] = await db
        .insert(schema.facts)
        .values({
          tenantId,
          entitySlug: f.entitySlug,
          content: f.content,
          kind: f.kind,
          confidence: f.confidence,
          visibility: "public",
          validFrom: f.validFrom ? new Date(f.validFrom) : new Date(),
          sourceType: "manual",
          extractedBy: "human",
          contentHash: hash,
          createdBy: userIds[0],
        })
        .onConflictDoNothing()
        .returning();

      if (fact) {
        if (!factIdsByEntity[f.entitySlug]) factIdsByEntity[f.entitySlug] = [];
        factIdsByEntity[f.entitySlug].push(fact.id);
        console.log(`  Created fact: [${f.kind}] ${f.content.slice(0, 60)}...`);
      }
    } catch {
      // Skip duplicates
    }
  }

  // Create supersession chain: MongoDB -> PostgreSQL -> PostgreSQL 16
  const dbMigrationFacts = factIdsByEntity["database-migration"] ?? [];
  if (dbMigrationFacts.length >= 3) {
    // MongoDB fact superseded by PostgreSQL decision
    await db
      .update(schema.facts)
      .set({
        validUntil: new Date("2025-01-10T00:00:00Z"),
        supersededBy: dbMigrationFacts[1],
        supersessionReason: "Decision to migrate from MongoDB to PostgreSQL",
      })
      .where(eq(schema.facts.id, dbMigrationFacts[0]));

    // PostgreSQL decision superseded by PostgreSQL 16 upgrade
    await db
      .update(schema.facts)
      .set({
        validUntil: new Date("2025-03-20T00:00:00Z"),
        supersededBy: dbMigrationFacts[2],
        supersessionReason: "Upgraded migration target to PostgreSQL 16",
      })
      .where(eq(schema.facts.id, dbMigrationFacts[1]));

    console.log("  Created supersession chain: MongoDB -> PostgreSQL -> PostgreSQL 16");
  }
  console.log();

  // ─── Knowledge Graph Edges ─────────────────────────────────────
  console.log("Creating graph edges...");

  const edgesData = [
    // People own/maintain systems
    { from: "sarah-chen", to: "auth-service", type: "owns" },
    { from: "james-liu", to: "data-pipeline", type: "owns" },
    { from: "alex-kim", to: "ci-cd-pipeline", type: "maintains" },
    { from: "priya-patel", to: "auth-service", type: "maintains" },

    // System dependencies
    { from: "api-gateway", to: "auth-service", type: "depends_on" },
    { from: "data-pipeline", to: "kubernetes-cluster", type: "depends_on" },
    { from: "auth-service", to: "kubernetes-cluster", type: "depends_on" },
    { from: "notification-system", to: "api-gateway", type: "depends_on" },
    { from: "search-service", to: "data-pipeline", type: "depends_on" },
    { from: "ci-cd-pipeline", to: "kubernetes-cluster", type: "depends_on" },

    // Related
    { from: "database-migration", to: "data-pipeline", type: "relates_to" },
    { from: "observability-stack", to: "kubernetes-cluster", type: "relates_to" },
    { from: "sarah-chen", to: "observability-stack", type: "authored" },
  ];

  for (const e of edgesData) {
    const fromId = pageIds[e.from];
    const toId = pageIds[e.to];
    if (!fromId || !toId) {
      console.log(`  Skipping edge ${e.from} -> ${e.to} (missing page)`);
      continue;
    }

    try {
      await db
        .insert(schema.edges)
        .values({
          tenantId,
          fromPageId: fromId,
          toPageId: toId,
          edgeType: e.type,
          edgeSource: "manual",
          weight: 1.0,
        })
        .onConflictDoNothing();
      console.log(`  Created edge: ${e.from} -[${e.type}]-> ${e.to}`);
    } catch {
      // Skip duplicates
    }
  }

  console.log("\nSeed complete!");
  console.log(`  Tenant: ${tenantId}`);
  console.log(`  Users: ${userIds.length}`);
  console.log(`  Pages: ${Object.keys(pageIds).length}`);
  console.log(`  Facts: ${factsData.length}`);
  console.log(`  Edges: ${edgesData.length}`);
  console.log(`\nUse X-Tenant-Id: ${tenantId} header to query the API.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
