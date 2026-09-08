import { getStripe } from "./stripe";
import type { PlanTier } from "@cortex/shared";

export interface CreateCheckoutOptions {
  /** The Stripe customer ID for this tenant. */
  customerId: string;
  /** The plan tier the tenant is upgrading to. */
  plan: PlanTier;
  /** The Stripe price ID for the target plan. */
  priceId: string;
  /** Number of seats (users) to bill for. */
  quantity: number;
  /** URL to redirect to after successful checkout. */
  successUrl: string;
  /** URL to redirect to if the user cancels checkout. */
  cancelUrl: string;
}

/**
 * Create a Stripe Checkout Session for a plan upgrade.
 *
 * Uses per-seat pricing: quantity = number of users on the tenant.
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: options.customerId,
    mode: "subscription",
    line_items: [
      {
        price: options.priceId,
        quantity: options.quantity,
      },
    ],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: {
      plan: options.plan,
    },
    subscription_data: {
      metadata: {
        plan: options.plan,
      },
    },
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Create a Stripe billing portal session for managing subscriptions.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}
