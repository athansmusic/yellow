"use client";

import { useEffect, useRef, useState } from "react";
import { ScWidget } from "@/components/ScWidget";

/**
 * Asks this panel to show itself.
 *
 * The membership card above works by pressing a button inside here, and a widget clipped to a
 * single pixel does not reliably lay out — so the card reveals the panel first and looks again,
 * rather than reporting that it could not find something the member cannot see anyway.
 */
export const REVEAL_BILLING = "tru-billing-reveal";

/**
 * Supporting Cast's account panel, kept on the page but out of sight.
 *
 * It still has to be mounted: the Change plan button above works by pressing theirs, and their
 * dialogs — the retention offer, the cancellation survey — are rendered by their React, not ours.
 *
 * Hidden by clipping rather than `display: none`, because a display:none ancestor stops a dialog
 * rendering at all, while a modal one opened with showModal() is drawn in the browser's top layer
 * and escapes clipping. If they ever open those dialogs non-modally the modal will be invisible,
 * which is exactly what the reveal below is for: somebody stuck can open the real panel and finish
 * what they were doing without waiting on a deploy.
 */
export function BillingPanel() {
  const [revealed, setRevealed] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onReveal = () => setRevealed(true);
    window.addEventListener(REVEAL_BILLING, onReveal);
    return () => window.removeEventListener(REVEAL_BILLING, onReveal);
  }, []);

  return (
    <section ref={wrap} className="mt-12 border-t border-line pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="eyebrow">Billing</h2>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="text-sm text-muted hover:text-yellow"
        >
          {revealed ? "Hide the full panel" : "Trouble? Open the full panel"}
        </button>
      </div>

      <div
        className={revealed ? "mt-4" : undefined}
        style={
          revealed
            ? undefined
            : {
                position: "absolute",
                width: 1,
                height: 1,
                margin: -1,
                padding: 0,
                overflow: "hidden",
                clipPath: "inset(50%)",
                whiteSpace: "nowrap",
                border: 0,
              }
        }
      >
        <ScWidget view="account" />
      </div>
    </section>
  );
}
