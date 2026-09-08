import { sql } from "drizzle-orm";
import { ORPHAN_DAYS } from "@cortex/shared";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * ORPHANS phase: Flag pages with no edges, no references, no recent facts.
 * No LLM usage.
 */
export async function orphansPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  // Find orphaned pages: no edges and no facts in the last N days
  const result = await ctx.db.execute(sql`
    UPDATE pages
    SET frontmatter = frontmatter || '{"orphaned": true}'::jsonb,
        updated_at = now()
    WHERE tenant_id = ${ctx.tenantId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM edges e
        WHERE e.tenant_id = pages.tenant_id
          AND (e.from_page_id = pages.id OR e.to_page_id = pages.id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM facts f
        WHERE f.tenant_id = pages.tenant_id
          AND f.entity_slug = pages.slug
          AND f.created_at > now() - interval '${sql.raw(String(ORPHAN_DAYS))} days'
      )
      AND (frontmatter->>'orphaned' IS NULL OR frontmatter->>'orphaned' = 'false')
    RETURNING id
  `);

  const orphans = result.rows ?? (result as any);

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed: orphans.length,
    errors,
  };
}
