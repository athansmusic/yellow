import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { findVariant } from "@/lib/catalog";
import { ALLOWED_COUNTRIES, arrivalDays, regionFor, shippingFor } from "@/lib/shipping";
import { SITE } from "@/lib/site";
import { isMember } from "@/lib/sc-member";

const Body = z.object({
  country: z.string().length(2),
  items: z.array(z.object({ variantId: z.number().int(), qty: z.number().int().min(1).max(20) })).min(1).max(50),
});

export async function POST(req: Request) {
  if (!stripeEnabled()) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { country, items } = parsed.data;
  const cc = country.toUpperCase();
  if (!(ALLOWED_COUNTRIES as readonly string[]).includes(cc)) return NextResponse.json({ error: "We can't ship to that country yet." }, { status: 400 });

  // Prices always come from the server-side catalog, never from the client.
  type LineItem = {
    quantity: number;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; images: string[]; metadata: Record<string, string> };
    };
  };
  const line_items: LineItem[] = [];
  const meta: { v: number; q: number }[] = [];
  for (const it of items) {
    const found = await findVariant(it.variantId);
    if (!found) return NextResponse.json({ error: "An item in your cart is no longer available." }, { status: 409 });
    const { product, variant } = found;
    if (!variant.available) return NextResponse.json({ error: `${product.name} is sold out.` }, { status: 409 });
    const label = [variant.color, variant.size].filter(Boolean).join(" · ");
    line_items.push({
      quantity: it.qty,
      price_data: {
        currency: "usd",
        unit_amount: variant.priceCents,
        product_data: {
          name: label ? `${product.name} (${label})` : product.name,
          images: [absolute(variant.image ?? product.image)],
          metadata: { variant_id: String(variant.id), slug: product.slug },
        },
      },
    });
    meta.push({ v: variant.id, q: it.qty });
  }

  const subtotal = line_items.reduce((n, li) => n + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 1), 0);
  const ship = shippingFor(cc, subtotal);
  const [minDays, maxDays] = arrivalDays(ship.region.id);
  // Let the buyer pick any country in the same shipping region (the rate is the same), e.g. a cart set to Germany can ship to France.
  const region = regionFor(cc);
  const regionCountries = region.countries.length ? region.countries : (ALLOWED_COUNTRIES as readonly string[]).filter((c) => regionFor(c).id === "world");
  const origin = req.headers.get("origin") ?? SITE.url;

  /**
   * Members get their discount applied for them.
   *
   * Membership is decided from the token, never from anything the browser asserts — the same rule
   * that keeps prices coming from the server catalog rather than the cart.
   *
   * Stripe treats `discounts` and `allow_promotion_codes` as mutually exclusive on a session, so
   * the two cases are built differently rather than both: a member gets the discount and no code
   * box, everyone else keeps the box. Unset STRIPE_MEMBER_COUPON_ID means nobody gets anything and
   * the store behaves exactly as it did.
   */
  const coupon = process.env.STRIPE_MEMBER_COUPON_ID;
  const memberDiscount = coupon ? await isMember(req.headers.get("x-sc-token")) : false;

  const build = (withDiscount: boolean) =>
    stripe().checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    line_items,
    shipping_address_collection: { allowed_countries: regionCountries as never[] },
    // Payment methods come from the Stripe Dashboard (Settings > Payment methods). Turn Affirm / Klarna / Afterpay off there.
    phone_number_collection: { enabled: true },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: ship.rateCents, currency: "usd" },
          display_name: `${ship.label} · printed to order`,
          delivery_estimate: { minimum: { unit: "business_day", value: minDays }, maximum: { unit: "business_day", value: maxDays } },
        },
      },
    ],
    automatic_tax: { enabled: false },
    ...(withDiscount
      ? { discounts: [{ coupon: coupon! }] }
      : { allow_promotion_codes: true as const }),
    metadata: {
      items: JSON.stringify(meta),
      country: cc,
      source: "theredactedunit.com",
      // So a refund or a support question can tell later whether the member price was applied.
      member: withDiscount ? "yes" : "no",
    },
    return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });

  /**
   * A bad coupon must never cost a sale.
   *
   * Stripe rejects the whole session if the coupon does not exist — which happens the moment a
   * live key meets a coupon created in test mode, and again if one is ever deleted or expires. The
   * discount is the part that is allowed to fail here; buying the thing is not.
   */
  let session;
  try {
    session = await build(memberDiscount);
  } catch (err) {
    if (!memberDiscount) throw err;
    console.error("member coupon rejected, falling back to full price:", err);
    session = await build(false);
  }

  return NextResponse.json({ clientSecret: session.client_secret });
}

function absolute(u: string) {
  return u.startsWith("http") ? u : `${SITE.url}${u}`;
}
