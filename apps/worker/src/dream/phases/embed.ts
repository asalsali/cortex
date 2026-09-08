import { EMBEDDING_BATCH_SIZE } from "@cortex/shared";
import { getEmbeddingService } from "@cortex/engine";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * EMBED phase: Generate embeddings for chunks and facts that lack them.
 * Uses Voyage AI API. Gracefully skips if no API key.
 */
export async function embedPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  let itemsProcessed = 0;
  const errors: string[] = [];

  const embeddingService = getEmbeddingService();

  if (!embeddingService.isAvailable()) {
    console.log("[Embed] No VOYAGE_API_KEY set, skipping embedding phase");
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      itemsProcessed: 0,
      errors: [],
    };
  }

  try {
    // Embed unembedded chunks
    const chunksEmbedded = await embeddingService.embedUnembeddedChunks(
      ctx.db,
      ctx.tenantId,
      EMBEDDING_BATCH_SIZE
    );
    console.log(`[Embed] Embedded ${chunksEmbedded} chunks`);
    itemsProcessed += chunksEmbedded;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Chunk embedding failed: ${msg}`);
  }

  try {
    // Embed unembedded facts
    const factsEmbedded = await embeddingService.embedUnembeddedFacts(
      ctx.db,
      ctx.tenantId,
      EMBEDDING_BATCH_SIZE
    );
    console.log(`[Embed] Embedded ${factsEmbedded} facts`);
    itemsProcessed += factsEmbedded;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Fact embedding failed: ${msg}`);
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
