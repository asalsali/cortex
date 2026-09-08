import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { schema } from "@cortex/db";
import type { AppEnv } from "../index";

export const integrationsRoutes = new Hono<AppEnv>();

/**
 * GET /api/v1/integrations -- List integrations for the tenant.
 */
integrationsRoutes.get("/integrations", async (c) => {
  const tenantId = c.get("tenantId");
  const db = c.get("db")!;

  const rows = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.tenantId, tenantId));

  return c.json(rows);
});
