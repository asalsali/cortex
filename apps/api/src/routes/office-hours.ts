import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../index";
import { OfficeHoursEngine } from "@cortex/engine";
import type { OfficeHoursMessage, OfficeHoursSession } from "@cortex/engine";

// ─── In-memory session store ────────────────────────────────────
// Production would use a DB table. For MVP, in-memory is sufficient.

const sessions = new Map<string, OfficeHoursSession>();

function generateId(): string {
  return `oh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Schemas ────────────────────────────────────────────────────

const chatSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1).max(10000),
});

// ─── Routes ─────────────────────────────────────────────────────

export const officeHoursRoutes = new Hono<AppEnv>();

/**
 * POST /api/v1/office-hours/chat — Send a message, get a knowledge-grounded response.
 */
officeHoursRoutes.post("/office-hours/chat", async (c) => {
  const body = await c.req.json();
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.issues },
      400,
    );
  }

  const tenantId = c.get("tenantId");
  const db = c.get("db")!;
  const search = c.get("search");
  const facts = c.get("facts");
  const graph = c.get("graph");

  const engine = new OfficeHoursEngine(db, search, facts, graph);

  // Resolve or create session
  let sessionId = parsed.data.sessionId;
  let session: OfficeHoursSession;

  if (sessionId && sessions.has(`${tenantId}:${sessionId}`)) {
    session = sessions.get(`${tenantId}:${sessionId}`)!;
  } else {
    sessionId = generateId();
    session = {
      id: sessionId,
      tenantId,
      title: parsed.data.message.slice(0, 80),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.set(`${tenantId}:${sessionId}`, session);
  }

  // Call the engine
  const result = await engine.chat(
    tenantId,
    sessionId,
    parsed.data.message,
    session.messages,
  );

  // Append messages to session
  const userMsg: OfficeHoursMessage = {
    role: "user",
    content: parsed.data.message,
    timestamp: new Date().toISOString(),
  };
  const assistantMsg: OfficeHoursMessage = {
    role: "assistant",
    content: result.message,
    timestamp: new Date().toISOString(),
  };

  session.messages.push(userMsg, assistantMsg);
  session.updatedAt = new Date().toISOString();

  return c.json(result);
});

/**
 * GET /api/v1/office-hours/sessions — List past sessions for this tenant.
 */
officeHoursRoutes.get("/office-hours/sessions", async (c) => {
  const tenantId = c.get("tenantId");

  const tenantSessions = Array.from(sessions.values())
    .filter((s) => s.tenantId === tenantId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .map((s) => ({
      id: s.id,
      title: s.title,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

  return c.json(tenantSessions);
});

/**
 * GET /api/v1/office-hours/sessions/:sessionId — Full session history.
 */
officeHoursRoutes.get("/office-hours/sessions/:sessionId", async (c) => {
  const tenantId = c.get("tenantId");
  const sessionId = c.req.param("sessionId");

  const session = sessions.get(`${tenantId}:${sessionId}`);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json(session);
});
