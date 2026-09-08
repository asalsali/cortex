import {
  ACK_PATTERNS,
  GREETING_PATTERNS,
  SLASH_COMMAND_PATTERN,
  QUESTION_ONLY_PATTERN,
  QUOTED_PATTERN,
  MIN_CONTENT_LENGTH,
  BULK_PASTE_THRESHOLD,
} from "./constants";
import { turnHash } from "./hash";

export type GateRejection =
  | "empty"
  | "too_short"
  | "ack_or_greeting"
  | "slash_command"
  | "question_only"
  | "quoted_or_tool_output"
  | "bulk_paste"
  | "duplicate";

export interface GateResult {
  passed: boolean;
  rejection?: GateRejection;
  hash: string;
}

const seenHashes = new Set<string>();
const MAX_SEEN = 100_000;

/**
 * Ambient writeback gate: deterministic zero-LLM pre-filter.
 * Returns whether content should proceed to extraction.
 *
 * 7 rules from the architecture doc:
 * 1. empty
 * 2. too_short
 * 3. ack_or_greeting
 * 4. slash_command
 * 5. question_only
 * 6. quoted_or_tool_output
 * 7. bulk_paste (large code blocks without commentary)
 */
export function writebackGate(content: string): GateResult {
  const hash = turnHash(content);

  // Rule 0: Dedup via turn hash
  if (seenHashes.has(hash)) {
    return { passed: false, rejection: "duplicate", hash };
  }

  const trimmed = content.trim();

  // Rule 1: Empty
  if (trimmed.length === 0) {
    return { passed: false, rejection: "empty", hash };
  }

  // Rule 2: Too short
  if (trimmed.length < MIN_CONTENT_LENGTH) {
    return { passed: false, rejection: "too_short", hash };
  }

  // Rule 3: Ack or greeting
  for (const pattern of ACK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { passed: false, rejection: "ack_or_greeting", hash };
    }
  }
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { passed: false, rejection: "ack_or_greeting", hash };
    }
  }

  // Rule 4: Slash command
  if (SLASH_COMMAND_PATTERN.test(trimmed)) {
    return { passed: false, rejection: "slash_command", hash };
  }

  // Rule 5: Question only (just question marks)
  if (QUESTION_ONLY_PATTERN.test(trimmed)) {
    return { passed: false, rejection: "question_only", hash };
  }

  // Rule 6: Quoted or tool output (entire message is quoted)
  const lines = trimmed.split("\n");
  const quotedLines = lines.filter((l) => QUOTED_PATTERN.test(l));
  if (quotedLines.length === lines.length && lines.length > 0) {
    return { passed: false, rejection: "quoted_or_tool_output", hash };
  }

  // Rule 7: Bulk paste (large content that is mostly code)
  if (trimmed.length > BULK_PASTE_THRESHOLD) {
    const codeBlockCount = (trimmed.match(/```/g) || []).length;
    const codeBlockPairs = Math.floor(codeBlockCount / 2);
    // Extract text outside code blocks
    const withoutCode = trimmed.replace(/```[\s\S]*?```/g, "");
    const commentaryLength = withoutCode.trim().length;
    // If most content is in code blocks and commentary is minimal, reject
    if (codeBlockPairs > 0 && commentaryLength < 100) {
      return { passed: false, rejection: "bulk_paste", hash };
    }
  }

  // Content passed all gates -- mark hash as seen
  if (seenHashes.size >= MAX_SEEN) {
    seenHashes.clear();
  }
  seenHashes.add(hash);

  return { passed: true, hash };
}
