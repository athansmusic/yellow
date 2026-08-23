import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutClient } from "@/components/CheckoutClient";
import { Container } from "@/components/ui";
import { ALLOWED_COUNTRIES, COUNTRY_NAMES, regionFor } from "@/lib/shipping";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const { country } = await searchParams;
  const cc = (country ?? "US").toUpperCase();
  const safe = (ALLOWED_COUNTRIES as readonly string[]).includes(cc) ? cc : "US";
  const region = regionFor(safe);
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return (
    <Container className="py-6 sm:py-10 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mb-5">
        <div>
          <Link href="/cart" className="text-sm text-muted hover:text-yellow underline underline-offset-4">
            ← Back to cart
          </Link>
          <h1 className="display text-3xl sm:text-4xl mt-1">Checkout</h1>
        </div>
        <p className="text-sm text-muted">
          Shipping to <span className="text-paper">{COUNTRY_NAMES[safe] ?? safe}</span>
          {region.countries.length > 1 ? ` (or anywhere in ${region.label})` : ""} ·{" "}
          <Link href="/cart" className="underline underline-offset-4 hover:text-yellow">
            change
          </Link>
        </p>
      </div>
      <CheckoutClient publishableKey={pk} country={safe} />
      <p className="mt-4 text-xs text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Secure checkout by Stripe. We never see your card.
        </span>
        <span>Have a code? Add it under the order summary.</span>
        <a href={`mailto:${SITE.email}?subject=Store%20order`} className="underline underline-offset-4 hover:text-yellow">
          Need help? {SITE.email}
        </a>
      </p>
    </Container>
  );
}
