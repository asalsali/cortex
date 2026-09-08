import { describe, test, expect } from "bun:test";
import { contentHash, turnHash } from "../hash";

describe("contentHash", () => {
  test("produces consistent SHA-256 hex", () => {
    const hash = contentHash("hello world");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(contentHash("hello world"));
  });

  test("different content produces different hashes", () => {
    expect(contentHash("hello")).not.toBe(contentHash("world"));
  });
});

describe("turnHash", () => {
  test("normalizes whitespace before hashing", () => {
    expect(turnHash("hello  world")).toBe(turnHash("hello world"));
  });

  test("is case-insensitive", () => {
    expect(turnHash("Hello World")).toBe(turnHash("hello world"));
  });

  test("truncates to 24 characters", () => {
    expect(turnHash("some content")).toHaveLength(24);
  });

  test("trims leading/trailing whitespace", () => {
    expect(turnHash("  hello  ")).toBe(turnHash("hello"));
  });
});
