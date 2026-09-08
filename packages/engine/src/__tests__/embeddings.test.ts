import { describe, test, expect, beforeEach } from "bun:test";
import { EmbeddingService } from "../embeddings";

describe("EmbeddingService", () => {
  test("isAvailable returns false when no API key", () => {
    const original = process.env.VOYAGE_API_KEY;
    delete process.env.VOYAGE_API_KEY;

    const service = new EmbeddingService();
    expect(service.isAvailable()).toBe(false);

    if (original) process.env.VOYAGE_API_KEY = original;
  });

  test("isAvailable returns false for placeholder key", () => {
    const original = process.env.VOYAGE_API_KEY;
    process.env.VOYAGE_API_KEY = "pa-...";

    const service = new EmbeddingService();
    expect(service.isAvailable()).toBe(false);

    if (original) {
      process.env.VOYAGE_API_KEY = original;
    } else {
      delete process.env.VOYAGE_API_KEY;
    }
  });

  test("embed returns empty array when unavailable", async () => {
    const original = process.env.VOYAGE_API_KEY;
    delete process.env.VOYAGE_API_KEY;

    const service = new EmbeddingService();
    const result = await service.embed(["test text"]);
    expect(result).toEqual([]);

    if (original) process.env.VOYAGE_API_KEY = original;
  });

  test("embedQuery returns null when unavailable", async () => {
    const original = process.env.VOYAGE_API_KEY;
    delete process.env.VOYAGE_API_KEY;

    const service = new EmbeddingService();
    const result = await service.embedQuery("test query");
    expect(result).toBeNull();

    if (original) process.env.VOYAGE_API_KEY = original;
  });
});
