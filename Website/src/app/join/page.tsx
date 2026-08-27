import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { SupportingCastWidget } from "./SupportingCastWidget";

/**
 * Supporting Cast membership - join page. UNLISTED while it's being built
 * out: no nav entry, no sitemap entry, robots noindex. Reachable only by
 * URL so the owner can review it in place.
 */
export const metadata: Metadata = {
  title: "Join the Unit",
  description:
    "Ad-free episodes, early access, and members-only extras - support REDACTED directly.",
  robots: { index: false, follow: false },
};

export default function JoinPage() {
  return (
    <Container className="py-16">
      <p className="eyebrow text-yellow mb-3">Membership</p>
      <h1 className="display text-5xl sm:text-7xl">JOIN THE UNIT</h1>
      <p className="mt-4 text-lg text-paper/85 max-w-prose">
        Ad-free episodes, early access, and members-only extras — straight
        from us, no middleman platform taking the bigger cut.
      </p>
      <div className="mt-10">
        <SupportingCastWidget />
      </div>
    </Container>
  );
}
