import { sql } from "drizzle-orm";
import { extractFromText } from "@cortex/engine";
import { schema } from "@cortex/db";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * EXTRACT phase: Entity + relationship + fact extraction from new pages.
 * Uses Anthropic Haiku for structured extraction (regex fallback).
 */
export async function extractPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  let itemsProcessed = 0;
  const errors: string[] = [];

  // Find pages modified since last dream cycle that have not been extracted
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

  const pages = (result.rows ?? (result as any)) as Array<{
    id: string;
    title: string;
    raw_content: string;
    slug: string;
  }>;

  for (const page of pages) {
    try {
      if (!page.raw_content) continue;

      const extraction = await extractFromText(page.raw_content, page.title);

      // Create entity pages for discovered entities
      for (const entity of extraction.entities) {
        try {
          await ctx.db
            .insert(schema.pages)
            .values({
              tenantId: ctx.tenantId,
              slug: entity.slug,
              type: "entity",
              title: entity.name,
              extractedBy: extraction.method === "llm" ? "llm" : "connector",
            })
            .onConflictDoNothing();
        } catch {
          // Entity page may already exist
        }
      }

      // Insert extracted facts
      let factsCreated = 0;
      for (const fact of extraction.facts) {
        try {
          await ctx.db
            .insert(schema.facts)
            .values({
              tenantId: ctx.tenantId,
              entitySlug: fact.entitySlug,
              content: fact.content,
              kind: fact.kind,
              confidence: fact.confidence,
              visibility: "public",
              extractedBy: extraction.method === "llm" ? "llm" : "connector",
            });
          factsCreated++;
        } catch {
          // Duplicate or constraint violation -- skip
        }
      }

      console.log(
        `[Extract] Page "${page.title}": ${extraction.entities.length} entities, ${factsCreated} facts (${extraction.method})`
      );
      itemsProcessed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Extract failed for page ${page.id}: ${msg}`);
    }
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
