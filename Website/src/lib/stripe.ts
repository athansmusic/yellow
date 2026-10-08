import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripeEnabled() {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true });
  return _stripe;
}
