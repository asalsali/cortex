import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../index";

/**
 * Tenant middleware: extracts tenant ID from request.
 *
 * In production, this reads from Clerk JWT claims or API key lookup.
 * For development, it accepts X-Tenant-Id header.
 */
export function tenantMiddleware() {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Development: accept header
    const tenantId =
      c.req.header("X-Tenant-Id") ??
      c.req.header("x-tenant-id");

    if (!tenantId) {
      return c.json(
        { error: "Missing tenant context. Provide X-Tenant-Id header." },
        401
      );
    }

    c.set("tenantId", tenantId);

    // In production with RLS, we would also do:
    // await setTenantContext(c.get("db"), tenantId);

    await next();
  });
}
