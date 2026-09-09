/**
 * Office Hours Engine — conversational interface powered by the knowledge base.
 *
 * Flow per message:
 * 1. Intent detection — classify: question, proposal, problem, decision
 * 2. Knowledge retrieval — search for relevant facts, entities, graph connections
 * 3. Context assembly — system prompt with retrieved knowledge + conversation history
 * 4. LLM call — Claude Sonnet generates response with citations
 * 5. Fact extraction — extract new facts from the conversation
 */

import type { Database } from "@cortex/db";
import type { SearchPipeline } from "./search";
import type { FactsEngine } from "./facts";
import type { KnowledgeGraph } from "./graph";
import type { Fact } from "@cortex/shared";

// ─── Types ──────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";
export type OfficeHoursIntent = "question" | "proposal" | "problem" | "decision";

export interface OfficeHoursMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface Citation {
  type: "fact" | "entity";
  id: string;
  label: string;
  content: string;
}

export interface SuggestedPerson {
  slug: string;
  name: string;
  reason: string;
}

export interface OfficeHoursResponse {
  message: string;
  citations: Citation[];
  suggestedPeople: SuggestedPerson[];
  factsExtracted: number;
  intent: OfficeHoursIntent;
  sessionId: string;
}

export interface OfficeHoursSession {
  id: string;
  tenantId: string;
  title: string;
  messages: OfficeHoursMessage[];
  createdAt: string;
  updatedAt: string;
}

// ─── Intent Detection ───────────────────────────────────────────

