"use client";

import { useEffect, useState } from "react";
import { ScWidget, SC_SECTIONS } from "@/components/ScWidget";

/**
 * Asks this panel into view. Recovery only — the ordinary path never shows it.
 */
export const REVEAL_BILLING = "tru-billing-reveal";

/**
 * Off-screen, at a width their widget renders happily into.
 *
 * Three things rule out the alternatives. `display: none` stops a <dialog> rendering at all, so
 * their modals would never open. Clipping to a pixel leaves the widget with no dimensions and it
 * does not render — that is why the Change plan button could not be found, and why the first
 * version had to expand the panel before it could press anything. And unmounting it would take
 * their whole React tree down with it.
 */
const OFFSCREEN: React.CSSProperties = {
  position: "fixed",
  left: -10000,
  top: 0,
  width: 900,
  pointerEvents: "none",
};

/**
 * Supporting Cast's account panel, mounted once and normally unseen.
 *
 * The membership card above presses a button in here and their modal opens over the page in the
 * browser's top layer, which is unaffected by where its container sits. Nothing expands, nothing
 * shifts, and cancelling the modal leaves the page exactly as it was — rather than stranding the
 * member looking at a second copy of their own settings.
 *
 * The same element moves in and out of flow, never remounting: a remount would rebuild their tree
 * and the button would disappear again mid-flow.
 */
export function BillingPanel() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const onReveal = () => setRevealed(true);
    window.addEventListener(REVEAL_BILLING, onReveal);
    return () => window.removeEventListener(REVEAL_BILLING, onReveal);
  }, []);

  return (
    <section className={revealed ? "mt-12 border-t border-line pt-8" : undefined}>
      {revealed && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="eyebrow">Billing</h2>
          <button
            type="button"
            onClick={() => setRevealed(false)}
            className="text-sm text-muted hover:text-yellow"
          >
            Hide
          </button>
        </div>
      )}
      <div style={revealed ? undefined : OFFSCREEN} aria-hidden={!revealed}>
        {/* Their General and Notification Settings are the fields this page renders above, so
            the panel keeps only what we do not do: the plan and the card. */}
        <ScWidget
          view="account"
          hide={[SC_SECTIONS.general, SC_SECTIONS.notifications]}
        />
      </div>
    </section>
  );
}
