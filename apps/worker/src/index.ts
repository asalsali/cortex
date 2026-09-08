import { createDirectDb } from "@cortex/db";
import { JobQueueConsumer } from "./ingestion/queue";
import { DreamScheduler } from "./dream/scheduler";

const db = createDirectDb();

console.log("Cortex worker starting...");

// Start job queue consumer
const jobConsumer = new JobQueueConsumer(db);
jobConsumer.start();

// Start dream cycle scheduler
const dreamScheduler = new DreamScheduler(db);
dreamScheduler.start();

console.log("Cortex worker running. Press Ctrl+C to stop.");

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down worker...");
  jobConsumer.stop();
  dreamScheduler.stop();
  process.exit(0);
});
