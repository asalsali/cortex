import type Stripe from "stripe";
import { getStripe } from "./stripe";
import type { PlanTier } from "@cortex/shared";

export interface WebhookHandlerDeps {
  /**
   * Update a tenant's plan in the database.
   */
  updateTenantPlan(
    stripeCustomerId: string,
    plan: PlanTier,
    subscriptionId: string | null
  ): Promise<void>;

  /**
   * Get the plan tier from a Stripe subscription's price ID.
   */
  resolvePlan(priceId: string): PlanTier;
}

/**
 * Verify and parse a Stripe webhook event.
 *
 * @param rawBody - The raw request body as a string or Buffer.
 * @param signature - The `stripe-signature` header value.
 * @returns The verified Stripe event.
 * @throws If verification fails.
 */
export function verifyWebhook(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required for webhook verification.");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Handle a verified Stripe webhook event.
 *
 * Supported event types:
 * - checkout.session.completed: activate the purchased plan
 * - customer.subscription.updated: plan change (upgrade/downgrade)
 * - customer.subscription.deleted: downgrade to free
 */
export async function handleWebhookEvent(
  event: Stripe.Event,
  deps: WebhookHandlerDeps
): Promise<{ handled: boolean; action?: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.customer || !session.subscription) {
        return { handled: false, action: "missing_customer_or_subscription" };
      }

      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const priceId = subscription.items.data[0]?.price.id;
      if (!priceId) {
        return { handled: false, action: "no_price_on_subscription" };
      }

      const plan = deps.resolvePlan(priceId);
      await deps.updateTenantPlan(
        session.customer as string,
        plan,
        subscription.id
      );

      return { handled: true, action: `activated_${plan}` };
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      if (!priceId || !subscription.customer) {
        return { handled: false, action: "missing_data" };
      }

      const plan = deps.resolvePlan(priceId);
      await deps.updateTenantPlan(
        subscription.customer as string,
        plan,
        subscription.id
      );

      return { handled: true, action: `updated_to_${plan}` };
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      if (!subscription.customer) {
        return { handled: false, action: "missing_customer" };
      }

      await deps.updateTenantPlan(
        subscription.customer as string,
        "free",
        null
      );

      return { handled: true, action: "downgraded_to_free" };
    }

    default:
      return { handled: false, action: `unhandled_event_${event.type}` };
  }
}
