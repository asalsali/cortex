/**
 * Entity and fact extraction from raw text.
 * Uses Anthropic Claude Haiku when API key is available.
 * Falls back to regex-based extraction otherwise.
 */

import type { FactKind } from "@cortex/shared";

export interface ExtractedFact {
  entityName: string;
  entitySlug: string;
  content: string;
  kind: FactKind;
  confidence: number;
}

export interface ExtractedEntity {
  name: string;
  slug: string;
  type: "person" | "project" | "system" | "team" | "concept" | "decision";
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  facts: ExtractedFact[];
  method: "llm" | "regex";
}

const HAIKU_MODEL = "claude-3-5-haiku-20241022";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Extract entities and facts from raw text.
 * Uses Anthropic Haiku if ANTHROPIC_API_KEY is set, otherwise regex fallback.
 */
export async function extractFromText(
  text: string,
  title: string
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey && apiKey !== "sk-ant-...") {
    try {
      return await extractWithLLM(text, title, apiKey);
    } catch (err) {
      console.error("[Extraction] LLM extraction failed, falling back to regex:", err);
      return extractWithRegex(text, title);
    }
  }

  return extractWithRegex(text, title);
}

/**
 * LLM-based extraction using Anthropic Claude Haiku.
 */
async function extractWithLLM(
  text: string,
  title: string,
  apiKey: string
): Promise<ExtractionResult> {
  const prompt = `Analyze the following document and extract structured knowledge.

Title: ${title}

Content:
${text.slice(0, 8000)}

Extract ALL entities (people, projects, systems, teams, concepts, decisions) and facts from this text.

Respond with ONLY a JSON object (no markdown, no code fences) in this exact format:
{
  "entities": [
    {"name": "Entity Name", "type": "person|project|system|team|concept|decision"}
  ],
  "facts": [
    {"entityName": "Entity Name", "content": "A specific fact about this entity", "kind": "decision|architecture|process|policy|context|event", "confidence": 0.9}
  ]
}

Rules:
- Each fact must be a single, specific, self-contained statement
- confidence: 1.0 = explicitly stated, 0.8 = strongly implied, 0.6 = inferred
- kind: use "architecture" for technical decisions, "process" for workflows, "decision" for choices made, "context" for background info, "event" for things that happened, "policy" for rules
- Extract 3-15 facts depending on document length
- Entity names should be the canonical form (e.g., "PostgreSQL" not "postgres")`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const responseText = data.content[0]?.text ?? "{}";

  // Parse JSON from response (handle potential markdown fences)
  let json: any;
  try {
    const cleaned = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    json = JSON.parse(cleaned);
  } catch {
    console.error("[Extraction] Failed to parse LLM response:", responseText.slice(0, 200));
    return extractWithRegex(text, title);
  }

  const entities: ExtractedEntity[] = (json.entities ?? []).map((e: any) => ({
    name: e.name,
    slug: slugify(e.name),
    type: e.type ?? "concept",
  }));

  const facts: ExtractedFact[] = (json.facts ?? []).map((f: any) => ({
    entityName: f.entityName,
    entitySlug: slugify(f.entityName),
    content: f.content,
    kind: validateKind(f.kind),
    confidence: Math.min(1.0, Math.max(0.0, f.confidence ?? 0.8)),
  }));

  return { entities, facts, method: "llm" };
}

/**
 * Regex-based extraction fallback.
 * Extracts capitalized proper nouns as entities and creates basic facts.
 */
