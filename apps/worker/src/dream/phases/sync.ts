import { eq, and, sql } from "drizzle-orm";
import { schema } from "@cortex/db";
import { getConnector } from "@cortex/connectors";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * SYNC phase: Pull new content from all connected integrations.
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
    const connector = getConnector(integration.sourceType);
    if (!connector) {
      errors.push(`No connector for source type: ${integration.sourceType}`);
      continue;
    }

    try {
      const result = await connector.sync({
        id: integration.id,
        tenantId: integration.tenantId,
        sourceType: integration.sourceType as any,
        config: integration.config as any,
        status: integration.status as any,
        lastSyncAt: integration.lastSyncAt,
      });

      itemsProcessed += result.pagesCreated + result.pagesUpdated;
      errors.push(...result.errors);

      // Update last sync time
      await ctx.db
        .update(schema.integrations)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.integrations.id, integration.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Sync failed for ${integration.sourceType}: ${msg}`);

      await ctx.db
        .update(schema.integrations)
        .set({ status: "error", lastError: msg, updatedAt: new Date() })
        .where(eq(schema.integrations.id, integration.id));
    }
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed,
    errors,
  };
}
