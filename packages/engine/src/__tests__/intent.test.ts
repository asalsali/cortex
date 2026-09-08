import { describe, test, expect } from "bun:test";
import { classifyIntent } from "../intent";

describe("classifyIntent", () => {
  test("classifies entity queries", () => {
    expect(classifyIntent("who is Sarah Chen").intent).toBe("entity");
    expect(classifyIntent("what is the user service").intent).toBe("entity");
    expect(classifyIntent("tell me about the payment gateway").intent).toBe("entity");
  });

  test("classifies temporal queries", () => {
    expect(classifyIntent("when did we switch to Postgres").intent).toBe("temporal");
    expect(classifyIntent("show me the history of the auth service").intent).toBe("temporal");
    expect(classifyIntent("what changed since 2025-01").intent).toBe("temporal");
    expect(classifyIntent("what did we use previously for caching").intent).toBe("temporal");
  });

  test("classifies concept queries", () => {
    expect(classifyIntent("how does our deployment process work").intent).toBe("concept");
    expect(classifyIntent("explain the data pipeline").intent).toBe("concept");
    expect(classifyIntent("why do we use microservices").intent).toBe("concept");
  });

  test("defaults to general for unclassified queries", () => {
    expect(classifyIntent("database performance").intent).toBe("general");
    expect(classifyIntent("API rate limits").intent).toBe("general");
  });

  test("temporal queries get strong recency mode", () => {
    const result = classifyIntent("when did we change the pricing model");
    expect(result.recencyMode).toBe("strong");
  });

  test("entity queries get strong salience mode", () => {
    const result = classifyIntent("who is the tech lead");
    expect(result.salienceMode).toBe("strong");
  });

  test("general queries get moderate recency", () => {
    const result = classifyIntent("Redis caching strategy");
    expect(result.recencyMode).toBe("moderate");
  });
});
