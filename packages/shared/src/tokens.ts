/**
 * Simple token estimation: ~4 characters per token (English text).
 * Good enough for budget enforcement; not a tokenizer.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Pack items into a token budget, highest-score-first (greedy).
 * Returns the items that fit within the budget.
 */
export function packByBudget<T extends { content: string; score: number }>(
  items: T[],
  budget: number
): { packed: T[]; tokenCount: number } {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const packed: T[] = [];
  let tokenCount = 0;

  for (const item of sorted) {
    const itemTokens = estimateTokens(item.content);
    if (tokenCount + itemTokens > budget) continue;
    packed.push(item);
    tokenCount += itemTokens;
  }

  return { packed, tokenCount };
}
