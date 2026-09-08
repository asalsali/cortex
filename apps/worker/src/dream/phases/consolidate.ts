import { sql, eq, and, isNull } from "drizzle-orm";
import { CONSOLIDATION_CLUSTER_MIN } from "@cortex/shared";
import { schema } from "@cortex/db";
import { consolidateWithLLM } from "@cortex/engine";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * CONSOLIDATE phase: Group facts by entity, synthesize compiled truth,
 * detect supersessions. Uses Anthropic Sonnet for synthesis.
 * Falls back to simple concatenation if no API key.
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

  const clusters = (result.rows ?? (result as any)) as Array<{
    entity_slug: string;
    fact_count: number;
  }>;

  for (const cluster of clusters) {
    try {
      // Fetch all unconsolidated facts for this entity
      const entityFacts = await ctx.db
        .select()
        .from(schema.facts)
        .where(
          and(
            eq(schema.facts.tenantId, ctx.tenantId),
            eq(schema.facts.entitySlug, cluster.entity_slug),
            isNull(schema.facts.consolidatedAt),
            isNull(schema.facts.validUntil)
          )
        );

      if (entityFacts.length === 0) continue;

      // Fetch existing page and compiled truth
      const [page] = await ctx.db
        .select()
        .from(schema.pages)
        .where(
          and(
            eq(schema.pages.tenantId, ctx.tenantId),
            eq(schema.pages.slug, cluster.entity_slug)
          )
        );

      const factsTexts = entityFacts.map((f) => `[${f.kind}] ${f.content}`);

      // Try LLM consolidation, fall back to simple concatenation
      let compiledTruth = await consolidateWithLLM(
        cluster.entity_slug,
        page?.title ?? cluster.entity_slug,
        factsTexts,
        page?.compiledTruth ?? null
      );

      if (!compiledTruth) {
        // Simple fallback: concatenate facts
        compiledTruth = factsTexts.join("\n\n");
      }

      // Update or create the page with compiled truth
      if (page) {
        await ctx.db
          .update(schema.pages)
          .set({
            compiledTruth,
            updatedAt: new Date(),
          })
          .where(eq(schema.pages.id, page.id));
      } else {
        // Create entity page if it doesn't exist
        const [newPage] = await ctx.db
          .insert(schema.pages)
          .values({
            tenantId: ctx.tenantId,
            slug: cluster.entity_slug,
            type: "entity",
            title: cluster.entity_slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            compiledTruth,
            extractedBy: "llm",
          })
          .returning({ id: schema.pages.id });

        // Mark facts as consolidated into this page
        for (const fact of entityFacts) {
          await ctx.db
            .update(schema.facts)
            .set({
              consolidatedInto: newPage.id,
              consolidatedAt: new Date(),
            })
            .where(eq(schema.facts.id, fact.id));
        }

        itemsProcessed++;
        continue;
      }

      // Mark facts as consolidated
      for (const fact of entityFacts) {
        await ctx.db
          .update(schema.facts)
          .set({
            consolidatedInto: page.id,
            consolidatedAt: new Date(),
          })
          .where(eq(schema.facts.id, fact.id));
      }

      console.log(
        `[Consolidate] Entity "${cluster.entity_slug}": ${entityFacts.length} facts consolidated`
      );
      itemsProcessed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Consolidation failed for ${cluster.entity_slug}: ${msg}`);
    }
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
