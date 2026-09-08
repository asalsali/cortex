import type { SearchIntent } from "@cortex/shared";

export interface IntentResult {
  intent: SearchIntent;
  salienceMode: "off" | "on" | "strong";
  recencyMode: "off" | "moderate" | "strong";
}

const ENTITY_PATTERNS = [
  /^(who|what) (is|are|was|were) /i,
  /^tell me about /i,
  /^(show|get) .*(?:entity|person|project|system|service)/i,
];

const TEMPORAL_PATTERNS = [
  /\b(when|history|timeline|changed|evolved|used to|previously)\b/i,
  /\b(before|after|since|until|ago)\b/i,
  /\b\d{4}[-/]\d{2}\b/,
];

const CONCEPT_PATTERNS = [
  /\b(how|why|explain|what does .* mean)\b/i,
  /\b(process|workflow|pattern|principle)\b/i,
];

/**
 * Classify query intent using regex patterns (zero-LLM).
 * Stage 1 of the search pipeline.
 */
export function classifyIntent(query: string): IntentResult {
  for (const pattern of TEMPORAL_PATTERNS) {
    if (pattern.test(query)) {
      return { intent: "temporal", salienceMode: "on", recencyMode: "strong" };
    }
  }

  for (const pattern of ENTITY_PATTERNS) {
    if (pattern.test(query)) {
      return { intent: "entity", salienceMode: "strong", recencyMode: "off" };
    }
  }

  for (const pattern of CONCEPT_PATTERNS) {
    if (pattern.test(query)) {
      return { intent: "concept", salienceMode: "on", recencyMode: "off" };
    }
  }

  return { intent: "general", salienceMode: "off", recencyMode: "moderate" };
}
