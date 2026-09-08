import { sql } from "drizzle-orm";
import type { Database } from "@cortex/db";
import { EMBEDDING_DIMENSIONS, EMBEDDING_BATCH_SIZE } from "@cortex/shared";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3-lite";

/**
 * Voyage AI embedding client.
 * Falls back gracefully when VOYAGE_API_KEY is not set.
 */
export class EmbeddingService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.VOYAGE_API_KEY;
  }

  /**
   * Check whether the embedding service is available.
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== "pa-...";
  }

  /**
   * Generate embeddings for a batch of texts using Voyage AI.
   * Returns an array of float arrays, one per input text.
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!this.isAvailable()) {
      return [];
    }

    // Voyage API accepts up to 128 texts per call
    const batchSize = Math.min(texts.length, 128);
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    const allEmbeddings: number[][] = [];

    for (const batch of batches) {
      try {
        const response = await fetch(VOYAGE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: VOYAGE_MODEL,
            input: batch,
            input_type: "document",
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Embeddings] Voyage API error: ${response.status} ${errText}`);
          // Return empty arrays for this batch
          allEmbeddings.push(...batch.map(() => []));
          continue;
        }

        const data = (await response.json()) as {
          data: Array<{ embedding: number[] }>;
        };

        for (const item of data.data) {
          allEmbeddings.push(item.embedding);
        }
      } catch (err) {
        console.error(`[Embeddings] Voyage API call failed:`, err);
        allEmbeddings.push(...batch.map(() => []));
      }
    }

    return allEmbeddings;
  }

  /**
   * Generate a single query embedding (uses "query" input_type for better retrieval).
   */
  async embedQuery(text: string): Promise<number[] | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const response = await fetch(VOYAGE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: VOYAGE_MODEL,
          input: [text],
          input_type: "query",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Embeddings] Voyage query embed error: ${response.status} ${errText}`);
        return null;
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
      };

      return data.data[0]?.embedding ?? null;
    } catch (err) {
      console.error(`[Embeddings] Voyage query embed failed:`, err);
      return null;
    }
  }

  /**
   * Embed chunks in the database that lack embeddings.
   * Updates the content_chunks table directly.
   */
  async embedUnembeddedChunks(
    db: Database,
    tenantId: string,
    limit = EMBEDDING_BATCH_SIZE
  ): Promise<number> {
    if (!this.isAvailable()) {
      console.log("[Embeddings] No API key, skipping chunk embedding");
      return 0;
    }

    const result = await db.execute(sql`
      SELECT id, chunk_text
      FROM content_chunks
      WHERE tenant_id = ${tenantId}::uuid
        AND embedded_at IS NULL
      ORDER BY created_at ASC
      LIMIT ${limit}
    `);

    const chunks = (result.rows ?? (result as any)) as Array<{
      id: string;
      chunk_text: string;
    }>;

    if (chunks.length === 0) return 0;

    const texts = chunks.map((c) => c.chunk_text);
    const embeddings = await this.embed(texts);

    let embedded = 0;
    for (let i = 0; i < chunks.length; i++) {
      const vec = embeddings[i];
      if (!vec || vec.length === 0) continue;

      await db.execute(sql`
        UPDATE content_chunks
        SET embedding = ${JSON.stringify(vec)}::vector,
            embedded_at = now()
        WHERE id = ${chunks[i].id}::uuid
      `);
      embedded++;
    }

    return embedded;
  }

  /**
   * Embed facts in the database that lack embeddings.
   */
  async embedUnembeddedFacts(
    db: Database,
    tenantId: string,
    limit = EMBEDDING_BATCH_SIZE
  ): Promise<number> {
    if (!this.isAvailable()) {
      console.log("[Embeddings] No API key, skipping fact embedding");
      return 0;
    }

    const result = await db.execute(sql`
      SELECT id, content
      FROM facts
      WHERE tenant_id = ${tenantId}::uuid
        AND embedding IS NULL
      ORDER BY created_at ASC
      LIMIT ${limit}
    `);

    const factsToEmbed = (result.rows ?? (result as any)) as Array<{
      id: string;
      content: string;
    }>;

    if (factsToEmbed.length === 0) return 0;

    const texts = factsToEmbed.map((f) => f.content);
    const embeddings = await this.embed(texts);

    let embedded = 0;
    for (let i = 0; i < factsToEmbed.length; i++) {
      const vec = embeddings[i];
      if (!vec || vec.length === 0) continue;

      await db.execute(sql`
        UPDATE facts
        SET embedding = ${JSON.stringify(vec)}::vector
        WHERE id = ${factsToEmbed[i].id}::uuid
      `);
      embedded++;
    }

    return embedded;
  }
}

// Singleton instance
let _embeddingService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!_embeddingService) {
    _embeddingService = new EmbeddingService();
  }
  return _embeddingService;
}
