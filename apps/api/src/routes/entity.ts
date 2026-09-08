import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { schema } from "@cortex/db";
import type { AppEnv } from "../index";

export const entityRoutes = new Hono<AppEnv>();

/**
 * GET /api/v1/entities -- List all entities (pages of type 'entity').
 */
entityRoutes.get("/entities", async (c) => {
  const tenantId = c.get("tenantId");
  const db = c.get("db")!;

  // Get all entity pages with fact counts
  const entityPages = await db
    .select({
      slug: schema.pages.slug,
      title: schema.pages.title,
      type: schema.pages.type,
      compiledTruth: schema.pages.compiledTruth,
      updatedAt: schema.pages.updatedAt,
    })
    .from(schema.pages)
    .where(
      and(
        eq(schema.pages.tenantId, tenantId),
        eq(schema.pages.type, "entity")
      )
    )
    .orderBy(schema.pages.title);

  // Get fact counts per entity slug
  const factCounts = await db
    .select({
      entitySlug: schema.facts.entitySlug,
      total: sql<number>`count(*)::int`,
      current: sql<number>`count(*) filter (where ${schema.facts.validUntil} is null)::int`,
      superseded: sql<number>`count(*) filter (where ${schema.facts.validUntil} is not null)::int`,
    })
    .from(schema.facts)
    .where(eq(schema.facts.tenantId, tenantId))
    .groupBy(schema.facts.entitySlug);

  const countMap = new Map(factCounts.map((fc) => [fc.entitySlug, fc]));

  const result = entityPages.map((p) => {
    const counts = countMap.get(p.slug);
    return {
      slug: p.slug,
      title: p.title,
      type: p.type,
      compiledTruth: p.compiledTruth,
      currentFactCount: counts?.current ?? 0,
      totalFactCount: counts?.total ?? 0,
      supersededCount: counts?.superseded ?? 0,
      lastUpdated: p.updatedAt,
      neighborSlugs: [] as string[],
    };
  });

  return c.json(result);
});

/**
 * GET /api/v1/entities/:slug -- Get entity card.
 */
entityRoutes.get("/entities/:slug", async (c) => {
  const slug = c.req.param("slug");
  const tenantId = c.get("tenantId");
  const graph = c.get("graph");

  const card = await graph.entityCard(tenantId, slug);

  if (!card) {
    return c.json({ error: "Entity not found" }, 404);
  }

  return c.json(card);
});

/**
 * GET /api/v1/entities/:slug/graph -- Get entity subgraph.
 */
entityRoutes.get("/entities/:slug/graph", async (c) => {
  const slug = c.req.param("slug");
  const depth = parseInt(c.req.query("depth") ?? "2");
  const tenantId = c.get("tenantId");
  const graph = c.get("graph");
  const db = c.get("db")!;

  // Look up page ID from slug
  const [page] = await db
    .select({ id: schema.pages.id })
    .from(schema.pages)
    .where(and(eq(schema.pages.tenantId, tenantId), eq(schema.pages.slug, slug)));

  if (!page) {
    return c.json({ error: "Entity not found" }, 404);
  }

  const result = await graph.traverse(tenantId, page.id, { maxDepth: depth });
  return c.json(result);
});
