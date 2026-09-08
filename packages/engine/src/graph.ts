import { eq, and, or, sql } from "drizzle-orm";
import type { Database } from "@cortex/db";
import { schema } from "@cortex/db";
import type { Edge, CreateEdgeInput, EntityNeighbor, EntityCard } from "@cortex/shared";
import { GRAPH_MAX_DEPTH, GRAPH_FRONTIER_CAP } from "@cortex/shared";

const { edges, pages, facts } = schema;

export class KnowledgeGraph {
  constructor(private db: Database) {}

  /**
   * Create an edge between two pages.
   * Uses ON CONFLICT to handle duplicate edges gracefully.
   */
  async createEdge(tenantId: string, input: CreateEdgeInput): Promise<Edge> {
    const [row] = await this.db
      .insert(edges)
      .values({
        tenantId,
        fromPageId: input.fromPageId,
        toPageId: input.toPageId,
        edgeType: input.edgeType,
        edgeSource: input.edgeSource ?? "extracted",
        weight: input.weight ?? 1.0,
      })
      .onConflictDoUpdate({
        target: [edges.tenantId, edges.fromPageId, edges.toPageId, edges.edgeType],
        set: { weight: input.weight ?? 1.0 },
      })
      .returning();

    return rowToEdge(row);
  }

  /**
   * Get neighbors of a page (both outgoing and incoming edges).
   */
  async getNeighbors(tenantId: string, pageId: string): Promise<EntityNeighbor[]> {
    const outgoing = await this.db
      .select({
        slug: pages.slug,
        title: pages.title,
        edgeType: edges.edgeType,
      })
      .from(edges)
      .innerJoin(pages, eq(edges.toPageId, pages.id))
      .where(and(eq(edges.tenantId, tenantId), eq(edges.fromPageId, pageId)));

    const incoming = await this.db
      .select({
        slug: pages.slug,
        title: pages.title,
        edgeType: edges.edgeType,
      })
      .from(edges)
      .innerJoin(pages, eq(edges.fromPageId, pages.id))
      .where(and(eq(edges.tenantId, tenantId), eq(edges.toPageId, pageId)));

    const neighbors: EntityNeighbor[] = [
      ...outgoing.map((r) => ({
        slug: r.slug,
        title: r.title,
        edgeType: r.edgeType as EntityNeighbor["edgeType"],
        direction: "outgoing" as const,
      })),
      ...incoming.map((r) => ({
        slug: r.slug,
        title: r.title,
        edgeType: r.edgeType as EntityNeighbor["edgeType"],
        direction: "incoming" as const,
      })),
    ];

    return neighbors;
  }

  /**
   * BFS traversal from a page, bounded by depth and frontier cap.
   */
  async traverse(
    tenantId: string,
    startPageId: string,
    opts: { maxDepth?: number; frontierCap?: number } = {}
  ): Promise<{ nodes: Array<{ id: string; slug: string; title: string; depth: number }>; edges: Edge[] }> {
    const maxDepth = opts.maxDepth ?? GRAPH_MAX_DEPTH;
    const frontierCap = opts.frontierCap ?? GRAPH_FRONTIER_CAP;

    const visited = new Set<string>();
    const resultNodes: Array<{ id: string; slug: string; title: string; depth: number }> = [];
    const resultEdges: Edge[] = [];
    let frontier = [startPageId];

    for (let depth = 0; depth <= maxDepth && frontier.length > 0; depth++) {
      const nextFrontier: string[] = [];

      for (const pageId of frontier) {
        if (visited.has(pageId)) continue;
        visited.add(pageId);

        // Get page info
        const [page] = await this.db
          .select({ id: pages.id, slug: pages.slug, title: pages.title })
          .from(pages)
          .where(and(eq(pages.id, pageId), eq(pages.tenantId, tenantId)));

        if (page) {
          resultNodes.push({ ...page, depth });
        }

        // Get connected edges
        const connected = await this.db
          .select()
          .from(edges)
          .where(
            and(
              eq(edges.tenantId, tenantId),
              or(eq(edges.fromPageId, pageId), eq(edges.toPageId, pageId))
            )
          );

        for (const edge of connected) {
          resultEdges.push(rowToEdge(edge));
          const neighbor = edge.fromPageId === pageId ? edge.toPageId : edge.fromPageId;
          if (!visited.has(neighbor)) {
            nextFrontier.push(neighbor);
          }
        }
      }

      frontier = nextFrontier.slice(0, frontierCap);
    }

    return { nodes: resultNodes, edges: resultEdges };
  }

