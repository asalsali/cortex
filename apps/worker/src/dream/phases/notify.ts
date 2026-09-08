import { sql } from "drizzle-orm";
import type { PhaseContext, PhaseResult } from "../runner";

/**
 * NOTIFY phase: Post dream cycle summary to Slack or email.
 * No LLM usage.
 */
export async function notifyPhase(ctx: PhaseContext): Promise<PhaseResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  // Get the current dream run stats
  const result = await ctx.db.execute(sql`
    SELECT facts_created, facts_superseded, edges_created, pages_updated
    FROM dream_runs
    WHERE id = ${ctx.dreamRunId}::uuid
  `);

  const rows = result.rows ?? (result as any);
  const stats = rows[0] ?? {
    facts_created: 0,
    facts_superseded: 0,
    edges_created: 0,
    pages_updated: 0,
  };

  const summary = [
    `Cortex consolidated overnight.`,
    `${stats.facts_created} new facts.`,
    `${stats.facts_superseded} facts superseded.`,
    `${stats.edges_created} new connections.`,
    `${stats.pages_updated} entities updated.`,
  ].join(" ");

  // In production: post to Slack via bot token or send email
  console.log(`[Notify] Dream cycle summary: ${summary}`);

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    itemsProcessed: 1,
    errors,
  };
}
