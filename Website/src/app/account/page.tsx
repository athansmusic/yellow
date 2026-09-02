import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { ScWidget } from "@/components/ScWidget";
import { AccountFields } from "@/components/AccountFields";
import { MemberDebug } from "./MemberDebug";
import { Discussion } from "@/components/Discussion";
import { DiscordLink } from "@/components/DiscordLink";

/**
 * Member account access. Its own page, separate from the join flow, because a member arriving to
 * manage a subscription should not land on a page selling them one.
 *
 * Unlisted for now, like /join-preview: noindex, no nav entry, absent from the sitemap. A signed-in
 * utility page has nothing to offer a search result anyway.
 */
export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <Container className="py-16">
      <h1 className="display text-5xl sm:text-6xl leading-[0.95]">ACCOUNT</h1>
      <div className="mt-10">
        <MemberDebug />
        {/* Our own fields, written straight to Supporting Cast. Their embed stays for billing,
            where plan changes carry proration, retention offers and tax — the one screen where
            rebuilding it would cost real money to get wrong. */}
        <AccountFields />
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="eyebrow mb-4">Subscription and billing</h2>
          {/* Left in full rather than tucked away: it is also how a change made above is confirmed
              — save here, reload, and their page should agree. */}
          <ScWidget view="account" />
        </section>
        {/* Replies waiting, and what has been said lately anywhere. */}
        <DiscordLink />
        <Discussion />
      </div>
    </Container>
  );
}