const PROPOSAL_PATTERNS = [
  /\b(should we|what if|let's|propose|consider|idea|suggest|plan to)\b/i,
  /\b(how about|we could|might want to|worth|thinking about)\b/i,
];

const PROBLEM_PATTERNS = [
  /\b(broken|failing|issue|bug|error|down|outage|problem|stuck|blocked)\b/i,
  /\b(doesn't work|not working|can't|cannot|wrong with)\b/i,
];

const DECISION_PATTERNS = [
  /\b(decide|decision|choose|pick|go with|adopt|approve|sign off)\b/i,
  /\b(trade-?off|option|alternative|versus|vs\.?)\b/i,
];

function classifyOfficeHoursIntent(message: string): OfficeHoursIntent {
  for (const p of DECISION_PATTERNS) {
    if (p.test(message)) return "decision";
  }
  for (const p of PROPOSAL_PATTERNS) {
    if (p.test(message)) return "proposal";
  }
  for (const p of PROBLEM_PATTERNS) {
    if (p.test(message)) return "problem";
  }
  return "question";
}

// ─── Constants ──────────────────────────────────────────────────

const SONNET_MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MAX_CONTEXT_FACTS = 20;
const MAX_HISTORY_MESSAGES = 20;

// ─── Engine ─────────────────────────────────────────────────────

export class OfficeHoursEngine {
  constructor(
    private db: Database,
    private searchPipeline: SearchPipeline,
    private factsEngine: FactsEngine,
    private knowledgeGraph: KnowledgeGraph,
  ) {}

  /**
   * Send a message and get a knowledge-grounded response.
   */
  async chat(
    tenantId: string,
    sessionId: string,
    message: string,
    history: OfficeHoursMessage[] = [],
  ): Promise<OfficeHoursResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === "sk-ant-...") {
      return {
        message:
          "Office Hours requires an Anthropic API key. Set ANTHROPIC_API_KEY in your environment to enable conversational sessions.",
        citations: [],
        suggestedPeople: [],
        factsExtracted: 0,
        intent: "question",
        sessionId,
      };
    }

    // 1. Intent detection
    const intent = classifyOfficeHoursIntent(message);

    // 2. Knowledge retrieval
    const { facts, entities, graphContext, citations } =
      await this.retrieveContext(tenantId, message);

    // 3. Context assembly
    const systemPrompt = this.buildSystemPrompt(
      facts,
      entities,
      graphContext,
      intent,
    );

    // 4. LLM call
    const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);
    const response = await this.callLLM(
      apiKey,
      systemPrompt,
      trimmedHistory,
      message,
    );

    // 5. Fact extraction (from user message)
    const factsExtracted = await this.extractAndSaveFacts(
      tenantId,
      message,
      sessionId,
    );

    // Parse suggested people from response
    const suggestedPeople = this.parseSuggestedPeople(response, entities);

    return {
      message: response,
      citations,
      suggestedPeople,
      factsExtracted,
      intent,
      sessionId,
    };
  }

  /**
   * Retrieve relevant knowledge from the entire knowledge base.
   */
  private async retrieveContext(
    tenantId: string,
    query: string,
  ): Promise<{
    facts: Array<{ id: string; entitySlug: string; content: string; kind: string }>;
    entities: Array<{ slug: string; title: string; compiledTruth: string | null }>;
    graphContext: string[];
    citations: Citation[];
  }> {
    // Search across the knowledge base
    const searchResults = await this.searchPipeline.search({
      tenantId,
      query,
      mode: "standard",
      tokenBudget: 4000,
    });

    const citations: Citation[] = [];
    const factSet = new Map<string, { id: string; entitySlug: string; content: string; kind: string }>();
    const entitySlugs = new Set<string>();

    // Collect facts and entity references from search results
    for (const result of searchResults.results.slice(0, MAX_CONTEXT_FACTS)) {
      if (result.type === "fact") {
        factSet.set(result.id, {
          id: result.id,
          entitySlug: result.entitySlug ?? "",
          content: result.content,
          kind: "context",
        });
        citations.push({
          type: "fact",
          id: result.id,
          label: result.title,
          content: result.content,
        });
      }

      if (result.entitySlug) {
        entitySlugs.add(result.entitySlug);
      }
    }

    // Load entity cards for referenced entities
    const entities: Array<{ slug: string; title: string; compiledTruth: string | null }> = [];
    const graphContext: string[] = [];

    for (const slug of Array.from(entitySlugs).slice(0, 5)) {
      const card = await this.knowledgeGraph.entityCard(tenantId, slug);
      if (card) {
        entities.push({
          slug: card.slug,
          title: card.title,
          compiledTruth: card.compiledTruth,
        });
        citations.push({
          type: "entity",
          id: card.slug,
          label: card.title,
          content: card.compiledTruth ?? "",
        });

        // Add graph connections
        for (const neighbor of card.graph.neighbors) {
          graphContext.push(
            `${card.title} --[${neighbor.edgeType}]--> ${neighbor.title}`,
          );
        }

        // Add current facts from the entity
        for (const fact of card.currentFacts.slice(0, 5)) {
          if (!factSet.has(fact.id)) {
            factSet.set(fact.id, {
              id: fact.id,
              entitySlug: fact.entitySlug,
              content: fact.content,
              kind: fact.kind,
            });
          }
        }
      }
    }

    return {
      facts: Array.from(factSet.values()),
      entities,
      graphContext,
      citations,
    };
  }

  /**
   * Build the system prompt with retrieved knowledge context.
   */
  private buildSystemPrompt(
    facts: Array<{ id: string; entitySlug: string; content: string; kind: string }>,
    entities: Array<{ slug: string; title: string; compiledTruth: string | null }>,
    graphConnections: string[],
    intent: OfficeHoursIntent,
  ): string {
    let prompt = `You are Cortex, the company brain. You know everything the company knows.

Rules:
- Always cite sources using [fact: <fact-id>] or [entity: <entity-slug>] when referencing company knowledge.
- If the user proposes something that conflicts with existing knowledge, say so clearly and cite the conflicting fact.
- Surface relevant history when something was tried before.
- Do not hallucinate company facts. If you do not know something, say "I don't have that in the knowledge base."
- Identify who to talk to based on the knowledge graph when relevant.
- Be concise and direct. Match a professional internal tools tone.
- When suggesting people, format as: **Talk to [Name]** — reason.

`;

    // Intent-specific instructions
    switch (intent) {
      case "proposal":
        prompt += `The user is making a proposal. Check if it conflicts with existing decisions or architecture. Surface any prior attempts.\n\n`;
        break;
      case "problem":
        prompt += `The user is describing a problem. Check the knowledge base for known issues, related systems, and who owns the affected components.\n\n`;
        break;
      case "decision":
        prompt += `The user is making or discussing a decision. Surface existing decisions that may be affected. Identify stakeholders from the knowledge graph.\n\n`;
        break;
      default:
        break;
    }

    // Entity context
    if (entities.length > 0) {
      prompt += `ENTITY CARDS:\n`;
      for (const entity of entities) {
        prompt += `--- ${entity.title} [entity: ${entity.slug}] ---\n`;
        if (entity.compiledTruth) {
          prompt += `${entity.compiledTruth}\n`;
        }
        prompt += `\n`;
      }
    }

    // Facts context
    if (facts.length > 0) {
      prompt += `KNOWN FACTS:\n`;
      for (const fact of facts) {
        prompt += `- [fact: ${fact.id}] (${fact.entitySlug}, ${fact.kind}): ${fact.content}\n`;
      }
      prompt += `\n`;
    }

    // Graph connections
    if (graphConnections.length > 0) {
      prompt += `KNOWLEDGE GRAPH CONNECTIONS:\n`;
      for (const conn of graphConnections) {
        prompt += `- ${conn}\n`;
      }
      prompt += `\n`;
    }

    return prompt;
  }

  /**
   * Call Claude Sonnet with the assembled context.
   */
  private async callLLM(
    apiKey: string,
    systemPrompt: string,
    history: OfficeHoursMessage[],
    currentMessage: string,
  ): Promise<string> {
    const messages = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: currentMessage },
    ];

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: SONNET_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errText}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    return data.content[0]?.text ?? "I was unable to generate a response.";
  }

  /**
   * Extract facts from the user message and save them with source_type='office-hours'.
   */
  private async extractAndSaveFacts(
    tenantId: string,
    message: string,
    sessionId: string,
  ): Promise<number> {
    // Only extract from substantive messages (skip short questions)
    if (message.length < 80) return 0;

    try {
      // Dynamic import to avoid circular dependency
      const { extractFromText } = await import("./extraction");
      const result = await extractFromText(message, `Office Hours ${sessionId}`);

      let saved = 0;
      for (const fact of result.facts.slice(0, 5)) {
        try {
          await this.factsEngine.create(tenantId, {
            entitySlug: fact.entitySlug,
            content: fact.content,
            kind: fact.kind,
            confidence: Math.min(fact.confidence, 0.8), // Cap confidence for conversational facts
            sourceType: "manual", // Use "manual" as closest match; the sourceRef tracks office-hours origin
            sourceRef: `office-hours:${sessionId}`,
          });
          saved++;
        } catch {
          // Duplicate or invalid fact — skip silently
        }
      }
      return saved;
    } catch {
      return 0;
    }
  }

  /**
   * Parse suggested people from the LLM response by cross-referencing entity data.
   */
  private parseSuggestedPeople(
    response: string,
    entities: Array<{ slug: string; title: string; compiledTruth: string | null }>,
  ): SuggestedPerson[] {
    const people: SuggestedPerson[] = [];
    const talkToPattern = /\*\*Talk to ([^*]+)\*\*\s*[—-]\s*(.+)/g;
    let match;

    while ((match = talkToPattern.exec(response)) !== null) {
      const name = match[1].trim();
      const reason = match[2].trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      people.push({ slug, name, reason });
    }

    return people;
  }
}
