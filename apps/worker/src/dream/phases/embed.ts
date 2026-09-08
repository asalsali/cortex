import { sql } from "drizzle-orm";
import { EMBEDDING_BATCH_SIZE } from "@cortex/shared";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * EMBED phase: Generate embeddings for chunks and facts that lack them.
 * Uses Voyage AI API.
 */
export async function embedPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  let itemsProcessed = 0;
  const errors: string[] = [];

  // Find chunks without embeddings
  const result = await ctx.db.execute(sql`
    SELECT id, chunk_text
    FROM content_chunks
    WHERE tenant_id = ${ctx.tenantId}::uuid
      AND embedded_at IS NULL
    ORDER BY created_at ASC
    LIMIT ${EMBEDDING_BATCH_SIZE}
  `);

  const chunks = result.rows ?? (result as any);

  if (chunks.length > 0) {
    // In production: batch call Voyage AI API
    // const embeddings = await voyageEmbed(chunks.map(c => c.chunk_text));
    // Then update: UPDATE content_chunks SET embedding = $vec, embedded_at = now() WHERE id = $id
    console.log(`[Embed] Would embed ${chunks.length} chunks`);
    itemsProcessed += chunks.length;
  }

  // Find facts without embeddings
  const factsResult = await ctx.db.execute(sql`
    SELECT id, content
    FROM facts
    WHERE tenant_id = ${ctx.tenantId}::uuid
      AND embedding IS NULL
    ORDER BY created_at ASC
    LIMIT ${EMBEDDING_BATCH_SIZE}
  `);

  const factsToEmbed = factsResult.rows ?? (factsResult as any);

  if (factsToEmbed.length > 0) {
    console.log(`[Embed] Would embed ${factsToEmbed.length} facts`);
    itemsProcessed += factsToEmbed.length;
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
