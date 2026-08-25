import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContributor, getContributors } from "@/lib/contributors";
import { formatDate, formatDuration, toTrack } from "@/lib/feed";
import { PlayButton } from "@/components/AudioPlayer";
import { Container, Crumbs } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

const ROLE_LABEL = { writer: "Guest writer", artist: "Artist", cast: "Cast" } as const;
const SOCIAL_LABEL: Record<string, string> = { website: "Website", instagram: "Instagram", tiktok: "TikTok", twitter: "Twitter / X", youtube: "YouTube", imdb: "IMDb" };

export async function generateStaticParams() {
  return (await getContributors().catch(() => [])).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getContributor((await params).slug);
  if (!c) return {};
  const role = c.roles.includes("writer") ? "Guest writer" : "Artist";
  const ep = c.wrote[0];
  return {
    title: `${c.name} (${role})`,
    description: `${c.name}, ${role.toLowerCase()} on REDACTED${ep ? `, wrote ${ep.code}: ${ep.shortTitle}` : ""}${c.knownFor.length ? `. Known for ${c.knownFor.join(", ")}.` : "."}`,
    alternates: { canonical: `/contributors/${c.slug}` },
    openGraph: { siteName: "REDACTED" },
  };
}

export default async function ContributorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getContributor(slug);
  if (!c || c.hidden || c.empty || (c.roles.length === 1 && c.roles[0] === "cast")) notFound();
  const all = await getContributors();
  const others = all.filter((x) => !x.hidden && !x.empty && x.roles.includes("writer") && x.slug !== c.slug && x.wrote.length > 0).slice(0, 4);
  const hero = c.wrote[0];
  const primaryRole = c.roles.includes("writer") ? "Guest writer" : "Artist";
  const first = c.name.split(" ")[0].toUpperCase();

  const record: [string, string][] = [
    ["Role", c.roles.map((r) => ROLE_LABEL[r]).join(" · ")],
    ...(c.roles.includes("writer") ? ([["Episodes written", String(c.wrote.length)]] as [string, string][]) : []),
    ...(hero ? ([["First credit", hero.code ?? ""]] as [string, string][]) : []),
    ...(c.productCount ? ([["In store", `${c.productCount} product${c.productCount === 1 ? "" : "s"}`]] as [string, string][]) : []),
    ...(c.art.length ? ([["Art on file", String(c.art.length)]] as [string, string][]) : []),
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Contributors", url: `${SITE.url}/contributors` }, { name: c.name, url: `${SITE.url}/contributors/${c.slug}` }])} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Person", name: c.name, url: `${SITE.url}/contributors/${c.slug}`, ...(c.photo ? { image: `${SITE.url}${c.photo}` } : {}) }} />

      {/* Hero */}
      <section className="border-b border-line bg-ink-2/40">
        <Container className="py-8 sm:py-10">
          <Crumbs items={[{ label: "Contributors", href: "/contributors" }, { label: c.name }]} />
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,13rem)_1fr_minmax(0,20rem)] items-start">
            {/* ID photo */}
            <div>
              <div className="relative aspect-[3/4] border border-line bg-ink overflow-hidden">
                {c.photo ? (
                  <Image src={c.photo} alt={c.name} fill sizes="13rem" className="object-cover object-top" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-muted text-5xl" aria-hidden>
                    ▮
                  </span>
                )}
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-[.2em] text-muted">{c.photo ? "ID photo" : "No photo on file"}</p>
            </div>

            {/* Name block */}
            <div>
              <p className="inline-block bg-yellow text-ink px-2.5 py-1 text-xs font-bold uppercase tracking-[.18em]">{primaryRole}</p>
              {c.castSlug && (
                <p className="mt-2 text-xs uppercase tracking-[.18em] text-muted">
                  Also cast · {c.castCharacter}
                </p>
              )}
              <h1 className="display text-5xl sm:text-7xl leading-[0.95] mt-3">{c.name}</h1>
              {c.knownFor.length > 0 && (
                <div className="mt-5">
                  <p className="eyebrow">Known for</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {c.knownFor.map((k) => (
                      <li key={k} className="border border-line bg-ink px-3 py-1.5 text-sm uppercase tracking-wider">
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {hero && <PlayButton track={toTrack(hero)} size="lg" label={`Play ${hero.shortTitle}`} />}
                {c.castSlug && (
                  <Link href={`/cast/${c.castSlug}`} className="text-sm text-yellow underline underline-offset-4 hover:text-paper">
                    Cast profile →
                  </Link>
                )}
                {c.productCount > 0 && (
                  <Link href={`/store?artist=${encodeURIComponent(c.name)}`} className="text-sm text-yellow underline underline-offset-4 hover:text-paper">
                    Merch by {first} →
                  </Link>
                )}
              </div>
            </div>

            {/* Hero credit card */}
            {hero && (
              <div>
                <p className="eyebrow mb-2">Wrote this episode</p>
                <Link href={`/episodes/${hero.slug}`} className="group flex items-center gap-4 border border-line bg-ink p-3 hover:border-yellow">
                  <span className="relative size-16 shrink-0 overflow-hidden bg-ink-3">
                    <Image src={hero.image || "/brand/showart.jpeg"} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-yellow tracking-wider">{hero.code}</span>
                    <span className="display text-2xl block leading-none group-hover:text-yellow">{hero.shortTitle}</span>
                    <span className="block text-[11px] text-muted uppercase tracking-wider mt-1">
                      {formatDate(hero.date)} · {formatDuration(hero.duration)}
                    </span>
                  </span>
                </Link>
              </div>
            )}
          </div>
        </Container>
      </section>

      <Container className="py-10 sm:py-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] items-start">
        <div className="grid gap-10">
          {/* About */}
          <section>
            <h2 className="eyebrow mb-3">About {first}</h2>
            {c.bio ? (
              <p className="text-paper/90 max-w-prose whitespace-pre-line">{c.bio}</p>
            ) : (
              <p className="border border-line bg-ink-2/60 px-4 py-6 text-center text-sm uppercase tracking-[.25em] text-muted">[ REDACTED ]</p>
            )}
          </section>

          {/* Art pieces */}
          {c.art.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Art</h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {c.art.map((a) => (
                  <li key={a.id} className="border border-line bg-ink-2/70">
                    <span className="relative block aspect-square bg-ink">
                      <Image src={a.url} alt={a.title || `Art by ${c.name}`} fill sizes="(min-width:640px) 20vw, 45vw" className="object-contain" />
                    </span>
                    {a.title && <span className="block p-2 text-xs text-paper/85 truncate">{a.title}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Other work */}
          {c.works.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Other work</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {c.works.map((w) => {
                  const inner = (
                    <>
                      <span className="display text-xl block leading-none">{w.title}</span>
                      {w.note && <span className="block text-sm text-muted mt-1.5">{w.note}</span>}
                    </>
                  );
                  return (
                    <li key={w.id} className="border border-line border-l-2 border-l-red bg-ink-2/60 p-4">
                      {w.url ? (
                        <a href={w.url} target="_blank" rel="noreferrer" className="block hover:text-yellow">
                          {inner}
                        </a>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Episodes written */}
          {c.wrote.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">{c.wrote.length === 1 ? "Episode written" : "Episodes written"}</h2>
              <ul className="grid gap-3">
                {c.wrote.map((e) => (
                  <li key={e.slug} className="flex items-center gap-4 border border-line bg-ink p-3">
                    <Link href={`/episodes/${e.slug}`} className="relative size-14 shrink-0 overflow-hidden bg-ink-3">
                      <Image src={e.image || "/brand/showart.jpeg"} alt="" fill sizes="56px" className="object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs text-yellow tracking-wider">{e.code}</span>
                      <Link href={`/episodes/${e.slug}`} className="display text-xl block leading-none hover:text-yellow">
                        {e.shortTitle}
                      </Link>
                      {e.summary && <p className="text-xs text-muted mt-1 line-clamp-1">{e.summary}</p>}
                    </div>
                    <span className="hidden sm:block text-[11px] text-muted tabular shrink-0">{formatDuration(e.duration)}</span>
                    <PlayButton track={toTrack(e)} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Record rail */}
        <aside className="grid gap-4 content-start">
          <div className="border border-line bg-ink-2/60">
            <p className="px-4 py-3 border-b border-line text-[11px] uppercase tracking-[.18em] text-muted">Contributor record</p>
            <dl>
              {record.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 border-b border-line/60 last:border-0">
                  <dt className="text-[11px] uppercase tracking-[.14em] text-muted">{k}</dt>
                  <dd className="display text-lg text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {Object.keys(c.socials).length > 0 && (
            <div className="border border-line bg-ink-2/60 p-4">
              <p className="eyebrow mb-3">Find them</p>
              <ul className="flex flex-wrap gap-2">
                {Object.entries(c.socials).map(([k, url]) =>
                  url ? (
                    <li key={k}>
                      <a href={url} target="_blank" rel="noreferrer" className="inline-block border border-line px-3 py-1.5 text-xs uppercase tracking-wider hover:border-yellow hover:text-yellow">
                        {SOCIAL_LABEL[k] ?? k}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          )}

          {others.length > 0 && (
            <div className="border border-line bg-ink-2/60 p-4">
              <p className="eyebrow mb-3">Other guest writers</p>
              <ul className="grid gap-2">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/contributors/${o.slug}`} className="flex items-baseline justify-between gap-3 hover:text-yellow">
                      <span className="display text-lg truncate">{o.name}</span>
                      <span className="text-xs text-muted shrink-0">{o.wrote[0]?.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/contributors" className="inline-block mt-3 text-sm text-yellow underline underline-offset-4">
                All contributors
              </Link>
            </div>
          )}
        </aside>
      </Container>
    </>
  );
}
