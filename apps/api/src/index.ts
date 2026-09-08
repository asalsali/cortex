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
import { startMcpServer } from "./mcp/server";

// ─── Database ────────────────────────────────────────────────────

const db = createDb();

// ─── Engine instances ────────────────────────────────────────────

const searchPipeline = new SearchPipeline(db);
const factsEngine = new FactsEngine(db);
const knowledgeGraph = new KnowledgeGraph(db);

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
  c.set("db", db);
  c.set("search", searchPipeline);
  c.set("facts", factsEngine);
  c.set("graph", knowledgeGraph);
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

// ─── Start servers ───────────────────────────────────────────────

const API_PORT = Number(process.env.API_PORT) || 3001;
const MCP_PORT = Number(process.env.MCP_PORT) || 3002;

console.log(`Cortex API server starting on port ${API_PORT}`);
console.log(`Cortex MCP server starting on port ${MCP_PORT}`);

// Start MCP server
startMcpServer(MCP_PORT, { factsEngine, searchPipeline, knowledgeGraph });

export default {
  port: API_PORT,
  fetch: app.fetch,
};
