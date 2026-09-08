import { describe, test, expect } from "bun:test";
import { chunkText } from "../chunking";

describe("chunkText", () => {
  test("returns single chunk for short text", () => {
    const chunks = chunkText("This is short text.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].text).toBe("This is short text.");
    expect(chunks[0].source).toBe("content");
  });

  test("splits long text into multiple chunks", () => {
    const text = Array(50).fill("This is a sentence with enough words to fill space.").join(" ");
    const chunks = chunkText(text, { chunkSize: 500 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  test("chunks have sequential indexes", () => {
    const text = Array(50).fill("A moderately long sentence for testing.").join(" ");
    const chunks = chunkText(text, { chunkSize: 200 });
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].index).toBe(i);
    }
  });

  test("respects source parameter", () => {
    const chunks = chunkText("Test content", { source: "compiled_truth" });
    expect(chunks[0].source).toBe("compiled_truth");
  });
});
