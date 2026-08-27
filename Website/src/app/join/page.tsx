import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { SupportingCastWidget } from "./SupportingCastWidget";

/**
 * Supporting Cast membership - join page, framed as a personnel-intake
 * dossier (the house voice: clearances, declassification, file numbers).
 * UNLISTED while it's being built out: no nav entry, no sitemap entry,
 * robots noindex. Reachable only by URL so the owner can review in place.
 */
export const metadata: Metadata = {
  title: "Join the Unit",
  description:
    "Ad-free episodes early, behind-the-scenes access, exclusive bonus content on release day - membership that directly supports the production of REDACTED.",
  robots: { index: false, follow: false },
};

const CLEARANCES: { n: string; title: string; body: string }[] = [
  { n: "01", title: "Early, ad-free episodes", body: "Every episode before the public feed, with no ads. The story, uninterrupted." },
  { n: "02", title: "Behind the scenes", body: "How the sausage gets haunted: process, outtakes, and the conversations that shape the show." },
  { n: "03", title: "Bonus content on release day", body: "Exclusive extras and member shows the moment they exist - not weeks later." },
  { n: "04", title: "Direct support", body: "Your membership funds the ongoing production of REDACTED, and helps us make more of the stories you love." },
];

export default function JoinPage() {
  return (
    <Container className="py-16">
      {/* ---- intake header ---- */}
      <div className="flex items-baseline justify-between gap-6 border-b border-line pb-3">
        <p className="eyebrow text-yellow">Membership · Personnel intake</p>
        <p className="font-wide text-xs text-muted tracking-widest whitespace-nowrap">FILE // TRU-MEM-001</p>
      </div>

      <div className="relative mt-8">
        <h1 className="display text-5xl sm:text-7xl leading-[0.95]">
          JOIN THE{" "}
          <span
            className="redact transition-colors duration-300 hover:bg-transparent hover:text-yellow cursor-help"
            title="Declassified."
          >
            [REDACTED]
          </span>{" "}
          UNIT
        </h1>
        {/* stamp */}
        <span
          aria-hidden
          className="hidden sm:inline-block absolute -top-4 right-0 rotate-[-8deg] border-2 border-yellow text-yellow px-3 py-1.5 font-wide text-xs tracking-[0.3em] uppercase opacity-80 select-none"
        >
          Members only
        </span>
      </div>

      <p className="mt-6 text-lg text-paper/85 max-w-prose">
        As a member of THE [REDACTED] UNIT, you listen to ad-free episodes
        early, get behind-the-scenes access, and receive exclusive bonus
        content and shows on release day. Your membership directly supports
        the ongoing production of REDACTED — and helps us make more of the
        stories you love.
      </p>

      {/* ---- what your clearance grants ---- */}
      <section className="mt-12">
        <h2 className="eyebrow text-yellow mb-4">What your clearance grants</h2>
        <ul className="grid sm:grid-cols-2 border-t border-l border-line">
          {CLEARANCES.map((c) => (
            <li key={c.n} className="border-b border-r border-line p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-wide text-sm text-muted">{c.n}</span>
                <h3 className="display text-2xl uppercase">{c.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted leading-relaxed">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- the widget: tiers as clearance levels ---- */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-6 border-b border-line pb-3 mb-8">
          <h2 className="eyebrow text-yellow">Select clearance level</h2>
          <p className="font-wide text-xs text-muted tracking-widest whitespace-nowrap">AUTHORIZATION REQUIRED</p>
        </div>
        <SupportingCastWidget />
        <p className="mt-6 text-xs text-muted">
          Clearance processed by Supporting Cast. Cancel anytime — no
          debriefing required.
        </p>
      </section>
    </Container>
  );
}
