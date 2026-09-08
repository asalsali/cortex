import { describe, test, expect } from "bun:test";
import { extractWithRegex } from "../extraction";

describe("extractWithRegex", () => {
  test("extracts proper nouns as entities", () => {
    const text =
      "Sarah Chen leads the Auth Service team. She works with James Liu on the Data Pipeline project.";
    const result = extractWithRegex(text, "Team Overview");

    const entityNames = result.entities.map((e) => e.name);
    expect(entityNames).toContain("Sarah Chen");
    expect(entityNames).toContain("James Liu");
    expect(entityNames).toContain("Auth Service");
    expect(entityNames).toContain("Data Pipeline");
    expect(result.method).toBe("regex");
  });

  test("creates facts from sentences containing entities", () => {
    const text =
      "The Auth Service handles user authentication and session management. It was built using Node.js and Express. Sarah Chen is the tech lead for this service.";
    const result = extractWithRegex(text, "Auth Service");

    expect(result.facts.length).toBeGreaterThan(0);
    // Facts should reference entities found in the text
    const factSlugs = result.facts.map((f) => f.entitySlug);
    expect(factSlugs.some((s) => s === "auth-service" || s === "sarah-chen")).toBe(true);
  });

  test("assigns correct entity types", () => {
    const text =
      "Sarah Chen and James Liu are on the Platform Team. They maintain the API Gateway system.";
    const result = extractWithRegex(text, "Team Members");

    const sarah = result.entities.find((e) => e.name === "Sarah Chen");
    expect(sarah?.type).toBe("person");

    const team = result.entities.find((e) => e.name === "Platform Team");
    expect(team?.type).toBe("team");
  });

  test("generates slugs correctly", () => {
    const text = "The Data Pipeline V2 project was started by Alex Kim.";
    const result = extractWithRegex(text, "Project Update");

    const pipeline = result.entities.find((e) => e.name === "Alex Kim");
    expect(pipeline?.slug).toBe("alex-kim");
  });

  test("handles empty content", () => {
    const result = extractWithRegex("", "Empty Doc");
    expect(result.entities.length).toBeGreaterThanOrEqual(1); // title entity
    expect(result.facts.length).toBe(0);
    expect(result.method).toBe("regex");
  });

  test("filters common English words", () => {
    const text = "However, the system was working. Although there were issues, the team resolved them.";
    const result = extractWithRegex(text, "Status Update");

    const entityNames = result.entities.map((e) => e.name);
    expect(entityNames).not.toContain("However");
    expect(entityNames).not.toContain("Although");
  });

  test("all facts have valid kinds", () => {
    const text =
      "Sarah Chen decided to migrate the Auth Service from MongoDB to PostgreSQL. The decision was made in Q1 2025.";
    const result = extractWithRegex(text, "Migration");

    const validKinds = ["decision", "architecture", "process", "policy", "context", "event"];
    for (const fact of result.facts) {
      expect(validKinds).toContain(fact.kind);
    }
  });
});
