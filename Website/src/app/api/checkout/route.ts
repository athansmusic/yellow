import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { findVariant } from "@/lib/catalog";
import { ALLOWED_COUNTRIES, arrivalDays, regionFor, shippingFor } from "@/lib/shipping";
import { SITE } from "@/lib/site";

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
  const line_items = [];
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

  const session = await stripe().checkout.sessions.create({
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
    allow_promotion_codes: true,
    metadata: { items: JSON.stringify(meta), country: cc, source: "theredactedunit.com" },
    return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  });

  return NextResponse.json({ clientSecret: session.client_secret });
}

function absolute(u: string) {
  return u.startsWith("http") ? u : `${SITE.url}${u}`;
}
