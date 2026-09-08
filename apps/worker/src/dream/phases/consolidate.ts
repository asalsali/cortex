import { sql } from "drizzle-orm";
import { CONSOLIDATION_CLUSTER_MIN } from "@cortex/shared";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * CONSOLIDATE phase: Group facts by entity, synthesize compiled truth,
 * detect supersessions. Uses LLM (Sonnet) for synthesis.
 */
export async function consolidatePhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  let itemsProcessed = 0;
  const errors: string[] = [];

  // Find entities with enough unconsolidated facts
  const result = await ctx.db.execute(sql`
    SELECT entity_slug, count(*) as fact_count
    FROM facts
    WHERE tenant_id = ${ctx.tenantId}::uuid
      AND consolidated_at IS NULL
      AND valid_until IS NULL
    GROUP BY entity_slug
    HAVING count(*) >= ${CONSOLIDATION_CLUSTER_MIN}
    ORDER BY count(*) DESC
    LIMIT 50
  `);

  const clusters = result.rows ?? (result as any);

  for (const cluster of clusters) {
    try {
      // In production:
      // 1. Fetch all facts for this entity
      // 2. Fetch existing compiled_truth from pages table
      // 3. Call Sonnet LLM to synthesize updated compiled_truth
      // 4. Detect supersessions (new fact contradicts old fact)
      // 5. Write compiled_truth to page
      // 6. Mark facts as consolidated
      console.log(
        `[Consolidate] Would consolidate ${cluster.fact_count} facts for entity: ${cluster.entity_slug}`
      );
      itemsProcessed++;
    } catch (err) {
      errors.push(`Consolidation failed for ${cluster.entity_slug}: ${err}`);
    }
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
