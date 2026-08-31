import { NextResponse } from "next/server";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { isMember } from "@/lib/sc-member";

/**
 * The member discount, as Stripe actually holds it.
 *
 * Read from the coupon rather than kept in a second constant, so the site can never advertise a
 * percentage that checkout does not apply — the classic version of this bug is a page saying 15%
 * while the session gives 10%, and it is only possible when two places store the number.
 *
 * Returns 0 for anyone Supporting Cast does not vouch for, so a non-member cannot even learn the
 * rate by calling this.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = process.env.STRIPE_MEMBER_COUPON_ID;
  if (!id || !stripeEnabled()) return NextResponse.json({ percentOff: 0 });

  if (!(await isMember(req.headers.get("x-sc-token")))) {
    return NextResponse.json({ percentOff: 0 }, { headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const c = await stripe().coupons.retrieve(id);
    return NextResponse.json(
      { percentOff: c.percent_off ?? 0, amountOff: c.amount_off ?? null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    // A coupon that cannot be read is a coupon we must not promise. The store shows normal prices.
    return NextResponse.json({ percentOff: 0 }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
