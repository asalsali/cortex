import { sql } from "drizzle-orm";
import { STALE_ENTITY_DAYS } from "@cortex/shared";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * HEALTH phase: Compute freshness scores, flag stale entities,
 * compute change velocity. No LLM usage.
 */
export async function healthPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  // Compute freshness: last fact date per entity
  const freshnessResult = await ctx.db.execute(sql`
    UPDATE pages p
    SET frontmatter = frontmatter
      || jsonb_build_object(
           'freshness_score', COALESCE(
             1.0 - EXTRACT(EPOCH FROM (now() - latest.max_valid_from)) / (${STALE_ENTITY_DAYS} * 86400),
             0
           ),
           'last_fact_at', latest.max_valid_from,
           'stale', latest.max_valid_from < now() - interval '${sql.raw(String(STALE_ENTITY_DAYS))} days'
         ),
        updated_at = now()
    FROM (
      SELECT entity_slug, max(valid_from) as max_valid_from
      FROM facts
      WHERE tenant_id = ${ctx.tenantId}::uuid AND valid_until IS NULL
      GROUP BY entity_slug
    ) latest
    WHERE p.tenant_id = ${ctx.tenantId}::uuid
      AND p.slug = latest.entity_slug
    RETURNING p.id
  `);

  const updated = freshnessResult.rows ?? (freshnessResult as any);

  // Compute change velocity: supersessions per entity in rolling 30-day window
  await ctx.db.execute(sql`
    UPDATE pages p
    SET frontmatter = frontmatter
      || jsonb_build_object(
           'change_velocity', COALESCE(vel.velocity, 0)
         )
    FROM (
      SELECT entity_slug,
             count(*) FILTER (WHERE superseded_by IS NOT NULL)::float
             / GREATEST(count(*), 1) as velocity
      FROM facts
      WHERE tenant_id = ${ctx.tenantId}::uuid
        AND created_at > now() - interval '30 days'
      GROUP BY entity_slug
    ) vel
    WHERE p.tenant_id = ${ctx.tenantId}::uuid
      AND p.slug = vel.entity_slug
  `);

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed: updated.length,
    errors,
  };
}
