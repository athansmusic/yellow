import type { Metadata } from "next";
import supporters from "@/data/supporters.json";
import Link from "next/link";
import { EXTERNAL } from "@/lib/site";
import { PageHero, Section } from "@/components/ui";
import { assertVisible } from "@/lib/visibility";
import { WallMembers } from "@/components/WallMembers";

export const metadata: Metadata = {
  title: "Supporter Wall: Kickstarter Backers",
  description: "Every Kickstarter backer who made REDACTED possible, by name. Funded May 2025 at 313% with 400+ backers.",
  alternates: { canonical: "/supporter-wall" },
};

function letterOf(name: string) {
  const c = name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(c) ? c : "#";
}

export default async function SupporterWall() {
  await assertVisible("/supporter-wall");
  const groups = new Map<string, string[]>();
  for (const n of supporters.backers) {
    const l = letterOf(n);
    groups.set(l, [...(groups.get(l) ?? []), n]);
  }
  const letters = [...groups.keys()].sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));

  return (
    <>
      <PageHero
        title="Thank you"
        eyebrow="Kickstarter supporters"
        intro={
          <>
            <p>Everybody below made this show possible, and we are so incredibly overwhelmed and thankful of the support from the community.</p>
            <p className="mt-4">
              <span className="eyebrow block mb-1">Season one associate producers</span>
              <span className="display text-3xl text-yellow">{supporters.associateProducers.join(" & ")}</span>
            </p>
          </>
        }
      />
      <Section>
        <h2 className="sr-only">REDACTED Kickstarter backers</h2>
        {/* Campaign strip */}
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] items-center border border-line bg-ink-2/70 p-5 sm:p-6 mb-8">
          <p className="text-paper/85 max-w-prose">
            REDACTED was funded on Kickstarter in May 2025, finishing at 313% with more than 400 backers. The first three episodes were released together on November 8, 2025, and new episodes have dropped every Friday since. Everyone named here made that happen.{" "}
            <Link href={EXTERNAL.kickstarter} className="text-yellow underline underline-offset-4">
              The campaign page
            </Link>
            .
          </p>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              ["313%", "Funded"],
              ["400+", "Backers"],
              ["May 2025", "Campaign"],
            ].map(([v, k]) => (
              <div key={k} className="border border-line px-4 py-3">
                <dd className="display text-2xl text-yellow tabular">{v}</dd>
                <dt className="eyebrow mt-1">{k}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Associate producers, first */}
        <section id="associate-producers" className="scroll-mt-32 mb-10">
          <h2 className="display text-5xl text-yellow">Associate producers</h2>
          <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
            {supporters.associateProducers.map((n) => (
              <li key={n} className="display text-2xl">
                {n}
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Jump to letter" className="sticky top-16 z-10 bg-ink/95 backdrop-blur py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-line overflow-x-auto">
          <ul className="flex gap-1">
            {letters.map((l) => (
              <li key={l}>
                <a href={`#letter-${l === "#" ? "other" : l}`} className="display text-xl px-2.5 py-1 block hover:text-yellow">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-muted mt-6 tabular">{supporters.backers.length} backers</p>
        {letters.map((l) => (
          <section key={l} id={`letter-${l === "#" ? "other" : l}`} className="scroll-mt-32 mt-10">
            <h2 className="display text-5xl text-yellow">{l}</h2>
            <ul className="mt-3 columns-2 sm:columns-3 lg:columns-4 gap-6 [&>li]:break-inside-avoid">
              {groups.get(l)!.map((n) => (
                <li key={n} className="py-1 text-sm">
                  {n}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Section>

      <Section>
        <div className="border-t border-line pt-10">
          <h2 className="display text-3xl sm:text-4xl">TRU MEMBERS</h2>
          <p className="mt-3 max-w-prose text-muted">
            Thank you to everybody continuing to support us.
          </p>
          <div className="mt-6">
            <WallMembers />
          </div>
        </div>
      </Section>
    </>
  );
}
