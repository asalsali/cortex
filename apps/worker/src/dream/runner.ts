import { sql } from "drizzle-orm";
import type { Database } from "@cortex/db";
import { schema } from "@cortex/db";
import { DREAM_PHASES } from "@cortex/shared";
import type { DreamPhase } from "@cortex/shared";
import { syncPhase } from "./phases/sync";
import { extractPhase } from "./phases/extract";
import { embedPhase } from "./phases/embed";
import { consolidatePhase } from "./phases/consolidate";
import { driftPhase } from "./phases/drift";
import { orphansPhase } from "./phases/orphans";
import { healthPhase } from "./phases/health";
import { notifyPhase } from "./phases/notify";

export interface PhaseContext {
  db: Database;
  tenantId: string;
  dreamRunId: string;
}

export interface PhaseResult {
  startedAt: string;
  completedAt: string;
  itemsProcessed: number;
  errors: string[];
}

type PhaseHandler = (ctx: PhaseContext) => Promise<PhaseResult>;

const PHASE_HANDLERS: Record<DreamPhase, PhaseHandler> = {
  sync: syncPhase,
  extract: extractPhase,
  embed: embedPhase,
  consolidate: consolidatePhase,
  drift: driftPhase,
  orphans: orphansPhase,
  health: healthPhase,
  notify: notifyPhase,
};

/**
 * Dream cycle runner.
 * Executes the 8 dream cycle phases sequentially for a single tenant.
 */
export class DreamRunner {
  constructor(private db: Database) {}

  async run(tenantId: string): Promise<void> {
    // Create dream run record
    const [dreamRun] = await this.db
      .insert(schema.dreamRuns)
      .values({
        tenantId,
        status: "running",
      })
      .returning({ id: schema.dreamRuns.id });

    const ctx: PhaseContext = {
      db: this.db,
      tenantId,
      dreamRunId: dreamRun.id,
    };

    const phases: Record<string, PhaseResult> = {};
    let totalFactsCreated = 0;
    let totalFactsSuperseded = 0;
    let totalEdgesCreated = 0;
    const errors: string[] = [];

    try {
      for (const phase of DREAM_PHASES) {
        console.log(`[DreamRunner] Phase ${phase} starting for tenant ${tenantId}`);

        // Skip drift phase unless it's the weekly run (Sunday)
        if (phase === "drift" && new Date().getDay() !== 0) {
          console.log(`[DreamRunner] Skipping drift (not Sunday)`);
          continue;
        }

        try {
          const result = await PHASE_HANDLERS[phase](ctx);
          phases[phase] = result;

          // Update dream run with phase progress
          await this.db.execute(sql`
            UPDATE dream_runs
            SET phases = phases || ${JSON.stringify({ [phase]: result })}::jsonb
            WHERE id = ${dreamRun.id}::uuid
          `);

          if (result.errors.length > 0) {
            errors.push(...result.errors.map((e) => `[${phase}] ${e}`));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`[${phase}] FATAL: ${msg}`);
          console.error(`[DreamRunner] Phase ${phase} failed:`, msg);
          // Continue to next phase -- one phase failure shouldn't stop the cycle
        }
      }

      // Complete the dream run
      const summary = this.buildSummary(phases, errors);

      await this.db
        .update(schema.dreamRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          phases: phases as any,
          summary,
          factsCreated: totalFactsCreated,
          factsSuperseded: totalFactsSuperseded,
          edgesCreated: totalEdgesCreated,
          errors: errors as any,
        })
        .where(sql`id = ${dreamRun.id}::uuid`);

      console.log(`[DreamRunner] Dream cycle completed for tenant ${tenantId}`);
    } catch (err) {
      await this.db
        .update(schema.dreamRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errors: [String(err)] as any,
        })
        .where(sql`id = ${dreamRun.id}::uuid`);

      throw err;
    }
  }

  private buildSummary(
    phases: Record<string, PhaseResult>,
    errors: string[]
  ): string {
    const parts: string[] = [];

    for (const [phase, result] of Object.entries(phases)) {
      if (result.itemsProcessed > 0) {
        parts.push(`${phase}: ${result.itemsProcessed} items`);
      }
    }

    if (errors.length > 0) {
      parts.push(`${errors.length} error(s)`);
    }

    return `Cortex dream cycle: ${parts.join(", ") || "no activity"}`;
  }
}
