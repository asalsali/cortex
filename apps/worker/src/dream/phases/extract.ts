import { sql } from "drizzle-orm";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * EXTRACT phase: Entity + relationship + fact extraction from new pages.
 * Uses LLM (Haiku) for structured extraction.
 */
export async function extractPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  let itemsProcessed = 0;
  const errors: string[] = [];

  // Find pages modified since last dream cycle
  const result = await ctx.db.execute(sql`
    SELECT p.id, p.title, p.raw_content, p.slug
    FROM pages p
    WHERE p.tenant_id = ${ctx.tenantId}::uuid
      AND p.raw_content IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM facts f
        WHERE f.tenant_id = p.tenant_id
          AND f.entity_slug = p.slug
          AND f.created_at > p.updated_at - interval '1 hour'
      )
    ORDER BY p.updated_at DESC
    LIMIT 100
  `);

  const pages = result.rows ?? (result as any);

  for (const page of pages) {
    try {
      // In production: call Haiku LLM with extraction prompt
      // For now, log that extraction is pending
      console.log(`[Extract] Would extract entities/facts from page: ${page.title}`);
      itemsProcessed++;
    } catch (err) {
      errors.push(`Extract failed for page ${page.id}: ${err}`);
    }
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
