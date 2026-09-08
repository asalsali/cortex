import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import type { FactsEngine, SearchPipeline, KnowledgeGraph } from "@cortex/engine";

interface McpDependencies {
  factsEngine: FactsEngine;
  searchPipeline: SearchPipeline;
  knowledgeGraph: KnowledgeGraph;
}

/**
 * Start the MCP server exposing 7 memory verbs over HTTP SSE transport.
 */
export function startMcpServer(port: number, deps: McpDependencies) {
  const server = new McpServer({
    name: "cortex",
    version: "0.1.0",
  });

  // ── recall ───────────────────────────────────────────────────
  server.tool(
    "recall",
    "Retrieve facts by entity, kind, recency",
    {
      tenant_id: z.string().describe("Tenant ID"),
      entity: z.string().optional().describe("Entity slug to recall facts for"),
      kind: z.string().optional().describe("Filter by fact kind"),
      since: z.string().optional().describe("ISO8601 timestamp -- only facts since this date"),
      limit: z.number().optional().describe("Maximum number of facts to return"),
    },
    async (params) => {
      const facts = await deps.factsEngine.recall(params.tenant_id, {
        entitySlug: params.entity,
        kind: params.kind,
        since: params.since,
        limit: params.limit,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ facts, total: facts.length }, null, 2) }],
      };
    }
  );

  // ── remember ─────────────────────────────────────────────────
  server.tool(
    "remember",
    "Save a fact with provenance, entity, kind",
    {
      tenant_id: z.string(),
      entity: z.string().describe("Entity slug this fact describes"),
      content: z.string().describe("The fact content"),
      kind: z.enum(["decision", "architecture", "process", "policy", "context", "event"]),
      source_ref: z.string().optional(),
      valid_from: z.string().optional(),
      visibility: z.enum(["public", "team", "private"]).optional(),
    },
    async (params) => {
      const result = await deps.factsEngine.create(params.tenant_id, {
        entitySlug: params.entity,
        content: params.content,
        kind: params.kind,
        sourceRef: params.source_ref,
        validFrom: params.valid_from,
        visibility: params.visibility,
        sourceType: "agent",
        extractedBy: "agent",
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── entity ───────────────────────────────────────────────────
  server.tool(
    "entity",
    "Get compiled entity card with facts, timeline, and graph neighbors",
    {
      tenant_id: z.string(),
      slug: z.string().describe("Entity slug"),
    },
    async (params) => {
      const card = await deps.knowledgeGraph.entityCard(params.tenant_id, params.slug);
      if (!card) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Entity not found" }) }],
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(card, null, 2) }],
      };
    }
  );

  // ── synthesize ───────────────────────────────────────────────
  server.tool(
    "synthesize",
    "Ask a question, get an answer with citations from the knowledge base",
    {
      tenant_id: z.string(),
      question: z.string(),
      token_budget: z.number().optional(),
      mode: z.enum(["quick", "standard", "deep"]).optional(),
    },
    async (params) => {
      // Synthesize = search + LLM synthesis. For now, return search results.
      // Full synthesis with LLM will be added when Anthropic SDK is wired.
      const results = await deps.searchPipeline.search({
        tenantId: params.tenant_id,
        query: params.question,
        mode: params.mode ?? "standard",
        tokenBudget: params.token_budget,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            answer: "Synthesis requires LLM integration. Returning search results.",
            citations: results.results.map((r) => ({
              content: r.content,
              sourceRef: r.sourceRef,
              score: r.score,
            })),
            factsUsed: results.results.length,
            costTokens: results.tokenCount,
          }, null, 2),
        }],
      };
    }
  );

  // ── forget ───────────────────────────────────────────────────
  server.tool(
    "forget",
    "Expire or supersede a fact",
    {
      tenant_id: z.string(),
      fact_id: z.string().describe("ID of the fact to forget"),
      reason: z.string().optional(),
    },
    async (params) => {
      const result = await deps.factsEngine.forget(params.tenant_id, params.fact_id, params.reason);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── timeline ─────────────────────────────────────────────────
  server.tool(
    "timeline",
    "Get temporal evolution of an entity",
    {
      tenant_id: z.string(),
      entity_slug: z.string(),
      from: z.string().optional(),
      to: z.string().optional(),
    },
    async (params) => {
      const result = await deps.factsEngine.timeline(params.tenant_id, params.entity_slug, {
        from: params.from,
        to: params.to,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── delta ────────────────────────────────────────────────────
  server.tool(
    "delta",
    "What changed since timestamp (for incremental agent sync)",
    {
      tenant_id: z.string(),
      since: z.string().describe("ISO8601 timestamp"),
    },
    async (params) => {
      const result = await deps.factsEngine.delta(params.tenant_id, params.since);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Start HTTP SSE transport
  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/sse" && req.method === "GET") {
        const transport = new SSEServerTransport("/messages", new Response().clone());
        await server.connect(transport);
        return transport.sseResponse!;
      }

      if (url.pathname === "/messages" && req.method === "POST") {
        // Handle MCP messages
        return new Response("OK", { status: 200 });
      }

      return new Response("Cortex MCP Server", { status: 200 });
    },
  });

  console.log(`MCP server listening on port ${port}`);
}
