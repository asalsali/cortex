import { eq, and, sql, lte } from "drizzle-orm";
import type { Database } from "@cortex/db";
import { schema } from "@cortex/db";
import { writebackGate } from "@cortex/shared";

const { jobQueue } = schema;

/**
 * Postgres-native job queue consumer.
 * Uses SELECT ... FOR UPDATE SKIP LOCKED for efficient concurrent consumption.
 */
export class JobQueueConsumer {
  private running = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private workerId: string;

  constructor(private db: Database) {
    this.workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
  }

  start(intervalMs = 5000) {
    this.running = true;
    console.log(`[JobQueue] Consumer ${this.workerId} starting, poll every ${intervalMs}ms`);

    this.pollInterval = setInterval(() => {
      if (this.running) {
        this.poll().catch((err) =>
          console.error("[JobQueue] Poll error:", err)
        );
      }
    }, intervalMs);

    // Immediate first poll
    this.poll().catch((err) => console.error("[JobQueue] Initial poll error:", err));
  }

  stop() {
    this.running = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log(`[JobQueue] Consumer ${this.workerId} stopped`);
  }

  /**
   * Poll for and process one pending job.
   * Uses FOR UPDATE SKIP LOCKED for safe concurrent access.
   */
  private async poll() {
    const result = await this.db.execute(sql`
      UPDATE job_queue
      SET status = 'running',
          locked_by = ${this.workerId},
          locked_at = now(),
          started_at = now(),
          attempts = attempts + 1
      WHERE id = (
        SELECT id FROM job_queue
        WHERE status = 'pending'
          AND scheduled_at <= now()
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

    const rows = result.rows ?? (result as any);
    if (!rows || rows.length === 0) return;

    const job = rows[0];
    console.log(`[JobQueue] Processing job ${job.id} (${job.job_type})`);

    try {
      await this.processJob(job);

      await this.db.execute(sql`
        UPDATE job_queue
        SET status = 'completed', completed_at = now()
        WHERE id = ${job.id}::uuid
      `);

      console.log(`[JobQueue] Job ${job.id} completed`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const shouldRetry = job.attempts < job.max_attempts;

      await this.db.execute(sql`
        UPDATE job_queue
        SET status = ${shouldRetry ? "pending" : "failed"},
            last_error = ${errorMsg},
            locked_by = NULL,
            locked_at = NULL
        WHERE id = ${job.id}::uuid
      `);

      console.error(
        `[JobQueue] Job ${job.id} failed (attempt ${job.attempts}/${job.max_attempts}):`,
        errorMsg
      );
    }
  }

  /**
   * Route a job to its handler based on job_type.
   */
  private async processJob(job: any): Promise<void> {
    switch (job.job_type) {
      case "slack_message":
        await this.processSlackMessage(job.payload);
        break;
      case "file_upload":
        await this.processFileUpload(job.payload);
        break;
      case "embed_chunks":
        await this.processEmbedChunks(job.payload);
        break;
      default:
        console.warn(`[JobQueue] Unknown job type: ${job.job_type}`);
    }
  }

  private async processSlackMessage(payload: any): Promise<void> {
    const gateResult = writebackGate(payload.content ?? "");
    if (!gateResult.passed) {
      console.log(`[JobQueue] Slack message filtered by gate: ${gateResult.rejection}`);
      return;
    }
    // After gate: extract facts (requires LLM), create pages/facts
    // Stubbed until Anthropic SDK is wired
    console.log("[JobQueue] Slack message passed gate, extraction pending LLM integration");
  }

  private async processFileUpload(payload: any): Promise<void> {
    console.log("[JobQueue] Processing file upload:", payload.fileName);
    // File processing pipeline: fetch from S3, detect type, chunk, extract, embed
  }

  private async processEmbedChunks(payload: any): Promise<void> {
    console.log("[JobQueue] Embedding chunks for page:", payload.pageId);
    // Generate embeddings via Voyage AI API
  }
}
