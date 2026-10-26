"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { liveToken, useMember } from "@/lib/member";
import { money } from "@/lib/money";

/**
 * How much a signed-in member saves, straight from the Stripe coupon.
 *
 * One fetch for the whole app rather than one per product card, and zero for everyone else — a
 * signed-out visitor makes no request and sees no prices struck through.
 */
const Ctx = createContext(0);

export function DiscountProvider({ children }: { children: ReactNode }) {
  const member = useMember();
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!member?.signedIn) return;
    const token = liveToken();
    if (!token) return;
    let dead = false;
    fetch("/api/member-discount", { headers: { "x-sc-token": token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { percentOff?: number } | null) => {
        if (!dead && j?.percentOff) setPercent(j.percentOff);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [member?.signedIn]);

  return <Ctx.Provider value={percent}>{children}</Ctx.Provider>;
}

export const useMemberDiscount = () => useContext(Ctx);

/** Rounded the way Stripe rounds a percentage coupon, so the badge matches the receipt. */
export function discounted(cents: number, percent: number) {
  return Math.round(cents * (1 - percent / 100));
}

/**
 * A price, with the old one struck through when a member is saving on it.
 *
 * The full price stays visible and legible rather than being replaced — the saving is the point,
 * and a number nobody can read no longer makes it.
 */
export function Price({ cents, className = "" }: { cents: number; className?: string }) {
  const percent = useMemberDiscount();
  if (!percent) return <span className={className}>{money(cents)}</span>;
  return (
    <span className={className}>
      <span className="text-muted line-through text-[0.8em] mr-1.5 tabular">{money(cents)}</span>
      <span className="text-yellow tabular">{money(discounted(cents, percent))}</span>
    </span>
  );
}

/**
 * A price that may be a range, with the member price beside it.
 *
 * Ranges get the same treatment as single prices rather than being skipped. Skipping them meant
 * almost nothing on the store grid showed a saving, since most garments span several sizes — the
 * discount was only visible after picking a variant, which is the point at which someone has
 * already decided.
 */
export function PriceRange({ min, max, className = "" }: { min: number; max: number; className?: string }) {
  const percent = useMemberDiscount();
  const full = min === max ? money(min) : `${money(min)} to ${money(max)}`;
  if (!percent) return <span className={className}>{full}</span>;
  const cut = min === max ? money(discounted(min, percent)) : `${money(discounted(min, percent))} to ${money(discounted(max, percent))}`;
  return (
    <span className={`${className} inline-flex flex-wrap items-baseline gap-x-1.5`}>
      <span className="text-muted line-through text-[0.8em] tabular">{full}</span>
      <span className="text-yellow tabular">{cut}</span>
    </span>
  );
}

/**
 * The member price as plain text, no strikethrough.
 *
 * For places where two prices cannot both be shown legibly — inside the yellow call-to-action
 * button, where struck-through grey on yellow would be unreadable. It is still their real price,
 * so showing it alone is honest rather than a tease.
 */
export function useDiscountedRangeText(min: number, max: number): string {
  const percent = useMemberDiscount();
  const lo = percent ? discounted(min, percent) : min;
  const hi = percent ? discounted(max, percent) : max;
  return lo === hi ? money(lo) : `${money(lo)} to ${money(hi)}`;
}
