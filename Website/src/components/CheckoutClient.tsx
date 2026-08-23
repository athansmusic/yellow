"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useCart } from "@/lib/cart";

export function CheckoutClient({ publishableKey, country }: { publishableKey: string; country: string }) {
  const { lines, ready } = useCart();
  const [error, setError] = useState<string | null>(null);
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })) }),
    });
    const data = (await res.json()) as { clientSecret?: string; error?: string };
    if (!res.ok || !data.clientSecret) {
      setError(data.error ?? "Couldn't start checkout.");
      throw new Error(data.error ?? "checkout failed");
    }
    return data.clientSecret;
  }, [country, lines]);

  if (!ready) return <div className="h-[32rem] bg-ink-2/70 border border-line animate-pulse" aria-label="Loading checkout" />;
  if (!lines.length)
    return (
      <div className="border border-line bg-ink-2/70 p-6">
        <p className="display text-2xl">Your cart is empty</p>
        <p className="mt-1 text-sm text-muted">Nothing to pay for yet.</p>
        <Link href="/store" className="btn btn-yellow mt-5">
          Browse the store
        </Link>
      </div>
    );
  if (!publishableKey || !stripePromise)
    return (
      <div className="border border-line bg-ink-2 p-5 text-sm">
        <p className="display text-2xl">Payments aren’t connected yet</p>
        <p className="mt-2 text-muted">
          Add <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and <code>STRIPE_SECRET_KEY</code> to enable checkout. Your cart is saved.
        </p>
      </div>
    );
  if (error)
    return (
      <div className="border border-red bg-ink-2 p-5 text-sm">
        <p className="display text-2xl text-red-2">Checkout didn’t start</p>
        <p className="mt-2">{error}</p>
        <Link href="/cart" className="btn btn-ghost mt-4">
          Back to cart
        </Link>
      </div>
    );

  return (
    <div>
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
