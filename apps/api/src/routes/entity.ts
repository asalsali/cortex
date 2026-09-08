import { Hono } from "hono";
import type { AppEnv } from "../index";

export const entityRoutes = new Hono<AppEnv>();

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
  const db = c.get("db");

  // Look up page ID from slug
  const { schema } = await import("@cortex/db");
  const { eq, and } = await import("drizzle-orm");
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
