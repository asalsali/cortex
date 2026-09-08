import { eq, and, isNull, desc, asc, sql, gte, lte } from "drizzle-orm";
import type { Database } from "@cortex/db";
import { schema } from "@cortex/db";
import { contentHash } from "@cortex/shared";
import type { Fact, CreateFactInput, TimelineEntry, SupersessionChain } from "@cortex/shared";

const { facts, pages } = schema;

export class FactsEngine {
  constructor(private db: Database) {}

  /**
   * Create a new fact. Auto-detects duplicates via content hash.
   * Returns the fact ID and any facts that were auto-superseded.
   */
  async create(
    tenantId: string,
    input: CreateFactInput,
    createdBy?: string
  ): Promise<{ factId: string; superseded: string[] }> {
    const hash = contentHash(input.content);

    // Check for duplicate
    const existing = await this.db
      .select({ id: facts.id })
      .from(facts)
      .where(
        and(
          eq(facts.tenantId, tenantId),
          eq(facts.contentHash, hash),
          isNull(facts.validUntil)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { factId: existing[0].id, superseded: [] };
    }

    const [inserted] = await this.db
      .insert(facts)
      .values({
        tenantId,
        entitySlug: input.entitySlug,
        content: input.content,
        kind: input.kind,
        confidence: input.confidence ?? 1.0,
        visibility: input.visibility ?? "public",
        validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
        sourceType: input.sourceType ?? null,
        sourceRef: input.sourceRef ?? null,
        extractedBy: input.extractedBy ?? "llm",
        contentHash: hash,
        createdBy: createdBy ?? null,
      })
      .returning({ id: facts.id });

    return { factId: inserted.id, superseded: [] };
  }

  /**
   * Supersede an existing fact with a new one.
   * Sets valid_until on the old fact and superseded_by pointer.
   */
  async supersede(
    tenantId: string,
    oldFactId: string,
    newFactInput: CreateFactInput,
    reason?: string,
    createdBy?: string
  ): Promise<{ newFactId: string }> {
    const { factId: newFactId } = await this.create(tenantId, newFactInput, createdBy);

    await this.db
      .update(facts)
      .set({
        validUntil: new Date(),
        supersededBy: newFactId,
        supersessionReason: reason ?? null,
      })
      .where(and(eq(facts.id, oldFactId), eq(facts.tenantId, tenantId)));

    return { newFactId };
  }

  /**
   * Recall current facts for an entity.
   * Only returns facts where valid_until IS NULL.
   */
  async recall(
    tenantId: string,
    opts: {
      entitySlug?: string;
      kind?: string;
      since?: string;
      limit?: number;
    } = {}
  ): Promise<Fact[]> {
    const conditions = [
      eq(facts.tenantId, tenantId),
      isNull(facts.validUntil),
    ];

    if (opts.entitySlug) {
      conditions.push(eq(facts.entitySlug, opts.entitySlug));
    }
    if (opts.kind) {
      conditions.push(eq(facts.kind, opts.kind));
    }
    if (opts.since) {
      conditions.push(gte(facts.validFrom, new Date(opts.since)));
    }

    const rows = await this.db
      .select()
      .from(facts)
      .where(and(...conditions))
      .orderBy(desc(facts.validFrom))
      .limit(opts.limit ?? 50);

    return rows.map(rowToFact);
  }

  /**
   * Get the full history of an entity (all facts, including superseded).
   */
  async timeline(
    tenantId: string,
    entitySlug: string,
    opts: { from?: string; to?: string; kinds?: string[] } = {}
  ): Promise<{ events: TimelineEntry[]; supersessionChains: SupersessionChain[] }> {
    const conditions = [
      eq(facts.tenantId, tenantId),
      eq(facts.entitySlug, entitySlug),
    ];

    if (opts.from) {
      conditions.push(gte(facts.validFrom, new Date(opts.from)));
    }
    if (opts.to) {
      conditions.push(lte(facts.validFrom, new Date(opts.to)));
    }

    const rows = await this.db
      .select()
      .from(facts)
      .where(and(...conditions))
      .orderBy(asc(facts.validFrom));

    const events: TimelineEntry[] = rows.map((r) => ({
      factId: r.id,
      content: r.content,
      kind: r.kind as TimelineEntry["kind"],
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      sourceType: r.sourceType as TimelineEntry["sourceType"],
      sourceRef: r.sourceRef,
      sourceAuthor: r.sourceAuthorId,
      supersededBy: r.supersededBy,
      supersessionReason: r.supersessionReason,
    }));

    // Build supersession chains
    const chains = this.buildSupersessionChains(rows.map(rowToFact));

    return { events, supersessionChains: chains };
  }

  /**
   * Expire (forget) a fact by setting valid_until to now.
   */
  async forget(
    tenantId: string,
    factId: string,
    reason?: string
  ): Promise<{ expired: boolean }> {
    const result = await this.db
      .update(facts)
      .set({
        validUntil: new Date(),
        supersessionReason: reason ?? "manually expired",
      })
      .where(and(eq(facts.id, factId), eq(facts.tenantId, tenantId)));

    return { expired: true };
  }

  /**
   * Get facts created or superseded since a given timestamp (delta query).
   */
  async delta(
    tenantId: string,
    since: string
  ): Promise<{ factsCreated: Fact[]; factsSuperseded: Fact[]; entitiesUpdated: string[] }> {
    const sinceDate = new Date(since);

    const created = await this.db
      .select()
      .from(facts)
      .where(
        and(eq(facts.tenantId, tenantId), gte(facts.createdAt, sinceDate))
      )
      .orderBy(desc(facts.createdAt));

    const superseded = await this.db
      .select()
      .from(facts)
      .where(
        and(
          eq(facts.tenantId, tenantId),
          gte(facts.validUntil!, sinceDate)
        )
      )
      .orderBy(desc(facts.validUntil));

    const entitySet = new Set<string>();
    for (const r of created) entitySet.add(r.entitySlug);
    for (const r of superseded) entitySet.add(r.entitySlug);

    return {
      factsCreated: created.map(rowToFact),
      factsSuperseded: superseded.map(rowToFact),
      entitiesUpdated: Array.from(entitySet),
    };
  }

  /**
   * Build supersession chains from a list of facts.
   * A chain is a sequence of facts connected by superseded_by pointers.
   */
  private buildSupersessionChains(allFacts: Fact[]): SupersessionChain[] {
    const byId = new Map(allFacts.map((f) => [f.id, f]));
    const visited = new Set<string>();
    const chains: SupersessionChain[] = [];

    // Find chain roots (facts that are not superseded by anything in our set)
    for (const fact of allFacts) {
      if (visited.has(fact.id)) continue;
      if (fact.supersededBy && byId.has(fact.supersededBy)) continue; // not a leaf

      // Walk backwards to find the root
      let root = fact;
      const predecessors = allFacts.filter((f) => f.supersededBy === root.id);
      while (predecessors.length > 0) {
        root = predecessors[0];
        const next = allFacts.filter((f) => f.supersededBy === root.id);
        if (next.length === 0) break;
        root = next[0];
      }

      // Walk forward from root
      const chain: Fact[] = [];
      let current: Fact | undefined = root;
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        chain.push(current);
        current = current.supersededBy ? byId.get(current.supersededBy) : undefined;
      }

      if (chain.length > 1) {
        chains.push({ facts: chain });
      }
    }

    return chains;
  }
}

function rowToFact(row: any): Fact {
  return {
    id: row.id,
    tenantId: row.tenantId,
    entitySlug: row.entitySlug,
    content: row.content,
    kind: row.kind,
    confidence: row.confidence,
    visibility: row.visibility,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    sourceType: row.sourceType,
    sourceRef: row.sourceRef,
    sourceAuthorId: row.sourceAuthorId,
    extractedBy: row.extractedBy,
    supersededBy: row.supersededBy,
    supersessionReason: row.supersessionReason,
    consolidatedInto: row.consolidatedInto,
    consolidatedAt: row.consolidatedAt,
    createdAt: row.createdAt,
  };
}
