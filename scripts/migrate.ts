/**
 * Apply the initial SQL DDL to the running Postgres database.
 * This reads packages/db/drizzle/0001_initial.sql and executes it.
 *
 * Usage: bun run scripts/migrate.ts
 */

import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve } from "path";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/cortex";

async function migrate() {
  console.log("Cortex Database Migration");
  console.log("=========================\n");
  console.log(`Connecting to: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}\n`);

  const sql = postgres(DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
  });

  try {
    // Test connection
    const [{ version }] = await sql`SELECT version()`;
    console.log(`Connected: ${version.split(",")[0]}\n`);

    // Read and execute the initial migration SQL
    const migrationPath = resolve(
      import.meta.dir,
      "../packages/db/drizzle/0001_initial.sql"
    );
    const migrationSql = readFileSync(migrationPath, "utf-8");

    console.log("Applying 0001_initial.sql...");

    // Split by semicolons and execute each statement
    // (postgres.js doesn't support multi-statement queries easily)
    const statements = migrationSql
      .split(/;\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    let applied = 0;
    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        applied++;
      } catch (err: any) {
        // Skip "already exists" errors -- makes the script idempotent
        if (
          err.message?.includes("already exists") ||
          err.message?.includes("duplicate key")
        ) {
          // Table/index already exists, that is fine
          continue;
        }
        console.error(`  Error executing statement: ${err.message}`);
        console.error(`  Statement: ${statement.slice(0, 100)}...`);
      }
    }

    console.log(`Applied ${applied} statements.\n`);

    // Verify tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log("Tables in database:");
    for (const t of tables) {
      console.log(`  - ${t.table_name}`);
    }

    // Verify extensions
    const extensions = await sql`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm')
    `;

    console.log("\nExtensions:");
    for (const ext of extensions) {
      console.log(`  - ${ext.extname} v${ext.extversion}`);
    }

    console.log("\nMigration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
