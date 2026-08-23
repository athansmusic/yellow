import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { QA, FAQ_GROUPS } from "@/data/faq";
import { Container } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about [REDACTED]: what it is, where to start, when episodes release, content warnings, transcripts, Patreon, the store, and how to contact the team.",
  alternates: { canonical: "/faq" },
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\[redacted\]/g, "redacted")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function Item({ x, open = false }: { x: (typeof QA)[number]; open?: boolean }) {
  return (
    <details id={slug(x.q)} open={open} className="group border-b border-line scroll-mt-24">
      <summary className="cursor-pointer list-none py-4 flex items-start justify-between gap-4">
        <span className="display text-2xl">{x.q}</span>
        <span aria-hidden className="text-yellow text-3xl leading-none transition-transform group-open:rotate-45 shrink-0">
          +
        </span>
      </summary>
      <div className="pb-5 text-paper/85 text-[15px] max-w-prose">
        {x.a}
        {x.link && (
          <>
            {" "}
            <Link href={x.link.href} className="text-yellow underline underline-offset-4">
              {x.link.label} →
            </Link>
          </>
        )}
      </div>
    </details>
  );
}

export default function FAQ() {
  const top = QA.filter((x) => x.top);
  return (
    <Container className="py-10 sm:py-16 max-w-3xl">
      <JsonLd data={faqJsonLd(QA.map(({ q, a }) => ({ q, a })))} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "FAQ", url: `${SITE.url}/faq` }])} />

      <p className="eyebrow">Questions</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">[REDACTED] FAQ</h1>
      <p className="mt-4 text-lg text-paper/90">The questions we get most, in our own words. Tap one to open it.</p>

      <nav aria-label="Jump to" className="mt-6 flex flex-wrap gap-2">
        {FAQ_GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="display text-lg px-3 py-1.5 border border-line hover:border-yellow hover:text-yellow">
            {g.label}
          </a>
        ))}
      </nav>

      {top.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-1">Start here</h2>
          <div className="border-t border-line">
            {top.map((x) => (
              <Item key={x.q} x={x} open />
            ))}
          </div>
        </section>
      )}

      {FAQ_GROUPS.map((g) => {
        const items = QA.filter((x) => x.group === g.id && !x.top);
        if (!items.length) return null;
        return (
          <section key={g.id} id={g.id} className="mt-12 scroll-mt-24">
            <h2 className="display text-3xl mb-1">{g.label}</h2>
            <div className="border-t border-line">
              {items.map((x) => (
                <Item key={x.q} x={x} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-14 border border-line bg-ink-2/70 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="display text-2xl">Still have a question?</p>
          <p className="text-sm text-paper/80 mt-1">Ask in the Discord, or email us.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/discord" className="btn btn-yellow">
            Discord
          </a>
          <a href={`mailto:${SITE.email}`} className="btn btn-ghost">
            {SITE.email}
          </a>
        </div>
      </section>
    </Container>
  );
}
