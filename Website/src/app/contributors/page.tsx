import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getContributors } from "@/lib/contributors";
import { Container } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { SITE } from "@/lib/site";
import cast from "@/data/cast.json";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contributors",
  description: "The cast, guest writers, and artists that help bring REDACTED to life.",
  alternates: { canonical: "/contributors" },
};

export default async function ContributorsPage() {
  const people = await getContributors();
  const visible = people.filter((c) => !c.hidden && !c.empty);
  // Guest directors run in the order their episodes aired. A writer whose episode has not
  // landed yet has nothing in `wrote`, so there is no date to sort on: those tail the list and
  // say so on the card rather than showing an empty credit line.
  const aired = (c: { wrote: { date: string }[] }) => c.wrote[0]?.date ?? "";
  const writers = visible
    .filter((c) => c.roles.includes("writer"))
    .sort((a, b) => {
      const da = aired(a);
      const db = aired(b);
      if (!da && !db) return a.name.localeCompare(b.name);
      if (!da) return 1;
      if (!db) return -1;
      return +new Date(da) - +new Date(db);
    });
  const artists = visible.filter((c) => c.roles.includes("artist"));
  const castList = cast as { slug: string; actor: string; character: string; image: string }[];

  /** Tiles are the artist's own pieces; merch mockups are not their art. */
  const tilesFor = (uploaded: { url: string }[]) => uploaded.map((a) => a.url).slice(0, 4);

  return (
    <Container className="py-10 sm:py-16">
      <JsonLd data={breadcrumbJsonLd([{ name: "Contributors", url: `${SITE.url}/contributors` }])} />
      <h1 className="display text-5xl sm:text-7xl mt-2">Contributors</h1>
      <p className="mt-4 text-lg text-paper/90 max-w-prose">
        The cast, guest writers, and artists that help bring REDACTED to life.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2 text-sm" aria-label="Sections">
        {[
          ["#cast", "Cast"],
          ["#writers", "Guest writers"],
          ["#artists", "Artists"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="border border-line px-3 py-1.5 uppercase tracking-wider hover:border-yellow hover:text-yellow">
            {label}
          </a>
        ))}
      </nav>

      {/* Cast — the cast page is their home; this is a doorway, not a duplicate */}
      <section id="cast" className="mt-14 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
          <h2 className="display text-3xl">Cast</h2>
          <span className="text-xs text-muted tabular">{castList.length}</span>
        </div>
        <Link href="/cast" className="group mt-6 flex flex-wrap items-center gap-4 border border-line bg-ink-2/60 p-4 hover:border-yellow">
          <span className="flex -space-x-3">
            {castList.slice(0, 7).map((m) => (
              <span key={m.slug} className="relative size-14 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-ink">
                <Image src={m.image} alt="" fill sizes="56px" className="object-cover object-top" />
              </span>
            ))}
          </span>
          <span className="min-w-0">
            <span className="display text-2xl block leading-none group-hover:text-yellow">Meet the cast</span>
          </span>
          <span className="ml-auto text-yellow text-sm shrink-0">Full cast →</span>
        </Link>
      </section>

      {/* Guest writers */}
      <section id="writers" className="mt-16 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
          <h2 className="display text-3xl">Guest writers</h2>
          <span className="text-xs text-muted tabular">{writers.length}</span>
        </div>
        <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {writers.map((c) => {
            const ep = c.wrote[0];
            return (
              <li key={c.slug}>
                <Link href={`/contributors/${c.slug}`} className="group flex h-full items-center gap-4 border border-line bg-ink-2/60 p-3 hover:border-yellow">
                  <span className="relative size-16 shrink-0 overflow-hidden bg-ink">
                    {c.photo ? (
                      <Image src={c.photo} alt="" fill sizes="64px" className="object-cover object-top" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-muted" aria-hidden>
                        &#9646;
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="display text-xl block leading-none group-hover:text-yellow">{c.name}</span>
                    {c.knownFor.length > 0 && <span className="block text-xs text-muted mt-1 truncate">{c.knownFor.join(" \u00b7 ")}</span>}
                    <span className={`block text-[11px] tracking-wider mt-1 ${ep ? "text-yellow" : "text-muted"}`}>{ep ? ep.code : "Coming soon"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Artists */}
      <section id="artists" className="mt-16 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
          <h2 className="display text-3xl">Artists</h2>
          <span className="text-xs text-muted tabular">{artists.length}</span>
        </div>
        <ul className="mt-6 grid sm:grid-cols-2 gap-4">
          {artists.map((c) => {
            const tiles = tilesFor(c.art);
            return (
              <li key={c.slug}>
                <Link href={`/contributors/${c.slug}`} className="group block border border-line bg-ink-2/60 hover:border-yellow">
                  <span className="grid grid-cols-4 gap-px bg-line">
                    {tiles.length > 0
                      ? tiles.map((src, i) => (
                          <span key={i} className="relative block aspect-square bg-ink overflow-hidden">
                            <Image src={src} alt="" fill sizes="12vw" className="object-cover" />
                          </span>
                        ))
                      : Array.from({ length: 4 }, (_, i) => <span key={i} className="block aspect-square bg-ink" />)}
                  </span>
                  <span className="flex items-baseline justify-between gap-3 p-3">
                    <span className="display text-2xl leading-none group-hover:text-yellow">{c.name}</span>
                    <span className="text-xs text-muted shrink-0">
                      {c.art.length > 0 ? `${c.art.length} piece${c.art.length === 1 ? "" : "s"}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </Container>
  );
}
