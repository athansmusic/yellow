"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart, type CartLine } from "@/lib/cart";
import { money } from "@/lib/money";
import type { CardProduct } from "@/lib/catalog";
import { ALLOWED_COUNTRIES, COUNTRY_NAMES, FREE_US_THRESHOLD_CENTS, shippingFor } from "@/lib/shipping";
import { ProductCard } from "./ProductCard";
import { CopyButton } from "./ListenLinks";
import { Arrow, Close } from "./Icons";

const COUNTRY_KEY = "tru-ship-country";

type Props = {
  /** Lean catalog for the "you might also like" row (server-provided). */
  suggestions: { p: CardProduct; collection?: string }[];
  promo?: { code: string; text: string } | null;
};

function Skeleton() {
  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] animate-pulse" aria-label="Loading your cart">
      <div className="divide-y divide-line border-y border-line">
        {[0, 1].map((i) => (
          <div key={i} className="py-4 flex gap-4">
            <div className="size-20 sm:size-24 bg-ink-2 border border-line" />
            <div className="flex-1 grid gap-2">
              <div className="h-5 w-2/3 bg-ink-2" />
              <div className="h-3 w-1/3 bg-ink-2" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-72 bg-ink-2 border border-line" />
    </div>
  );
}

export function CartView({ suggestions, promo }: Props) {
  const { lines, subtotalCents, setQty, remove, add, ready } = useCart();
  const [country, setCountry] = useState("US");
  const [editCountry, setEditCountry] = useState(false);
  const [undo, setUndo] = useState<CartLine | null>(null);

  useEffect(() => {
    try {
      const c = localStorage.getItem(COUNTRY_KEY);
      if (c) setCountry(c);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(COUNTRY_KEY, country);
    } catch {}
  }, [country]);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  if (!ready) return <Skeleton />;

  // Cross-sell: products from the same collections as what's in the cart, then cheap add-ons, never what's already in it.
  const inCart = new Set(lines.map((l) => l.slug));
  const cartCollections = new Set(suggestions.filter((s) => inCart.has(s.p.slug) && s.collection).map((s) => s.collection));
  const picks = [
    ...suggestions.filter((s) => !inCart.has(s.p.slug) && s.collection && cartCollections.has(s.collection)),
    ...suggestions.filter((s) => !inCart.has(s.p.slug) && s.p.priceCents <= 2000),
    ...suggestions.filter((s) => !inCart.has(s.p.slug)),
  ]
    .filter((s, i, arr) => arr.findIndex((x) => x.p.slug === s.p.slug) === i)
    .slice(0, 4);

  if (!lines.length)
    return (
      <div className="mt-8">
        <div className="border border-line bg-ink-2/70 p-6">
          <p className="display text-2xl">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted">Everything is printed to order, so nothing sells out.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/store" className="btn btn-yellow">
              Browse the store <Arrow />
            </Link>
            {undo && (
              <button type="button" onClick={() => { add(undo, undo.qty); setUndo(null); }} className="btn btn-ghost">
                Undo remove
              </button>
            )}
          </div>
        </div>
        {picks.length > 0 && <Suggestions picks={picks} title="Start here" />}
      </div>
    );

  const ship = shippingFor(country, subtotalCents);
  const total = subtotalCents + ship.rateCents;
  const toFree = FREE_US_THRESHOLD_CENTS - subtotalCents;
  const pct = Math.min(100, Math.round((subtotalCents / FREE_US_THRESHOLD_CENTS) * 100));

  return (
    <div className="mt-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] items-start">
        <div>
          <ul className="divide-y divide-line border-y border-line">
            {lines.map((l) => (
              <li key={l.variantId} className="py-4 flex gap-4">
                {l.image && (
                  <Link href={`/store/${l.slug}`} className="shrink-0">
                    <Image src={l.image} alt="" width={96} height={96} className="size-20 sm:size-24 object-cover bg-[#f3f3f3] border border-line" />
                  </Link>
                )}
                <div className="flex-1 min-w-0 grid sm:grid-cols-[1fr_auto_auto] gap-3 items-center">
                  <div className="min-w-0">
                    <Link href={`/store/${l.slug}`} className="display text-xl leading-tight hover:text-yellow block truncate">
                      {l.name}
                    </Link>
                    {l.variantLabel && <p className="text-sm text-muted">{l.variantLabel}</p>}
                    <p className="text-sm text-muted tabular mt-1">{money(l.priceCents)} each</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">Quantity for {l.name}</span>
                    <select value={l.qty} onChange={(e) => setQty(l.variantId, Number(e.target.value))} className="field !w-20 !min-h-10 !py-1">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    <span className="tabular font-semibold">{money(l.priceCents * l.qty)}</span>
                    <button type="button" onClick={() => { setUndo(l); remove(l.variantId); }} aria-label={`Remove ${l.name}`} className="p-2 text-muted hover:text-red-2">
                      <Close width={16} height={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {undo && (
            <div role="status" className="mt-3 flex items-center justify-between gap-3 border border-line bg-ink-2 px-4 py-2 text-sm">
              <span className="truncate">Removed {undo.name}.</span>
              <button type="button" onClick={() => { add(undo, undo.qty); setUndo(null); }} className="text-yellow underline underline-offset-4 shrink-0">
                Undo
              </button>
            </div>
          )}

          <Link href="/store" className="mt-4 inline-flex items-center gap-2 text-sm text-yellow underline underline-offset-4">
            Continue shopping <Arrow width={14} height={14} />
          </Link>
        </div>

        <aside className="bg-ink-2 border border-line p-5 lg:sticky lg:top-24">
          <h2 className="display text-2xl">Summary</h2>

          {/* Free shipping progress (US only) */}
          {ship.region.id === "us" && (
            <div className="mt-4">
              <div className="h-1.5 bg-ink border border-line">
                <div className="h-full bg-yellow transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className={`mt-1.5 text-xs ${toFree > 0 ? "text-muted" : "text-yellow"}`}>{toFree > 0 ? `Add ${money(toFree)} more for free US shipping` : "You've unlocked free US shipping"}</p>
            </div>
          )}

          <dl className="mt-4 grid gap-2 text-sm tabular">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{money(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping · {ship.region.label}</dt>
              <dd>{ship.rateCents === 0 ? "Free" : money(ship.rateCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{money(total)}</dd>
            </div>
          </dl>

          {/* Country as a disclosure */}
          <div className="mt-3 text-xs text-muted">
            {editCountry ? (
              <label className="block">
                <span className="sr-only">Ship to</span>
                <select value={country} onChange={(e) => { setCountry(e.target.value); setEditCountry(false); }} className="field !min-h-9 !py-1 text-sm" autoFocus>
                  {ALLOWED_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {COUNTRY_NAMES[c] ?? c}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                Ships to <span className="text-paper">{COUNTRY_NAMES[country] ?? country}</span> ·{" "}
                <button type="button" onClick={() => setEditCountry(true)} className="underline underline-offset-4 hover:text-yellow">
                  change
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-muted mt-2">Taxes, if any, are calculated at checkout.</p>
          <Link href={`/checkout?country=${country}`} className="btn btn-yellow w-full mt-5">
            Checkout <Arrow />
          </Link>

          {/* Promo */}
          <p className="mt-3 text-xs text-muted">
            {promo ? (
              <>
                Have a code? Add it at checkout.{" "}
                <span className="text-paper">{promo.code}</span> <CopyButton text={promo.code} label="copy" className="underline underline-offset-4 hover:text-yellow" /> takes 10% off $25+.
              </>
            ) : (
              "Have a code? Add it under the order summary at checkout."
            )}
          </p>

          {/* Trust row */}
          <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wider text-muted" aria-label="Payment methods">
            <li className="inline-flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Stripe
            </li>
            <li>Apple Pay</li>
            <li>Google Pay</li>
            <li>Link</li>
          </ul>
          <p className="text-xs text-muted mt-3">
            Printed to order. By checking out you agree to the{" "}
            <Link href="/store-terms" className="underline hover:text-yellow">
              store terms and returns policy
            </Link>
            .
          </p>
        </aside>
      </div>

      {picks.length > 0 && <Suggestions picks={picks} title="You might also like" />}
    </div>
  );
}

function Suggestions({ picks, title }: { picks: { p: CardProduct }[]; title: string }) {
  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="display text-3xl">{title}</h2>
        <Link href="/store" className="text-sm text-yellow underline underline-offset-4">
          Everything
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        {picks.map(({ p }) => (
          <ProductCard key={p.slug} p={p} />
        ))}
      </div>
    </section>
  );
}
