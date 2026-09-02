import { activeSubscription, cardOf, type ScUser } from "@/lib/sc";

/**
 * The membership, shown once, in our own styling.
 *
 * Every value comes from the user object the account form already fetched, so this costs no extra
 * call against Supporting Cast's sixty-a-minute — and nothing is scraped out of their DOM, which is
 * what made an earlier attempt at this fragile.
 *
 * Read-only on purpose. Their panel is on this page and its own controls work first time, whereas
 * pressing them from here through a synthetic click took several attempts to land. A summary that
 * always tells the truth beats a button that works on the third go.
 */
export function SubscriptionCard({ user }: { user: ScUser }) {
  const sub = activeSubscription(user);
  const card = cardOf(user.paymentMethod ?? null);

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

            {/* No button here on purpose: pressing their hidden one took several clicks to catch.
                Their panel is on this page and its own control works first time. */}
            <p className="text-sm text-muted">
              Change or cancel in <a href="#billing" className="text-yellow hover:underline underline-offset-4">Billing</a> below.
            </p>

          </div>
        </div>
      </div>
    </section>
  );
}