export function extractWithRegex(
  text: string,
  title: string
): ExtractionResult {
  const entities: ExtractedEntity[] = [];
  const facts: ExtractedFact[] = [];
  const seen = new Set<string>();

  // Extract capitalized multi-word proper nouns (2+ words starting with uppercase)
  const properNounPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  let match;

  while ((match = properNounPattern.exec(text)) !== null) {
    const name = match[1];
    const slug = slugify(name);
    if (!seen.has(slug) && name.length > 3) {
      seen.add(slug);
      entities.push({
        name,
        slug,
        type: guessEntityType(name),
      });
    }
  }

  // Extract single capitalized words that appear multiple times
  const singleCapPattern = /\b([A-Z][a-z]{2,}(?:(?:DB|SQL|API|SDK|CLI)\b)?)\b/g;
  const wordCounts = new Map<string, number>();
  while ((match = singleCapPattern.exec(text)) !== null) {
    const word = match[1];
    wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
  }

  for (const [word, count] of wordCounts) {
    if (count >= 2) {
      const slug = slugify(word);
      if (!seen.has(slug) && !isCommonWord(word)) {
        seen.add(slug);
        entities.push({
          name: word,
          slug,
          type: guessEntityType(word),
        });
      }
    }
  }

  // Also extract tech terms (PascalCase, camelCase patterns)
  const techPattern = /\b([A-Z][a-z]+[A-Z][a-zA-Z]*)\b/g;
  while ((match = techPattern.exec(text)) !== null) {
    const name = match[1];
    const slug = slugify(name);
    if (!seen.has(slug)) {
      seen.add(slug);
      entities.push({ name, slug, type: "system" });
    }
  }

  // Create basic facts from sentences containing entities
  const sentences = text.split(/[.!?]\s+/);
  for (const entity of entities.slice(0, 10)) {
    const relevant = sentences.filter((s) =>
      s.toLowerCase().includes(entity.name.toLowerCase())
    );
    for (const sentence of relevant.slice(0, 2)) {
      const content = sentence.trim();
      if (content.length > 20 && content.length < 500) {
        facts.push({
          entityName: entity.name,
          entitySlug: entity.slug,
          content,
          kind: "context",
          confidence: 0.6,
        });
      }
    }
  }

  // Create a fact for the title entity itself
  const titleSlug = slugify(title);
  if (!seen.has(titleSlug)) {
    entities.unshift({
      name: title,
      slug: titleSlug,
      type: "concept",
    });
  }

  return { entities, facts, method: "regex" };
}

/**
 * Consolidate facts for an entity into compiled truth using Anthropic Sonnet.
 */
export async function consolidateWithLLM(
  entitySlug: string,
  entityTitle: string,
  factsTexts: string[],
  existingCompiledTruth: string | null
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-...") {
    return null;
  }

  const prompt = `You are synthesizing knowledge about "${entityTitle}" from multiple facts into a single, coherent knowledge card.

${existingCompiledTruth ? `Existing compiled truth (update this):\n${existingCompiledTruth}\n\n` : ""}New facts to incorporate:
${factsTexts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Write a concise, authoritative summary (2-5 paragraphs) that:
- Synthesizes all facts into a coherent narrative
- Highlights the most important/recent information
- Notes any contradictions between facts
- Uses present tense for current state, past tense for historical facts

Write ONLY the compiled truth text, no headers or metadata.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error(`[Consolidation] Anthropic API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    return data.content[0]?.text ?? null;
  } catch (err) {
    console.error("[Consolidation] LLM call failed:", err);
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateKind(kind: string): FactKind {
  const valid: FactKind[] = [
    "decision",
    "architecture",
    "process",
    "policy",
    "context",
    "event",
  ];
  return valid.includes(kind as FactKind) ? (kind as FactKind) : "context";
}

function guessEntityType(
  name: string
): ExtractedEntity["type"] {
  // Simple heuristics
  if (/\b(team|group|squad|dept)\b/i.test(name)) return "team";
  if (/\b(project|initiative|program)\b/i.test(name)) return "project";
  if (/\b(system|service|api|server|database|db)\b/i.test(name)) return "system";
  if (/\b(decision|rfc|adr)\b/i.test(name)) return "decision";
  // Default: if it looks like a person name (two capitalized words), it's a person
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) return "person";
  return "concept";
}

function isCommonWord(word: string): boolean {
  const common = new Set([
    "The",
    "This",
    "That",
    "These",
    "Those",
    "When",
    "Where",
    "What",
    "Which",
    "While",
    "With",
    "From",
    "Into",
    "About",
    "After",
    "Before",
    "Between",
    "Through",
    "During",
    "Without",
    "Within",
    "Along",
    "Among",
    "Because",
    "However",
    "Although",
    "Since",
    "Until",
    "Unless",
    "Also",
    "Then",
    "Once",
    "Here",
    "There",
    "Each",
    "Every",
    "Some",
    "Many",
    "Most",
    "Other",
    "Another",
    "Both",
    "Only",
    "Just",
    "More",
    "Still",
    "Very",
    "Much",
    "Well",
    "Even",
    "Such",
    "Rather",
    "Quite",
    "Already",
    "Often",
    "Never",
    "Always",
    "Sometimes",
    "Perhaps",
    "Indeed",
    "Thus",
    "Hence",
    "Therefore",
    "Furthermore",
    "Moreover",
    "Meanwhile",
    "Instead",
    "Otherwise",
    "Nonetheless",
    "Nevertheless",
  ]);
  return common.has(word);
}
