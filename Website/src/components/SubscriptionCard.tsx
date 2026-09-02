"use client";

import { useCallback, useState } from "react";
import { activeSubscription, cardOf, type ScUser } from "@/lib/sc";
import { REVEAL_BILLING } from "@/components/BillingPanel";

/**
 * The membership, shown once, in our own styling.
 *
 * Every value here comes from the user object the account form already fetched, so this costs no
 * extra call against Supporting Cast's sixty-a-minute — and nothing is scraped out of their DOM,
 * which is what made the last attempt at this fragile.
 *
 * The actions are still theirs. Changing a plan means proration, retention offers and tax, and
 * their widget already does all of it correctly; our button simply presses theirs. That keeps the
 * money logic where it belongs while the page reads as one product.
 */
export function SubscriptionCard({ user }: { user: ScUser }) {
  const [note, setNote] = useState<string | null>(null);
  const sub = activeSubscription(user);
  const card = cardOf(user.paymentMethod ?? null);

  /**
   * Press their button.
   *
   * Their dialogs are their own React, so reaching for the button is the honest way in — a
   * hand-built modal would have to reimplement the retention offer and the cancellation survey and
   * would drift from whatever they change next.
   *
   * Their panel is mounted off-screen at a real size, so the button exists before anyone clicks
   * and the modal simply opens over the page. Nothing expands, and cancelling leaves the page as
   * it was rather than showing a second copy of the member's own settings.
   */
  const openTheirs = useCallback(async (selector: string) => {
    setNote(null);

    const find = () => document.querySelector<HTMLElement>(selector);
    let button = find();

    // Only if their widget is somehow still mounting.
    for (let i = 0; i < 10 && !button; i++) {
      await new Promise((r) => setTimeout(r, 100));
      button = find();
    }

    if (!button) {
      window.dispatchEvent(new Event(REVEAL_BILLING));
      setNote("Opened the full panel below — change your plan from there.");
      setTimeout(
        () =>
          document
            .querySelector("#supportingcast-widget")
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        150,
      );
      return;
    }

    button.click();

    /*
     * A modal is drawn in the top layer wherever its container sits; a non-modal one is not, and
     * would open off-screen where nobody could reach it. Their markup does not say which they use,
     * so rather than assume: if a dialog opened but landed outside the viewport, bring the panel
     * into the page so it can be seen and finished.
     */
    setTimeout(() => {
      const open = document.querySelector<HTMLDialogElement>("dialog[open]");
      if (!open) return;
      const box = open.getBoundingClientRect();
      const offscreen = box.right < 0 || box.bottom < 0 || box.left > window.innerWidth;
      if (offscreen) {
        window.dispatchEvent(new Event(REVEAL_BILLING));
        setTimeout(() => open.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      }
    }, 250);
  }, []);

  if (!sub) {
    return (
      <section>
        <h2 className="eyebrow mb-4">Membership</h2>
        <p className="text-muted max-w-prose">No active membership on this account.</p>
      </section>
    );
  }

  /** What is actually going to happen next, in one line. */
  const status = sub.is_gift
    ? sub.gift_expires_at_formatted
      ? `A gift${sub.gifter_name ? ` from ${sub.gifter_name}` : ""}, through ${sub.gift_expires_at_formatted}`
      : `A gift${sub.gifter_name ? ` from ${sub.gifter_name}` : ""}`
    : sub.ends_at_formatted
      ? `Ends ${sub.ends_at_formatted}`
      : sub.is_trialing
        ? "Trialling"
        : !sub.stripe_subscription_id
          ? "Complimentary access"
          : sub.auto_renew
            ? `Renews every ${sub.interval}`
            : "Will not renew";

  const benefits = sub.benefit_items ?? [];

  return (
    <section>
      <h2 className="eyebrow mb-4">Membership</h2>

      <div className="border border-line p-5 max-w-prose">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="display text-2xl">{sub.name}</p>
          {/* Struck through where nothing is being charged, which is how their panel says it too. */}
          <p className="text-muted">
            {sub.stripe_subscription_id ? (
              sub.price_description
            ) : (
              <s>{sub.price_description}</s>
            )}
          </p>
        </div>

        <p className="mt-1 text-sm text-yellow">{status}</p>

        {benefits.length > 0 && (
          <>
            {sub.benefits_prefix_md && (
              <p className="mt-4 text-sm text-paper/80">{sub.benefits_prefix_md}</p>
            )}
            <ul className="mt-3 flex flex-wrap gap-2">
              {benefits
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((b) => (
                  <li
                    key={b.id}
                    className="border border-line px-2 py-0.5 text-xs uppercase tracking-[0.14em] text-muted"
                  >
                    {b.benefit_md}
                  </li>
                ))}
            </ul>
          </>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4">
          <span className="eyebrow">Payment</span>
          <span className="text-sm">
            {card ? (
              <>
                {card.brand} ending {card.last4}
                {card.expires && <span className="text-muted"> · expires {card.expires}</span>}
              </>
            ) : (
              <span className="text-muted">
                {sub.stripe_subscription_id ? "No card on file" : "Nothing to charge"}
              </span>
            )}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void openTheirs(".sc-change-plan-button")}
            className="border border-yellow px-4 py-2 text-sm uppercase tracking-[0.14em] text-yellow hover:bg-yellow hover:text-ink"
          >
            Change plan
          </button>
          {/* Everything else their panel does — cards, invoices, the rest — without us guessing
              which of their controls does what. */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event(REVEAL_BILLING));
              setTimeout(
                () =>
                  document
                    .querySelector("#supportingcast-widget")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                150,
              );
            }}
            className="border border-line px-4 py-2 text-sm uppercase tracking-[0.14em] text-muted hover:border-yellow hover:text-yellow"
          >
            Manage billing
          </button>
        </div>

        {note && (
          <p role="status" className="mt-3 text-sm text-muted">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
