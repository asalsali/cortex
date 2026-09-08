import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../index";

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
  mode: z.enum(["quick", "standard", "deep"]).optional(),
  tokenBudget: z.number().int().positive().optional(),
  filters: z
    .object({
      kinds: z.array(z.string()).optional(),
      since: z.string().optional(),
      entitySlug: z.string().optional(),
      sourceTypes: z.array(z.string()).optional(),
    })
    .optional(),
});

export const searchRoutes = new Hono<AppEnv>();

searchRoutes.post("/search", async (c) => {
  const body = await c.req.json();
  const parsed = searchSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const tenantId = c.get("tenantId");
  const search = c.get("search");

  const result = await search.search({
    tenantId,
    query: parsed.data.query,
    mode: parsed.data.mode,
    tokenBudget: parsed.data.tokenBudget,
    filters: parsed.data.filters as any,
  });

  return c.json(result);
});
