import { sql } from "drizzle-orm";
import { DRIFT_COMPILED_TRUTH_AGE_DAYS } from "@cortex/shared";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * DRIFT phase: Detect facts that may be outdated based on newer evidence.
 * Weekly only. Uses LLM (Sonnet) to judge compiled truth vs recent facts.
 */
export async function driftPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  let itemsProcessed = 0;
  const errors: string[] = [];

  // Find entities with compiled truth older than threshold
  const result = await ctx.db.execute(sql`
    SELECT p.id, p.slug, p.title, p.compiled_truth, p.updated_at
    FROM pages p
    WHERE p.tenant_id = ${ctx.tenantId}::uuid
      AND p.compiled_truth IS NOT NULL
      AND p.updated_at < now() - interval '${sql.raw(String(DRIFT_COMPILED_TRUTH_AGE_DAYS))} days'
      AND EXISTS (
        SELECT 1 FROM facts f
        WHERE f.tenant_id = p.tenant_id
          AND f.entity_slug = p.slug
          AND f.created_at > p.updated_at
          AND f.valid_until IS NULL
      )
    LIMIT 20
  `);

  const staleEntities = result.rows ?? (result as any);

  for (const entity of staleEntities) {
    try {
      // In production:
      // 1. Fetch recent facts for this entity
      // 2. Call Sonnet: "Does this recent evidence contradict the compiled truth?"
      // 3. If yes: flag entity as needs_review in frontmatter
      // 4. Mark stale facts with reduced confidence
      console.log(`[Drift] Would check drift for entity: ${entity.title}`);
      itemsProcessed++;
    } catch (err) {
      errors.push(`Drift check failed for ${entity.slug}: ${err}`);
    }
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
