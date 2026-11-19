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
 *
 * `reason` exists because zero has three quite different causes — no coupon configured, not a
 * member, or a coupon Stripe would not hand over — and they were indistinguishable from outside.
 * It names the case, never the coupon or the rate, so it tells an operator what to fix without
 * telling a stranger anything.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const nostore = { "Cache-Control": "private, no-store" };
  const id = process.env.STRIPE_MEMBER_COUPON_ID;

  if (!stripeEnabled()) return NextResponse.json({ percentOff: 0, reason: "stripe-not-configured" });
  if (!id) return NextResponse.json({ percentOff: 0, reason: "no-coupon-id" });

  if (!(await isMember(req.headers.get("x-sc-token")))) {
    return NextResponse.json({ percentOff: 0, reason: "not-a-member" }, { headers: nostore });
  }

  try {
    const c = await stripe().coupons.retrieve(id);
    if (!c.valid) return NextResponse.json({ percentOff: 0, reason: "coupon-invalid" }, { headers: nostore });
    return NextResponse.json(
      { percentOff: c.percent_off ?? 0, amountOff: c.amount_off ?? null, reason: "ok" },
      { headers: nostore },
    );
  } catch (err) {
    // Wrong mode, deleted, or a restricted key without permission to read coupons. Logged, because
    // this is the one that looks identical to "not a member" from the outside.
    console.error("member coupon unreadable:", err);
    return NextResponse.json({ percentOff: 0, reason: "coupon-unreadable" }, { headers: nostore });
  }
}
