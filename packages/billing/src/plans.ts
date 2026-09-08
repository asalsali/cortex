import type { PlanTier, SearchMode } from "@cortex/shared";

export interface PlanLimits {
  maxUsers: number;
  maxSources: number;
  dreamCycleFrequency: "weekly" | "nightly" | "nightly_on_demand";
  allowedSearchModes: SearchMode[];
  pricePerUserCents: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxUsers: 5,
    maxSources: 2,
    dreamCycleFrequency: "weekly",
    allowedSearchModes: ["quick"],
    pricePerUserCents: 0,
  },
  team: {
    maxUsers: 50,
    maxSources: Infinity,
    dreamCycleFrequency: "nightly",
    allowedSearchModes: ["quick", "standard"],
    pricePerUserCents: 1200, // $12/user/mo
  },
  business: {
    maxUsers: Infinity,
    maxSources: Infinity,
    dreamCycleFrequency: "nightly_on_demand",
    allowedSearchModes: ["quick", "standard", "deep"],
    pricePerUserCents: 2500, // $25/user/mo
  },
};

/**
 * Map a Stripe price ID to a plan tier.
 * Set these via environment variables or Stripe metadata.
 */
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanTier> = {
  // These should be set to your actual Stripe Price IDs
  // e.g. "price_1234": "team"
};

/**
 * Get limits for a given plan tier.
 */
export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Check if a search mode is allowed for a given plan.
 */
export function isSearchModeAllowed(
  plan: PlanTier,
  mode: SearchMode
): boolean {
  return PLAN_LIMITS[plan].allowedSearchModes.includes(mode);
}
