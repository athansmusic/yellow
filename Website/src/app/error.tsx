"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Container } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="py-24 text-center">
      <p className="eyebrow">Something broke</p>
      <h1 className="display text-6xl sm:text-8xl mt-2">
        [ERROR]
      </h1>
      <p className="mt-4 text-muted max-w-md mx-auto">This page didn&apos;t load. It&apos;s on our side, not yours. Try again in a moment; if it keeps happening, email crew@theredactedunit.com and tell us what you were doing.</p>
      {error.digest && <p className="mt-2 text-xs text-muted/60 tabular">Ref {error.digest}</p>}
      <div className="mt-8 flex gap-3 justify-center flex-wrap">
        <button type="button" onClick={reset} className="btn btn-yellow">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
    </Container>
  );
}
