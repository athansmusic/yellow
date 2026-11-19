import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { BillingPanel } from "@/components/BillingPanel";
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
        {/* Their panel is mounted but out of sight: the membership card above renders the same
            facts once, and presses their buttons for anything that touches money. */}
        <BillingPanel />
        {/* Replies waiting, and what has been said lately anywhere. */}
        <DiscordLink />
        <Discussion />
      </div>
    </Container>
  );
}
