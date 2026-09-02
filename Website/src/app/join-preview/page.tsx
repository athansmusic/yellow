import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { SupportingCastWidget } from "./SupportingCastWidget";

/**
 * Supporting Cast membership. All copy on this page is the owner's, from
 * the original Webflow build - per the standing rule, Claude adds no
 * public-facing prose here. UNLISTED: no nav, no sitemap, noindex.
 * Staged here while /join temporarily redirects to Patreon (next.config.ts);
 * at launch, move this back to /join and drop that redirect.
 */
export const metadata: Metadata = {
  title: "Join the Unit",
  robots: { index: false, follow: false },
};

const BENEFITS: { n: string; title: string; body: string }[] = [
  { n: "01", title: "Early, ad-free episodes", body: "Every episode before the public feed, with no ads. The story, uninterrupted." },
  { n: "02", title: "CORRUPTED", body: "Enjoy our double length monthly anthology horror series, CORRUPTED, a month early, ad-free." },
  { n: "03", title: "Direct support", body: "Your membership funds the ongoing production of REDACTED, and helps us make more of the stories you love." },
];

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
      {/* Owner's copy, verbatim. Its own line rather than a fourth benefit card: the cards each
          need a title, and writing one would be prose this page does not take from me. */}
      <p className="mt-6 display text-xl sm:text-2xl text-yellow">
        All tiers receive 20% off all items in our store!
      </p>
      {/* Benefits - owner's copy, verbatim */}
      <ul className="mt-12 grid sm:grid-cols-3 border-t border-l border-line">
        {BENEFITS.map((b) => (
          <li key={b.n} className="border-b border-r border-line p-5 sm:p-6">
            <div className="flex items-baseline gap-3">
              <span className="font-wide text-sm text-muted">{b.n}</span>
              <h2 className="display text-2xl uppercase">{b.title}</h2>
            </div>
            <p className="mt-2 text-sm text-muted leading-relaxed">{b.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <SupportingCastWidget />
      </div>
    </Container>
  );
}
