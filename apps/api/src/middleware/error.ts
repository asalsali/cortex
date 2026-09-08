import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../index";

/**
 * Global error handler.
 * Catches unhandled errors and returns structured JSON responses.
 */
export function errorHandler() {
  return createMiddleware<AppEnv>(async (c, next) => {
    try {
      await next();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      const status = (err as any).status ?? 500;

      console.error(`[Error] ${c.req.method} ${c.req.path}:`, message);

      return c.json(
        {
          error: message,
          path: c.req.path,
          timestamp: new Date().toISOString(),
        },
        status
      );
    }
  });
}
