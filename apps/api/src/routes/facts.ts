import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../index";

const createFactSchema = z.object({
  entitySlug: z.string().min(1),
  content: z.string().min(1),
  kind: z.enum(["decision", "architecture", "process", "policy", "context", "event"]),
  confidence: z.number().min(0).max(1).optional(),
  visibility: z.enum(["public", "team", "private"]).optional(),
  validFrom: z.string().optional(),
  sourceType: z.enum(["slack", "notion", "git", "manual", "agent", "meeting", "google_docs"]).optional(),
  sourceRef: z.string().optional(),
  extractedBy: z.enum(["human", "llm", "connector", "agent"]).optional(),
});

const recallSchema = z.object({
  entitySlug: z.string().optional(),
  kind: z.string().optional(),
  since: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

export const factsRoutes = new Hono<AppEnv>();

/**
 * POST /api/v1/facts -- Create a fact (the "remember" verb).
 */
factsRoutes.post("/facts", async (c) => {
  const body = await c.req.json();
  const parsed = createFactSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const tenantId = c.get("tenantId");
  const facts = c.get("facts");
  const result = await facts.create(tenantId, parsed.data);

  return c.json(result, 201);
});

/**
 * GET /api/v1/facts/:entitySlug -- Recall facts for an entity.
 */
factsRoutes.get("/facts/:entitySlug", async (c) => {
  const entitySlug = c.req.param("entitySlug");
  const tenantId = c.get("tenantId");
  const factsEngine = c.get("facts");

  const kind = c.req.query("kind");
  const since = c.req.query("since");
  const limit = c.req.query("limit");

  const result = await factsEngine.recall(tenantId, {
    entitySlug,
    kind: kind ?? undefined,
    since: since ?? undefined,
    limit: limit ? parseInt(limit) : undefined,
  });

  return c.json({ facts: result, total: result.length });
});

/**
 * POST /api/v1/facts/:factId/forget -- Expire a fact.
 */
factsRoutes.post("/facts/:factId/forget", async (c) => {
  const factId = c.req.param("factId");
  const tenantId = c.get("tenantId");
  const factsEngine = c.get("facts");

  const body = await c.req.json().catch(() => ({}));
  const result = await factsEngine.forget(tenantId, factId, body.reason);

  return c.json(result);
});

/**
 * GET /api/v1/delta -- What changed since timestamp.
 */
factsRoutes.get("/delta", async (c) => {
  const since = c.req.query("since");
  if (!since) {
    return c.json({ error: "Missing 'since' query parameter" }, 400);
  }

  const tenantId = c.get("tenantId");
  const factsEngine = c.get("facts");
  const result = await factsEngine.delta(tenantId, since);

  return c.json(result);
});
