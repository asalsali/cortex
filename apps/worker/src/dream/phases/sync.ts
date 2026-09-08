import { eq, and } from "drizzle-orm";
import { schema } from "@cortex/db";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * SYNC phase: Pull new content from all connected integrations.
 * Currently logs sync intent -- actual connector sync is deferred until
 * source connectors are fully wired (Slack OAuth, Notion, etc.).
 */
export async function syncPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  let itemsProcessed = 0;
  const errors: string[] = [];

  // Get active integrations for this tenant
  const integrations = await ctx.db
    .select()
    .from(schema.integrations)
    .where(
      and(
        eq(schema.integrations.tenantId, ctx.tenantId),
        eq(schema.integrations.status, "active")
      )
    );

  for (const integration of integrations) {
    try {
      // Stub: log that we would sync this integration
      console.log(
        `[Sync] Would sync ${integration.sourceType} integration ${integration.id}`
      );
      itemsProcessed++;

      // Update last sync time
      await ctx.db
        .update(schema.integrations)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.integrations.id, integration.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Sync failed for ${integration.sourceType}: ${msg}`);
    }
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
