import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { ScWidget } from "@/components/ScWidget";

/**
 * The member's private feed and the add-to-your-app links, which Supporting Cast generates and
 * hosts — `setup` is their name for this screen. Reached from the account menu in the header, which
 * only exists for signed-in members; a signed-out visitor who finds this URL gets their login
 * screen from the widget itself rather than a dead end.
 *
 * Unlisted like /account and /login: noindex, no nav entry, absent from the sitemap. A page whose
 * entire content is behind a member login has nothing to offer a search result.
 */
export const metadata: Metadata = {
  title: "Your feeds",
  robots: { index: false, follow: false },
};

export default function FeedsPage() {
  return (
    <Container className="py-16">
      <h1 className="display text-5xl sm:text-6xl leading-[0.95]">YOUR FEEDS</h1>
      <p className="mt-4 max-w-prose text-muted">
        Add the ad-free feed to whichever app you already listen in. The link is yours alone — it
        carries your membership, so keep it to yourself.
      </p>
      <div className="mt-10">
        <ScWidget view="setup" />
      </div>
    </Container>
  );
}
