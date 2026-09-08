import { describe, test, expect } from "bun:test";
import { estimateTokens, packByBudget } from "../tokens";

describe("estimateTokens", () => {
  test("estimates ~4 chars per token", () => {
    expect(estimateTokens("hello world")).toBe(3); // 11 chars / 4 = 2.75, ceil = 3
  });

  test("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("packByBudget", () => {
  test("packs items within budget, highest score first", () => {
    const items = [
      { content: "a".repeat(100), score: 0.5 },
      { content: "b".repeat(100), score: 0.9 },
      { content: "c".repeat(100), score: 0.7 },
    ];
    const { packed } = packByBudget(items, 60); // 100 chars = 25 tokens, budget allows 2
    expect(packed.length).toBe(2);
    expect(packed[0].score).toBe(0.9); // highest first
    expect(packed[1].score).toBe(0.7); // second highest
  });

  test("returns empty for zero budget", () => {
    const items = [{ content: "hello", score: 1.0 }];
    const { packed } = packByBudget(items, 0);
    expect(packed).toHaveLength(0);
  });

  test("tracks token count", () => {
    const items = [{ content: "a".repeat(40), score: 1.0 }]; // 40 chars = 10 tokens
    const { tokenCount } = packByBudget(items, 100);
    expect(tokenCount).toBe(10);
  });
});
