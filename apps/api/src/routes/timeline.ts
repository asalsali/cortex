import { Hono } from "hono";
import type { AppEnv } from "../index";

export const timelineRoutes = new Hono<AppEnv>();

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
