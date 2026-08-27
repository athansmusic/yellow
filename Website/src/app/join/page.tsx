import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { SupportingCastWidget } from "./SupportingCastWidget";

/**
 * Supporting Cast membership. All copy on this page is the owner's, from
 * the original Webflow build - per the standing rule, Claude adds no
 * public-facing prose here. UNLISTED: no nav, no sitemap, noindex.
 */
export const metadata: Metadata = {
  title: "Join the Unit",
  robots: { index: false, follow: false },
};

export default function JoinPage() {
  return (
    <Container className="py-16">
      <h1 className="display text-5xl sm:text-7xl leading-[0.95]">
        JOIN THE <span className="text-yellow">REDACTED</span> UNIT
      </h1>
      <p className="mt-6 text-lg text-paper/85 max-w-prose">
        As a member of THE REDACTED UNIT, listen to ad-free episodes early,
        get behind-the-scenes access, exclusive bonus content and shows on
        release day, and much more. Your membership directly supports the
        ongoing production of REDACTED, and helps us create more of the
        stories you love!
      </p>
      <div className="mt-12">
        <SupportingCastWidget />
      </div>
    </Container>
  );
}
