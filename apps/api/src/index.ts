import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createDb } from "@cortex/db";
import { SearchPipeline, FactsEngine, KnowledgeGraph } from "@cortex/engine";
import { tenantMiddleware } from "./middleware/tenant";
import { errorHandler } from "./middleware/error";
import { healthRoute } from "./routes/health";
import { searchRoutes } from "./routes/search";
import { factsRoutes } from "./routes/facts";
import { entityRoutes } from "./routes/entity";
import { timelineRoutes } from "./routes/timeline";
import { ingestRoutes } from "./routes/ingest";
import { billingRoutes } from "./routes/billing";
import { slackRoutes } from "./routes/slack";
import { startMcpServer } from "./mcp/server";

// ─── Database ────────────────────────────────────────────────────

let db: ReturnType<typeof createDb> | null = null;
let searchPipeline: SearchPipeline | null = null;
let factsEngine: FactsEngine | null = null;
let knowledgeGraph: KnowledgeGraph | null = null;

try {
  db = createDb();
  searchPipeline = new SearchPipeline(db);
  factsEngine = new FactsEngine(db);
  knowledgeGraph = new KnowledgeGraph(db);
} catch (e) {
  console.warn("Database not available — API will return 503 on data routes");
}

// ─── App ─────────────────────────────────────────────────────────

export type AppEnv = {
  Variables: {
    tenantId: string;
    userId?: string;
    db: typeof db;
    search: SearchPipeline;
    facts: FactsEngine;
    graph: KnowledgeGraph;
  };
};

const app = new Hono<AppEnv>();

// Global middleware
app.use("*", logger());
app.use("*", cors());
app.use("*", errorHandler());

// Inject engine instances into context
app.use("/api/*", async (c, next) => {
  if (!db) {
    return c.json({ error: "Database not connected" }, 503);
  }
  c.set("db", db);
  c.set("search", searchPipeline!);
  c.set("facts", factsEngine!);
  c.set("graph", knowledgeGraph!);
  await next();
});

// Tenant middleware on API routes (not health)
app.use("/api/*", tenantMiddleware());

// Routes
app.route("/", healthRoute);
app.route("/api/v1", searchRoutes);
app.route("/api/v1", factsRoutes);
app.route("/api/v1", entityRoutes);
app.route("/api/v1", timelineRoutes);
app.route("/api/v1", ingestRoutes);
app.route("/api/v1", billingRoutes);
app.route("/api/v1", slackRoutes);

// ─── Start servers ───────────────────────────────────────────────

const API_PORT = Number(process.env.API_PORT) || 4000;
const MCP_PORT = Number(process.env.MCP_PORT) || 4001;

console.log(`Cortex API server starting on port ${API_PORT}`);
console.log(`Cortex MCP server starting on port ${MCP_PORT}`);

// Start MCP server (only if DB is available)
if (factsEngine && searchPipeline && knowledgeGraph) {
  startMcpServer(MCP_PORT, { factsEngine, searchPipeline, knowledgeGraph });
} else {
  console.warn("MCP server skipped — no database connection");
}

export default {
  port: API_PORT,
  fetch: app.fetch,
};
