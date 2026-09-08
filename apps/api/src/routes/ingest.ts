import { Hono } from "hono";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { schema } from "@cortex/db";
import { contentHash, chunkText } from "@cortex/shared";
import { extractFromText } from "@cortex/engine";
import type { AppEnv } from "../index";

const ingestSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(["entity", "document", "decision", "transcript"]).optional(),
  sourceType: z.enum(["slack", "notion", "git", "manual", "agent", "meeting", "google_docs"]).optional(),
  sourceRef: z.string().optional(),
  extract: z.boolean().optional(), // whether to run entity extraction
});

export const ingestRoutes = new Hono<AppEnv>();

/**
 * POST /api/v1/ingest -- Manual content upload.
 * Creates a page, chunks it, and optionally extracts entities/facts.
 */
ingestRoutes.post("/ingest", async (c) => {
  const body = await c.req.json();
  const parsed = ingestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const tenantId = c.get("tenantId");
  const db = c.get("db");
  const { title, content, type, sourceType, sourceRef } = parsed.data;
  const shouldExtract = parsed.data.extract ?? true;

  // Generate slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const hash = contentHash(content);

  // Check for duplicate
  const existing = await db
    .select({ id: schema.pages.id })
    .from(schema.pages)
    .where(
      and(eq(schema.pages.tenantId, tenantId), eq(schema.pages.contentHash, hash))
    )
    .limit(1);

  if (existing.length > 0) {
    return c.json({ pageId: existing[0].id, status: "duplicate" }, 200);
  }

  // Create page
  const [page] = await db
    .insert(schema.pages)
    .values({
      tenantId,
      slug,
      type: type ?? "document",
      title,
      rawContent: content,
      sourceType: sourceType ?? "manual",
      sourceRef: sourceRef ?? null,
      contentHash: hash,
      extractedBy: "human",
    })
    .returning({ id: schema.pages.id });

  // Chunk content and insert
  const chunks = chunkText(content);
  if (chunks.length > 0) {
    await db.insert(schema.contentChunks).values(
      chunks.map((chunk) => ({
        pageId: page.id,
        tenantId,
        chunkIndex: chunk.index,
        chunkText: chunk.text,
        chunkSource: chunk.source,
      }))
    );
  }

  // Entity extraction (LLM with regex fallback)
  let factsCreated = 0;
  let entitiesFound = 0;
  let extractionMethod = "none";

  if (shouldExtract) {
    try {
      const extraction = await extractFromText(content, title);
      extractionMethod = extraction.method;
      entitiesFound = extraction.entities.length;

      // Create entity pages for newly discovered entities
      for (const entity of extraction.entities) {
        try {
          await db
            .insert(schema.pages)
            .values({
              tenantId,
              slug: entity.slug,
              type: "entity",
              title: entity.name,
              sourceType: sourceType ?? "manual",
              extractedBy: extraction.method === "llm" ? "llm" : "connector",
            })
            .onConflictDoNothing();
        } catch {
          // Entity page may already exist, that is fine
        }
      }

      // Insert extracted facts
      for (const fact of extraction.facts) {
        try {
          const factHash = contentHash(fact.content);
          await db
            .insert(schema.facts)
            .values({
              tenantId,
              entitySlug: fact.entitySlug,
              content: fact.content,
              kind: fact.kind,
              confidence: fact.confidence,
              visibility: "public",
              sourceType: sourceType ?? "manual",
              sourceRef: sourceRef ?? null,
              extractedBy: extraction.method === "llm" ? "llm" : "connector",
              contentHash: factHash,
            });
          factsCreated++;
        } catch {
          // Duplicate facts are skipped
        }
      }
    } catch (err) {
      console.error("[Ingest] Extraction error (non-fatal):", err);
    }
  }

  return c.json(
    {
      pageId: page.id,
      slug,
      chunksCreated: chunks.length,
      factsCreated,
      entitiesFound,
      extractionMethod,
      status: "created",
    },
    201
  );
});
