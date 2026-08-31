import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { ScWidget } from "@/components/ScWidget";
import { MemberDebug } from "./MemberDebug";
import { Discussion } from "@/components/Discussion";
import { MemberPrefs } from "@/components/MemberPrefs";
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
        <ScWidget view="account" />
        {/* Replies waiting, and what has been said lately anywhere. */}
        <MemberPrefs />
        <DiscordLink />
        <Discussion />
      </div>
    </Container>
  );
}
