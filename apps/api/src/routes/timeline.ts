import { Hono } from "hono";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { schema } from "@cortex/db";
import type { AppEnv } from "../index";

export const timelineRoutes = new Hono<AppEnv>();

/**
 * GET /api/v1/timeline -- Get global timeline across all entities.
 */
timelineRoutes.get("/timeline", async (c) => {
  const tenantId = c.get("tenantId");
  const db = c.get("db")!;

  const from = c.req.query("from");
  const to = c.req.query("to");
  const kind = c.req.query("kind");

  const conditions = [eq(schema.facts.tenantId, tenantId)];
  if (from) conditions.push(gte(schema.facts.validFrom, new Date(from)));
  if (to) conditions.push(lte(schema.facts.validFrom, new Date(to)));
  if (kind) conditions.push(eq(schema.facts.kind, kind));

  const rows = await db
    .select({
      id: schema.facts.id,
      entitySlug: schema.facts.entitySlug,
      content: schema.facts.content,
      kind: schema.facts.kind,
      validFrom: schema.facts.validFrom,
      validUntil: schema.facts.validUntil,
      sourceType: schema.facts.sourceType,
      sourceRef: schema.facts.sourceRef,
      sourceAuthorId: schema.facts.sourceAuthorId,
      supersededBy: schema.facts.supersededBy,
      supersessionReason: schema.facts.supersessionReason,
    })
    .from(schema.facts)
    .where(and(...conditions))
    .orderBy(desc(schema.facts.validFrom))
    .limit(100);

  // Look up entity titles from pages table
  const slugs = [...new Set(rows.map((r) => r.entitySlug))];
  const pageRows = slugs.length > 0
    ? await db
        .select({ slug: schema.pages.slug, title: schema.pages.title, type: schema.pages.type })
        .from(schema.pages)
        .where(and(
          eq(schema.pages.tenantId, tenantId),
          eq(schema.pages.type, "entity")
        ))
    : [];

  const pageMap = new Map(pageRows.map((p) => [p.slug, p]));

  const events = rows.map((r) => {
    const page = pageMap.get(r.entitySlug);
    return {
      factId: r.id,
      content: r.content,
      kind: r.kind,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      sourceType: r.sourceType,
      sourceRef: r.sourceRef,
      sourceAuthor: r.sourceAuthorId,
      supersededBy: r.supersededBy,
      supersessionReason: r.supersessionReason,
      entitySlug: r.entitySlug,
      entityTitle: page?.title ?? r.entitySlug,
      entityType: page?.type ?? "entity",
    };
  });

  return c.json({ events });
});

/**
 * GET /api/v1/timeline/:entitySlug -- Get temporal view of an entity.
 */
timelineRoutes.get("/timeline/:entitySlug", async (c) => {
  const entitySlug = c.req.param("entitySlug");
  const tenantId = c.get("tenantId");
  const factsEngine = c.get("facts");

  const from = c.req.query("from");
  const to = c.req.query("to");
  const kindsStr = c.req.query("kinds");
  const kinds = kindsStr ? kindsStr.split(",") : undefined;

  const result = await factsEngine.timeline(tenantId, entitySlug, {
    from: from ?? undefined,
    to: to ?? undefined,
    kinds,
  });

  return c.json({
    entitySlug,
    ...result,
  });
});
