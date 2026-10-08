"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Container } from "@/components/ui";

/** Shown when the catalog can't be loaded (Printful down or rate-limited and no cached copy yet). */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-24 text-center">
      <p className="eyebrow">Store</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">The store is taking a breather</h1>
      <p className="mt-4 text-muted max-w-md mx-auto">We couldn&apos;t load the catalog from our print partner just now. Nothing is wrong with your cart or any order you&apos;ve placed. Give it a minute and try again.</p>
      <div className="mt-8 flex gap-3 justify-center flex-wrap">
        <button type="button" onClick={reset} className="btn btn-yellow">
          Try again
        </button>
        <Link href="/cart" className="btn btn-ghost">
          View cart
        </Link>
        <Link href="/episodes" className="btn btn-ghost">
          Episodes
        </Link>
      </div>
    </Container>
  );
}
