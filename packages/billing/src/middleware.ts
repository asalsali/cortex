import type { Context, Next } from "hono";
import { getPlanLimits, isSearchModeAllowed } from "./plans";
import type { PlanTier, SearchMode } from "@cortex/shared";

interface TenantPlanInfo {
  plan: PlanTier;
  currentUserCount: number;
  currentSourceCount: number;
}

/**
 * Plan enforcement middleware for Hono.
 *
 * Checks the tenant's plan before allowing operations and returns
 * 402 Payment Required with an upgrade message when limits are hit.
 *
 * Expects `tenantPlan` to be set on context by the tenant middleware.
 */
export function planEnforcement() {
  return async (c: Context, next: Next) => {
    const tenantPlan = c.get("tenantPlan") as TenantPlanInfo | undefined;

    if (!tenantPlan) {
      // No plan info available -- skip enforcement (e.g. health check)
      await next();
      return;
    }

    const { plan, currentUserCount, currentSourceCount } = tenantPlan;
    const limits = getPlanLimits(plan);
    const path = new URL(c.req.url).pathname;

    // Enforce user limits on user creation
    if (path.includes("/users") && c.req.method === "POST") {
      if (currentUserCount >= limits.maxUsers) {
        return c.json(
          {
            error: "user_limit_reached",
            message: `Your ${plan} plan allows up to ${limits.maxUsers} users. Upgrade to add more.`,
            currentCount: currentUserCount,
            limit: limits.maxUsers,
          },
          402
        );
      }
    }

    // Enforce source limits on integration creation
    if (path.includes("/integrations") && c.req.method === "POST") {
      if (currentSourceCount >= limits.maxSources) {
        return c.json(
          {
            error: "source_limit_reached",
            message: `Your ${plan} plan allows up to ${limits.maxSources} sources. Upgrade to add more.`,
            currentCount: currentSourceCount,
            limit: limits.maxSources,
          },
          402
        );
      }
    }

    // Enforce search mode limits
    if (path.includes("/search") && c.req.method === "POST") {
      try {
        const body = await c.req.json();
        const requestedMode = (body.mode as SearchMode) || "quick";
        if (!isSearchModeAllowed(plan, requestedMode)) {
          return c.json(
            {
              error: "search_mode_not_available",
              message: `The "${requestedMode}" search mode is not available on the ${plan} plan. Upgrade to access it.`,
              allowedModes: limits.allowedSearchModes,
            },
            402
          );
        }
      } catch {
        // Body parse failed -- let the route handler deal with it
      }
    }

    // Enforce dream cycle on-demand trigger
    if (path.includes("/dream") && c.req.method === "POST") {
      if (limits.dreamCycleFrequency !== "nightly_on_demand") {
        return c.json(
          {
            error: "on_demand_dream_not_available",
            message: `On-demand dream cycles are only available on the Business plan. Your ${plan} plan runs ${limits.dreamCycleFrequency === "weekly" ? "weekly" : "nightly"} cycles automatically.`,
          },
          402
        );
      }
    }

    await next();
  };
}