  /**
   * Build an entity card: compiled truth + current facts + graph neighbors.
   */
  async entityCard(tenantId: string, entitySlug: string): Promise<EntityCard | null> {
    const [page] = await this.db
      .select()
      .from(pages)
      .where(and(eq(pages.tenantId, tenantId), eq(pages.slug, entitySlug)));

    if (!page) return null;

    const neighbors = await this.getNeighbors(tenantId, page.id);

    // Get current facts for this entity
    const currentFacts = await this.db
      .select()
      .from(facts)
      .where(
        and(
          eq(facts.tenantId, tenantId),
          eq(facts.entitySlug, entitySlug),
          sql`${facts.validUntil} IS NULL`
        )
      );

    // Get timeline (all facts including superseded)
    const allFacts = await this.db
      .select()
      .from(facts)
      .where(
        and(eq(facts.tenantId, tenantId), eq(facts.entitySlug, entitySlug))
      )
      .orderBy(sql`${facts.validFrom} ASC`);

    const timeline = allFacts.map((f) => ({
      factId: f.id,
      content: f.content,
      kind: f.kind as any,
      validFrom: f.validFrom,
      validUntil: f.validUntil,
      sourceType: f.sourceType as any,
      sourceRef: f.sourceRef,
      sourceAuthor: f.sourceAuthorId,
      supersededBy: f.supersededBy,
      supersessionReason: f.supersessionReason,
    }));

    return {
      slug: page.slug,
      title: page.title,
      compiledTruth: page.compiledTruth,
      currentFacts: currentFacts.map((f) => ({
        id: f.id,
        tenantId: f.tenantId,
        entitySlug: f.entitySlug,
        content: f.content,
        kind: f.kind as any,
        confidence: f.confidence,
        visibility: f.visibility as any,
        validFrom: f.validFrom,
        validUntil: f.validUntil,
        sourceType: f.sourceType as any,
        sourceRef: f.sourceRef,
        sourceAuthorId: f.sourceAuthorId,
        extractedBy: f.extractedBy as any,
        supersededBy: f.supersededBy,
        supersessionReason: f.supersessionReason,
        consolidatedInto: f.consolidatedInto,
        consolidatedAt: f.consolidatedAt,
        createdAt: f.createdAt,
      })),
      timeline,
      graph: { neighbors },
    };
  }

  /**
   * Impact analysis: what depends on this entity?
   * Traverses depends_on edges in reverse.
   */
  async impact(
    tenantId: string,
    pageId: string
  ): Promise<Array<{ slug: string; title: string; edgeType: string; depth: number }>> {
    const result = await this.traverse(tenantId, pageId, {
      maxDepth: 2,
      frontierCap: 50,
    });

    return result.nodes
      .filter((n) => n.id !== pageId)
      .map((n) => ({
        slug: n.slug,
        title: n.title,
        edgeType: result.edges
          .find((e) => e.fromPageId === n.id || e.toPageId === n.id)
          ?.edgeType ?? "relates_to",
        depth: n.depth,
      }));
  }
}

function rowToEdge(row: any): Edge {
  return {
    id: row.id,
    tenantId: row.tenantId,
    fromPageId: row.fromPageId,
    toPageId: row.toPageId,
    edgeType: row.edgeType,
    edgeSource: row.edgeSource,
    weight: row.weight,
  };
}
