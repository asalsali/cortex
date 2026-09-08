import { eq, and, sql, desc } from "drizzle-orm";
import type { Database } from "@cortex/db";
import { schema } from "@cortex/db";
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchMode,
} from "@cortex/shared";
import {
  RRF_K,
  COMPILED_TRUTH_BOOST,
  COSINE_BLEND_RRF,
  COSINE_BLEND_SIM,
  FLOOR_RATIO,
  ADJACENCY_BOOST,
  CROSS_SOURCE_BOOST,
  TITLE_PHRASE_BOOST,
  HIGH_CONFIDENCE_BOOST,
  LOW_CONFIDENCE_PENALTY,
  AUTOCUT_DROP_THRESHOLD,
  SEARCH_MODE_CONFIG,
  SEARCH_CANDIDATE_POOL,
  RECENCY_HALF_LIFE,
  estimateTokens,
  packByBudget,
} from "@cortex/shared";
import { classifyIntent, type IntentResult } from "./intent";
import { getEmbeddingService } from "./embeddings";

const { pages, contentChunks, facts, edges } = schema;

interface ScoredCandidate {
  id: string;
  type: "page" | "fact" | "chunk";
  title: string;
  content: string;
  score: number;
  sourceType: string | null;
  sourceRef: string | null;
  sourceAuthor: string | null;
  validFrom: Date | null;
  entitySlug: string | null;
  chunkSource?: string;
  cosine?: number;
  pageTitle?: string;
  confidence?: number;
  updatedAt?: Date;
}

export class SearchPipeline {
  constructor(private db: Database) {}

  /**
   * Execute the full 12-stage search pipeline.
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const { query, tenantId } = request;
    const mode = request.mode ?? "standard";
    const modeConfig = SEARCH_MODE_CONFIG[mode];

    // Stage 1: Intent classification
    const intent = classifyIntent(query);

    // Stage 2: Mode resolution
    const tokenBudget = request.tokenBudget ?? modeConfig.tokenBudget;

    // Stage 3a + 3b: Parallel keyword and vector search
    const [keywordResults, vectorResults] = await Promise.all([
      this.keywordSearch(tenantId, query),
      modeConfig.vector
        ? this.vectorSearch(tenantId, query)
        : Promise.resolve([]),
    ]);

    // Stage 4: RRF fusion
    let candidates = this.rrfFusion(keywordResults, vectorResults);

    // Stage 5: Compiled truth boost
    candidates = this.compiledTruthBoost(candidates);

    // Stage 6: Cosine re-score (if vector was used)
    if (modeConfig.vector) {
      candidates = this.cosineRescore(candidates);
    }

    // Stage 7: Floor-ratio gate
    const { aboveFloor, belowFloor } = this.floorRatioGate(candidates);

    // Stage 8a-8e: Post-fusion boosts (only for above-floor candidates)
    let boosted = await this.applyBoosts(aboveFloor, intent, tenantId, query);

    // Re-merge (below-floor candidates keep their scores)
    candidates = [...boosted, ...belowFloor].sort((a, b) => b.score - a.score);

    // Stage 9: Reranker (deep mode only -- stubbed)
    // Cross-encoder reranking would happen here. For now, skip.

    // Stage 10: Autocut
    candidates = this.autocut(candidates);

    // Stage 11: Token budget enforcement
    const { packed, tokenCount } = packByBudget(candidates, tokenBudget);

    // Stage 12: Evidence stamping (already in the result structure)
    const results: SearchResult[] = packed.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      content: c.content,
      score: c.score,
      sourceType: c.sourceType as any,
      sourceRef: c.sourceRef,
      sourceAuthor: c.sourceAuthor,
      validFrom: c.validFrom,
      entitySlug: c.entitySlug,
      chunkSource: c.chunkSource,
    }));

    return {
      results,
      total: candidates.length,
      modeUsed: mode,
      tokenCount,
    };
  }

  /**
   * Stage 3a: Keyword search using tsvector full-text search.
   */
  private async keywordSearch(
    tenantId: string,
    query: string
  ): Promise<ScoredCandidate[]> {
    const tsQuery = query
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => `${w}:*`)
      .join(" & ");

    if (!tsQuery) return [];

    // Search pages
    const pageResults = await this.db.execute(sql`
      SELECT
        id, slug, title, raw_content, source_type, source_ref,
        compiled_truth, updated_at,
        ts_rank(
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(raw_content, '')),
          to_tsquery('english', ${tsQuery})
        ) as rank
      FROM pages
      WHERE tenant_id = ${tenantId}::uuid
        AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(raw_content, ''))
            @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${SEARCH_CANDIDATE_POOL}
    `);

