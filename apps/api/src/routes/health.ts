import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb } from "@cortex/db";

export const healthRoute = new Hono();

healthRoute.get("/health", async (c) => {
  let dbStatus = "unknown";
  let dbLatencyMs = -1;

  try {
    const db = createDb();
    const start = Date.now();
    await db.execute(sql`SELECT 1 as health_check`);
    dbLatencyMs = Date.now() - start;
    dbStatus = "connected";
  } catch (err) {
    dbStatus = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  const healthy = dbStatus === "connected";

  return c.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "cortex-api",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
    healthy ? 200 : 503
  );
});
