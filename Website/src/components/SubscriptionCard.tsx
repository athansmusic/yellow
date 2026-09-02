"use client";

import { useCallback, useState } from "react";
import { activeSubscription, cardOf, type ScUser } from "@/lib/sc";
import { REVEAL_BILLING } from "@/components/BillingPanel";

/**
 * The membership, shown once, in our own styling.
 *
 * Every value comes from the user object the account form already fetched, so this costs no extra
 * call against Supporting Cast's sixty-a-minute — and nothing is scraped out of their DOM, which is
 * what made an earlier attempt at this fragile.
 *
 * The actions are still theirs. Changing a plan means proration, retention offers and tax, and
 * their widget already does all of it correctly; our button presses theirs. That keeps the money
 * logic where it belongs while the page reads as one product.
 */
export function SubscriptionCard({ user }: { user: ScUser }) {
  const [note, setNote] = useState<string | null>(null);
  const sub = activeSubscription(user);
  const card = cardOf(user.paymentMethod ?? null);

  /**
   * Press their button.
   *
   * Their panel is mounted off-screen at a real width, so the button exists before anyone clicks
   * and their modal opens over the page. Nothing expands, and cancelling leaves the page as it was
   * rather than showing a second copy of the member's own settings.
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
      if (box.right < 0 || box.bottom < 0 || box.left > window.innerWidth) {
        window.dispatchEvent(new Event(REVEAL_BILLING));
        setTimeout(() => open.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      }
    }, 250);
  }, []);

  const reveal = useCallback(() => {
    window.dispatchEvent(new Event(REVEAL_BILLING));
    setTimeout(
      () =>
        document
          .querySelector("#supportingcast-widget")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      150,
    );
  }, []);

  if (!sub) {
    return (
      <section id="membership">
        <h2 className="eyebrow mb-4">Membership</h2>
        <p className="text-muted max-w-prose">No active membership on this account.</p>
      </section>
    );
  }

  const comped = !sub.stripe_subscription_id;

  /** The badge in the header strip: what state this membership is in, at a glance. */
  const state = sub.ends_at_formatted
    ? { label: "Ending", tone: "#ff8f6b" }
    : sub.is_trialing
      ? { label: "Trial", tone: "#ffe600" }
      : sub.active
        ? { label: "Active", tone: "#7ee787" }
        : { label: sub.status, tone: "#ff8f6b" };

  /** A qualifier on the price, where one is warranted. */
  const qualifier = sub.is_gift
    ? sub.gifter_name
      ? `Gift from ${sub.gifter_name}`
      : "Gift"
    : sub.is_trialing
      ? "Trial"
      : comped
        ? "Complimentary"
        : null;

  /** What happens next, in as few words as it can honestly be put. */
  const renews = sub.ends_at_formatted
    ? sub.ends_at_formatted
    : sub.is_gift && sub.gift_expires_at_formatted
      ? sub.gift_expires_at_formatted
      : comped
        ? "Never expires"
        : sub.auto_renew
          ? `Every ${sub.interval}`
          : "Will not renew";

  const benefits = (sub.benefit_items ?? []).slice().sort((a, b) => a.position - b.position);

  return (
    <section id="membership">
      <div className="border border-line">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <p className="eyebrow">Membership</p>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: state.tone }}>
            <span aria-hidden>●</span> {state.label}
          </p>
        </div>

        <div className="grid gap-8 p-5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] sm:gap-9">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
              <h3 className="display text-4xl leading-none">{sub.name}</h3>
              <span className="text-[15px] text-muted">
                {comped ? <s>{sub.price_description}</s> : sub.price_description}
              </span>
              {qualifier && (
                <span className="border border-yellow/50 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-yellow">
                  {qualifier}
                </span>
              )}
            </div>

            {sub.benefits_prefix_md && (
              <p className="mt-3.5 max-w-[46ch] text-[15px] leading-relaxed text-paper/80">
                {sub.benefits_prefix_md}
              </p>
            )}

            {benefits.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {benefits.map((b) => (
                  <li
                    key={b.id}
                    className="border border-line px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-muted"
                  >
                    {b.benefit_md}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid content-start gap-4 border-t border-line pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <div className="grid gap-1">
              <span className="eyebrow">Payment</span>
              <span className="text-[15px] text-paper/80">
                {card ? (
                  <>
                    {card.brand} ending {card.last4}
                    {card.expires && <span className="text-muted"> · {card.expires}</span>}
                  </>
                ) : comped ? (
                  "Nothing to charge"
                ) : (
                  "No card on file"
                )}
              </span>
            </div>

            <div className="grid gap-1">
              <span className="eyebrow">{sub.ends_at_formatted ? "Ends" : "Renews"}</span>
              <span className="text-[15px] text-paper/80">{renews}</span>
            </div>

            <div className="mt-1 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => void openTheirs(".sc-change-plan-button")}
                className="border border-yellow px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-yellow transition-colors hover:bg-yellow hover:text-ink"
              >
                Change plan
              </button>
              {/* Everything else their panel does — cards, invoices, the rest — without us
                  guessing which of their controls does what. */}
              <button
                type="button"
                onClick={reveal}
                className="border border-line px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-yellow hover:text-yellow"
              >
                Manage billing
              </button>
            </div>

            {note && (
              <p role="status" className="text-sm text-muted">
                {note}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
