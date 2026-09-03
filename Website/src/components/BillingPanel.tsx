"use client";

import { ScWidget, SC_SECTIONS } from "@/components/ScWidget";

/**
 * Supporting Cast's panel, trimmed to what this page does not do itself.
 *
 * It sits in the page as its own box. Earlier versions kept it off-screen and pressed its buttons
 * from a distance, which meant revealing it mid-flow and leaving the member staring at a second
 * copy of their own settings when they cancelled. Hiding their General and Notification Settings
 * removes the duplication at the source, so the panel can simply be here.
 *
 * Being in the page also means their dialogs open where they were always meant to, with no
 * guessing about whether a given one is modal.
 */
export function BillingPanel() {
  return (
    <section id="billing" className="mt-10">
      <div className="border border-line">
        <div className="border-b border-line px-5 py-3">
          <p className="eyebrow">Billing</p>
        </div>
        <div className="p-5">
          {/* Their General and Notification Settings are the fields this page renders above. */}
          <ScWidget view="account" hide={[SC_SECTIONS.general, SC_SECTIONS.notifications]} />
        </div>
      </div>
    </section>
  );
}