    // Search facts
    const factResults = await this.db.execute(sql`
      SELECT
        id, entity_slug, content, kind, confidence, source_type, source_ref,
        valid_from, valid_until,
        ts_rank(
          to_tsvector('english', content),
          to_tsquery('english', ${tsQuery})
        ) as rank
      FROM facts
      WHERE tenant_id = ${tenantId}::uuid
        AND valid_until IS NULL
        AND to_tsvector('english', content) @@ to_tsquery('english', ${tsQuery})
      ORDER BY rank DESC
      LIMIT ${SEARCH_CANDIDATE_POOL}
    `);

    const candidates: ScoredCandidate[] = [];

    for (const row of pageResults.rows ?? (pageResults as any)) {
      candidates.push({
        id: row.id,
        type: "page",
        title: row.title,
        content: row.compiled_truth || row.raw_content || "",
        score: Number(row.rank),
        sourceType: row.source_type,
        sourceRef: row.source_ref,
        sourceAuthor: null,
        validFrom: null,
        entitySlug: row.slug,
        chunkSource: row.compiled_truth ? "compiled_truth" : "content",
        pageTitle: row.title,
        updatedAt: row.updated_at,
      });
    }

    for (const row of factResults.rows ?? (factResults as any)) {
      candidates.push({
        id: row.id,
        type: "fact",
        title: `${row.entity_slug} (${row.kind})`,
        content: row.content,
        score: Number(row.rank),
        sourceType: row.source_type,
        sourceRef: row.source_ref,
        sourceAuthor: null,
        validFrom: row.valid_from,
        entitySlug: row.entity_slug,
        confidence: Number(row.confidence),
      });
    }

