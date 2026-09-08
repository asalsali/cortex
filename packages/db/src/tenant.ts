import { sql } from "drizzle-orm";
import type { Database } from "./client";

/**
 * Set the tenant context on the database connection for RLS.
 * Must be called before any tenant-scoped queries.
 */
export async function setTenantContext(db: Database, tenantId: string): Promise<void> {
  await db.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);
}
