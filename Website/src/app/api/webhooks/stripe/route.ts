import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createHash } from "node:crypto";
import { stripe } from "@/lib/stripe";
import { createOrder, getOrderByExternalId, printfulEnabled, type PFRecipient } from "@/lib/printful";

export const runtime = "nodejs";

/**
 * Stripe → Printful bridge.
 * On checkout.session.completed (paid), create + confirm a Printful order with the
 * items from session metadata and the shipping address Stripe collected.
 * Idempotent: Printful external_id = Stripe session id.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 500 });
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return NextResponse.json({ received: true, skipped: "unpaid" });

  if (!printfulEnabled()) {
    console.warn("[webhook] Paid order but PRINTFUL_API_KEY not set — fulfil manually:", session.id);
    return NextResponse.json({ received: true, skipped: "printful-disabled" });
  }

  // Printful external_id is capped at 32 chars; a hash of the session id keeps it unique and idempotent.
  const externalId = createHash("sha256").update(session.id).digest("hex").slice(0, 32);
  // Idempotency guard (Stripe retries; Printful also rejects duplicate external_id)
  if (await getOrderByExternalId(externalId)) return NextResponse.json({ received: true, skipped: "exists" });

  let items: { v: number; q: number }[] = [];
  try {
    items = JSON.parse(session.metadata?.items ?? "[]");
  } catch {}
  items = items.filter((i) => i.v > 0); // negative ids = fixture catalog, not real Printful variants
  if (!items.length) return NextResponse.json({ received: true, skipped: "no-printful-items" });

  // Stripe moved shipping details under collected_information in newer API versions.
  type Ship = { name?: string | null; address?: Stripe.Address | null } | null | undefined;
  const s = session as Stripe.Checkout.Session & { collected_information?: { shipping_details?: Ship }; shipping_details?: Ship };
  const ship = s.collected_information?.shipping_details ?? s.shipping_details;
  const addr = ship?.address;
  if (!addr?.line1 || !addr.country || !addr.city) {
    console.error("[webhook] Missing shipping address on session", session.id);
    return NextResponse.json({ error: "missing address" }, { status: 200 }); // 200 so Stripe stops retrying; alert via logs
  }

  const recipient: PFRecipient = {
    name: ship?.name ?? session.customer_details?.name ?? "Customer",
    address1: addr.line1,
    address2: addr.line2 ?? undefined,
    city: addr.city,
    state_code: addr.state ?? undefined,
    country_code: addr.country,
    zip: addr.postal_code ?? "",
    email: session.customer_details?.email ?? undefined,
    phone: session.customer_details?.phone ?? undefined,
  };

  try {
    const order = await createOrder({
      externalId,
      recipient,
      items: items.map((i) => ({ sync_variant_id: i.v, quantity: i.q })),
      packingSlipMessage: "Thanks for supporting [REDACTED].",
      // PRINTFUL_ORDER_CONFIRM=false leaves orders as drafts in Printful (used for test runs)
      confirm: process.env.PRINTFUL_ORDER_CONFIRM !== "false",
    });
    console.log("[webhook] Printful order created", order.id, "for", session.id);
    return NextResponse.json({ received: true, printfulOrderId: order.id });
  } catch (e) {
    console.error("[webhook] Printful order failed for", session.id, (e as Error).message);
    // 500 → Stripe retries with backoff (up to 3 days). Good: transient Printful outages self-heal.
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
