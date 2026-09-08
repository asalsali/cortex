import { describe, test, expect } from "bun:test";
import { writebackGate } from "../writeback-gate";

describe("writebackGate", () => {
  // Rule 1: empty
  test("rejects empty content", () => {
    expect(writebackGate("").passed).toBe(false);
    expect(writebackGate("").rejection).toBe("empty");
  });

  test("rejects whitespace-only content", () => {
    expect(writebackGate("   ").passed).toBe(false);
    expect(writebackGate("   ").rejection).toBe("empty");
  });

  // Rule 2: too_short
  test("rejects content shorter than 3 characters", () => {
    expect(writebackGate("hi").passed).toBe(false);
    expect(writebackGate("hi").rejection).toBe("too_short");
  });

  test("rejects single character", () => {
    expect(writebackGate("k").passed).toBe(false);
    expect(writebackGate("k").rejection).toBe("too_short");
  });

  // Rule 3: ack_or_greeting
  test("rejects acknowledgments (longer than 3 chars)", () => {
    const acks = ["thanks", "sure", "nice", "cool", "got it"];
    for (const ack of acks) {
      const result = writebackGate(ack);
      expect(result.passed).toBe(false);
      expect(result.rejection).toBe("ack_or_greeting");
    }
  });

  test("rejects short acks via too_short rule", () => {
    const shortAcks = ["ok", "np", "+1"];
    for (const ack of shortAcks) {
      const result = writebackGate(ack);
      expect(result.passed).toBe(false);
      // Caught by too_short before ack_or_greeting
      expect(result.rejection).toBe("too_short");
    }
  });

  test("rejects greetings", () => {
    const greetings = ["hello", "good morning"];
    for (const greeting of greetings) {
      const result = writebackGate(greeting);
      expect(result.passed).toBe(false);
      expect(result.rejection).toBe("ack_or_greeting");
    }
  });

  // Rule 4: slash_command
  test("rejects slash commands", () => {
    expect(writebackGate("/remind me at 3pm").passed).toBe(false);
    expect(writebackGate("/remind me at 3pm").rejection).toBe("slash_command");
  });

  // Rule 5: question_only
  test("rejects question-mark-only messages", () => {
    expect(writebackGate("???").passed).toBe(false);
    expect(writebackGate("???").rejection).toBe("question_only");
  });

  // Rule 6: quoted_or_tool_output
  test("rejects fully quoted messages", () => {
    const result = writebackGate("> This is quoted\n> All of it");
    expect(result.passed).toBe(false);
    expect(result.rejection).toBe("quoted_or_tool_output");
  });

  test("passes messages with partial quotes", () => {
    const result = writebackGate("> Quoted part\nBut also original commentary here");
    expect(result.passed).toBe(true);
  });

  // Rule 7: bulk_paste
  test("rejects large code blocks without commentary", () => {
    const code = "```\n" + "x".repeat(2500) + "\n```";
    const result = writebackGate(code);
    expect(result.passed).toBe(false);
    expect(result.rejection).toBe("bulk_paste");
  });

  test("passes large code blocks with commentary", () => {
    const content =
      "Here is the implementation of the new auth system. It handles JWT validation, " +
      "session management, and role-based access control.\n\n" +
      "```\n" + "x".repeat(2500) + "\n```";
    const result = writebackGate(content);
    expect(result.passed).toBe(true);
  });

  // Valid content
  test("passes meaningful content", () => {
    expect(writebackGate("We decided to migrate from MongoDB to Postgres for the user service").passed).toBe(true);
  });

  test("passes technical discussion", () => {
    expect(writebackGate("The API latency increased by 30% after deploying v2.1 of the payment service").passed).toBe(true);
  });

  // Hash idempotency
  test("returns consistent hashes for identical content", () => {
    const r1 = writebackGate("We should use pgvector for embeddings");
    const r2 = writebackGate("We should use pgvector for embeddings");
    expect(r1.hash).toBe(r2.hash);
  });
});
