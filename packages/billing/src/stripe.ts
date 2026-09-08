import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe client instance.
 * Lazily initialized from STRIPE_SECRET_KEY env var.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is required. Set it in your environment variables."
      );
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }
  return stripeInstance;
}
