import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Create a database client.
 * Uses the pooled connection URL by default (for API server).
 * Workers should use DATABASE_URL_UNPOOLED for long-running connections.
 */
export function createDb(connectionUrl?: string) {
  const url = connectionUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Set it in .env or pass it directly.\n" +
      "Default: postgres://postgres:postgres@localhost:5432/cortex"
    );
  }

  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

/**
 * Create a direct (non-pooled) connection for workers.
 */
export function createDirectDb() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL or DATABASE_URL_UNPOOLED is required.\n" +
      "Default: postgres://postgres:postgres@localhost:5432/cortex"
    );
  }

  const client = postgres(url, {
    max: 3,
    idle_timeout: 60,
    connect_timeout: 30,
  });

  return drizzle(client, { schema });
}

/**
 * Get the raw postgres.js client for health checks and raw SQL.
 */
export function createRawClient(connectionUrl?: string) {
  const url = connectionUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  return postgres(url, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 5,
  });
}