    return candidates;
  }

  /**
   * Stage 3b: Vector search using pgvector HNSW.
   * Generates a query embedding via Voyage AI, then runs cosine similarity search.
   * Returns empty if no API key or no embeddings exist.
   */
  private async vectorSearch(
    tenantId: string,
    query: string
  ): Promise<ScoredCandidate[]> {
    const embeddingService = getEmbeddingService();
    if (!embeddingService.isAvailable()) {
      return [];
    }

    const queryEmbedding = await embeddingService.embedQuery(query);
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return [];
    }

    const vecStr = JSON.stringify(queryEmbedding);
    const candidates: ScoredCandidate[] = [];

    try {
      // Search content chunks
      const chunkResults = await this.db.execute(sql`
        SELECT
          cc.id, cc.chunk_text, cc.chunk_source, cc.page_id,
          p.title as page_title, p.slug, p.source_type,
          1 - (cc.embedding <=> ${vecStr}::vector) as cosine
        FROM content_chunks cc
        JOIN pages p ON p.id = cc.page_id
        WHERE cc.tenant_id = ${tenantId}::uuid
          AND cc.embedding IS NOT NULL
        ORDER BY cc.embedding <=> ${vecStr}::vector
        LIMIT ${SEARCH_CANDIDATE_POOL}
      `);

      const chunks = chunkResults.rows ?? (chunkResults as any);
      for (const row of chunks) {
        candidates.push({
          id: row.id,
          type: "chunk",
          title: row.page_title ?? "",
          content: row.chunk_text,
          score: Number(row.cosine),
          sourceType: row.source_type,
          sourceRef: null,
          sourceAuthor: null,
          validFrom: null,
          entitySlug: row.slug,
          chunkSource: row.chunk_source,
          cosine: Number(row.cosine),
          pageTitle: row.page_title,
        });
      }

      // Search facts
      const factResults = await this.db.execute(sql`
        SELECT
          id, entity_slug, content, kind, confidence,
          source_type, source_ref, valid_from,
          1 - (embedding <=> ${vecStr}::vector) as cosine
        FROM facts
        WHERE tenant_id = ${tenantId}::uuid
          AND embedding IS NOT NULL
          AND valid_until IS NULL
        ORDER BY embedding <=> ${vecStr}::vector
        LIMIT ${SEARCH_CANDIDATE_POOL}
      `);

      const factRows = factResults.rows ?? (factResults as any);
      for (const row of factRows) {
        candidates.push({
          id: row.id,
          type: "fact",
          title: `${row.entity_slug} (${row.kind})`,
          content: row.content,
          score: Number(row.cosine),
          sourceType: row.source_type,
          sourceRef: row.source_ref,
          sourceAuthor: null,
          validFrom: row.valid_from,
          entitySlug: row.entity_slug,
          cosine: Number(row.cosine),
          confidence: Number(row.confidence),
        });
      }
    } catch (err) {
      // Vector search is fail-open: if it errors, keyword search still works
      console.error("[Search] Vector search failed (continuing with keyword only):", err);
    }

    return candidates;
  }

  /**
   * Stage 4: Reciprocal Rank Fusion.
   * score = sum(1 / (k + rank_in_arm)) across all arms.
   */
  private rrfFusion(
    keyword: ScoredCandidate[],
    vector: ScoredCandidate[]
  ): ScoredCandidate[] {
    const scores = new Map<string, { candidate: ScoredCandidate; score: number }>();

    // Score keyword arm
    keyword.forEach((c, rank) => {
      const rrfScore = 1 / (RRF_K + rank);
      const existing = scores.get(c.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(c.id, { candidate: c, score: rrfScore });
      }
    });

    // Score vector arm
    vector.forEach((c, rank) => {
      const rrfScore = 1 / (RRF_K + rank);
      const existing = scores.get(c.id);
      if (existing) {
        existing.score += rrfScore;
        // Keep cosine similarity for re-scoring
        existing.candidate.cosine = c.cosine;
      } else {
        scores.set(c.id, { candidate: { ...c }, score: rrfScore });
      }
    });

    return Array.from(scores.values())
      .map(({ candidate, score }) => ({ ...candidate, score }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Stage 5: Compiled truth boost.
   * Chunks from compiled_truth get 2x score multiplier.
   */
  private compiledTruthBoost(candidates: ScoredCandidate[]): ScoredCandidate[] {
    return candidates.map((c) => ({
      ...c,
      score: c.chunkSource === "compiled_truth" ? c.score * COMPILED_TRUTH_BOOST : c.score,
    }));
  }

  /**
   * Stage 6: Cosine re-score.
   * final_score = 0.7 * rrf_score + 0.3 * cosine_similarity
   */
  private cosineRescore(candidates: ScoredCandidate[]): ScoredCandidate[] {
    return candidates.map((c) => {
      if (c.cosine !== undefined) {
        return {
          ...c,
          score: COSINE_BLEND_RRF * c.score + COSINE_BLEND_SIM * c.cosine,
        };
      }
      return c;
    });
  }

  /**
   * Stage 7: Floor-ratio gate.
   * Candidates below (top_score * 0.3) skip metadata boosts.
   */
  private floorRatioGate(candidates: ScoredCandidate[]): {
    aboveFloor: ScoredCandidate[];
    belowFloor: ScoredCandidate[];
  } {
    if (candidates.length === 0) return { aboveFloor: [], belowFloor: [] };
    const topScore = candidates[0].score;
    const floor = topScore * FLOOR_RATIO;

    return {
      aboveFloor: candidates.filter((c) => c.score >= floor),
      belowFloor: candidates.filter((c) => c.score < floor),
    };
  }

  /**
   * Stages 8a-8e: Post-fusion metadata boosts.
   */
  private async applyBoosts(
    candidates: ScoredCandidate[],
    intent: IntentResult,
    tenantId: string,
    query: string
  ): Promise<ScoredCandidate[]> {
    return candidates.map((c) => {
      let score = c.score;

      // 8a: Recency boost
      if (c.validFrom || c.updatedAt) {
        const refDate = new Date(c.validFrom ?? c.updatedAt!);
        const ageDays = (Date.now() - refDate.getTime()) / (1000 * 60 * 60 * 24);
        const halfLife = RECENCY_HALF_LIFE[intent.intent] ?? 180;
        const recencyBoost = Math.exp(-ageDays / halfLife);
        score *= 1 + 0.2 * recencyBoost; // Max 20% boost from recency
      }

      // 8d: Title phrase boost
      if (c.pageTitle) {
        const queryLower = query.toLowerCase();
        const titleLower = c.pageTitle.toLowerCase();
        if (titleLower.includes(queryLower) || queryLower.includes(titleLower)) {
          score *= TITLE_PHRASE_BOOST;
        }
      }

      // 8e: Confidence boost (facts only)
      if (c.confidence !== undefined) {
        if (c.confidence >= 0.9) {
          score *= HIGH_CONFIDENCE_BOOST;
        } else if (c.confidence < 0.5) {
          score *= LOW_CONFIDENCE_PENALTY;
        }
      }

      return { ...c, score };
    });

    // Note: 8b (graph adjacency boost) and 8c (cross-source boost) require
    // additional DB queries. They are deferred to avoid N+1 in the search path.
    // The graph signals will be implemented as a batch lookup when the graph
    // is populated with meaningful data.
  }

  /**
   * Stage 10: Autocut.
   * Drop results where score drops > 40% from the previous result.
   */
  private autocut(candidates: ScoredCandidate[]): ScoredCandidate[] {
    if (candidates.length <= 1) return candidates;
    const result = [candidates[0]];

    for (let i = 1; i < candidates.length; i++) {
      const dropRatio = 1 - candidates[i].score / candidates[i - 1].score;
      if (dropRatio > AUTOCUT_DROP_THRESHOLD) break;
      result.push(candidates[i]);
    }

    return result;
  }
}
