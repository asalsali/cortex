import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { schema } from "@cortex/db";
import type { AppEnv } from "../index";

export const dreamRunsRoutes = new Hono<AppEnv>();

/**
 * GET /api/v1/dream-runs -- List dream cycle runs for the tenant.
 */
dreamRunsRoutes.get("/dream-runs", async (c) => {
  const tenantId = c.get("tenantId");
  const db = c.get("db")!;

  const rows = await db
    .select()
    .from(schema.dreamRuns)
    .where(eq(schema.dreamRuns.tenantId, tenantId))
    .orderBy(desc(schema.dreamRuns.startedAt))
    .limit(20);

  return c.json(rows);
});
