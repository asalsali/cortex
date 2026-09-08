import { Hono } from "hono";
import {
  createCheckoutSession,
  verifyWebhook,
  handleWebhookEvent,
  getPlanLimits,
} from "@cortex/billing";
import type { PlanTier } from "@cortex/shared";
import type { AppEnv } from "../index";

export const billingRoutes = new Hono<AppEnv>();

// ─── Stripe Price ID to Plan mapping ────────────────────────────
// Configure via environment variables:
//   STRIPE_PRICE_TEAM=price_xxx
//   STRIPE_PRICE_BUSINESS=price_yyy

function resolvePlan(priceId: string): PlanTier {
  if (priceId === process.env.STRIPE_PRICE_TEAM) return "team";
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "business";
  return "free";
}

// ─── POST /billing/checkout ─────────────────────────────────────
// Create a Stripe Checkout session for plan upgrades.

billingRoutes.post("/billing/checkout", async (c) => {
  const tenantId = c.get("tenantId");
  const body = await c.req.json<{
    plan: "team" | "business";
    successUrl: string;
    cancelUrl: string;
  }>();

  if (!body.plan || !["team", "business"].includes(body.plan)) {
    return c.json({ error: "Invalid plan. Must be 'team' or 'business'." }, 400);
  }

  const priceId =
    body.plan === "team"
      ? process.env.STRIPE_PRICE_TEAM
      : process.env.STRIPE_PRICE_BUSINESS;

  if (!priceId) {
    return c.json(
      { error: `Stripe price not configured for plan: ${body.plan}` },
      500
    );
  }

  // In production: look up the tenant's stripe_customer_id and user count
  // from the database. For now, placeholder values.
  const customerId = "cus_placeholder";
  const quantity = 1;

  const session = await createCheckoutSession({
    customerId,
    plan: body.plan,
    priceId,
    quantity,
    successUrl: body.successUrl,
    cancelUrl: body.cancelUrl,
  });

  return c.json(session);
});

// ─── POST /billing/webhook ──────────────────────────────────────
// Stripe webhook endpoint. Must receive raw body for signature verification.

billingRoutes.post("/billing/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  const rawBody = await c.req.text();

  let event;
  try {
    event = verifyWebhook(rawBody, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    console.error("[billing] Webhook verification failed:", message);
    return c.json({ error: message }, 400);
  }

  const result = await handleWebhookEvent(event, {
    resolvePlan,
    async updateTenantPlan(stripeCustomerId, plan, subscriptionId) {
      // In production: update the tenants table
      // UPDATE tenants SET plan = $plan, stripe_subscription_id = $subscriptionId
      //   WHERE stripe_customer_id = $stripeCustomerId
      console.log(
        `[billing] Updating tenant plan: customer=${stripeCustomerId} plan=${plan} sub=${subscriptionId}`
      );
    },
  });

  return c.json(result);
});

// ─── GET /billing/status ────────────────────────────────────────
// Current plan and usage for the authenticated tenant.

billingRoutes.get("/billing/status", async (c) => {
  const tenantId = c.get("tenantId");

  // In production: query the database for actual counts
  const plan: PlanTier = "free";
  const limits = getPlanLimits(plan);

  return c.json({
    tenantId,
    plan,
    limits,
    usage: {
      users: 1,
      sources: 0,
    },
  });
});
