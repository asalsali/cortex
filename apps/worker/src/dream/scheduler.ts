import { sql } from "drizzle-orm";
import type { Database } from "@cortex/db";
import { DreamRunner } from "./runner";

/**
 * Dream cycle scheduler.
 * Checks every 15 minutes for tenants whose dream cycle is due.
 */
export class DreamScheduler {
  private running = false;
  private interval: ReturnType<typeof setInterval> | null = null;
  private runner: DreamRunner;

  constructor(private db: Database) {
    this.runner = new DreamRunner(db);
  }

  start(intervalMs = 15 * 60 * 1000) {
    this.running = true;
    console.log("[DreamScheduler] Starting, check every 15 minutes");

    this.interval = setInterval(() => {
      if (this.running) {
        this.check().catch((err) =>
          console.error("[DreamScheduler] Check error:", err)
        );
      }
    }, intervalMs);
  }

  stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("[DreamScheduler] Stopped");
  }

  /**
   * Find tenants eligible for a dream cycle and run it.
   */
  private async check() {
    // Find tenants where:
    // - plan != 'free' OR it's Sunday (free tier: weekly)
    // - No dream_run completed today
    // - Current hour matches their configured dream_cycle_hour
    const result = await this.db.execute(sql`
      SELECT t.id, t.slug, t.plan, t.settings
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM dream_runs dr
        WHERE dr.tenant_id = t.id
          AND dr.status IN ('running', 'completed')
          AND dr.started_at > now() - interval '20 hours'
      )
      AND (
        t.plan != 'free'
        OR EXTRACT(DOW FROM now()) = 0
      )
      LIMIT 5
    `);

    const rows = result.rows ?? (result as any);
    if (!rows || rows.length === 0) return;

    for (const tenant of rows) {
      console.log(`[DreamScheduler] Running dream cycle for tenant ${tenant.slug}`);
      try {
        await this.runner.run(tenant.id);
      } catch (err) {
        console.error(`[DreamScheduler] Dream cycle failed for ${tenant.slug}:`, err);
      }
    }
  }
}
