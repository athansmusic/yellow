import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import cast from "@/data/cast.json";
import { getAllItems, formatDate, toTrack, type Episode } from "@/lib/feed";
import { SITE } from "@/lib/site";
import { PlayButton } from "@/components/AudioPlayer";
import { Container, Crumbs } from "@/components/ui";
import { ICONS, type IconName } from "@/components/Icons";
import { Arrow } from "@/components/Icons";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

export const revalidate = 600;

type Member = (typeof cast)[number];
const norm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");
const sameActor = (credit: string, actor: string) => {
  const a = norm(credit.split(/\s+as\s+/i)[0]);
  const b = norm(actor);
  return a === b || a.startsWith(b) || b.startsWith(a);
};

const LINK_LABELS: Record<string, string> = { twitch: "Twitch", instagram: "Instagram", x: "X", bluesky: "Bluesky", web: "Website", tiktok: "TikTok", spotify: "Spotify", youtube: "YouTube", patreon: "Patreon", discord: "Discord" };

export function generateStaticParams() {
  return cast.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = cast.find((x) => x.slug === slug);
  if (!c) return {};
  return {
    title: `${c.actor} (${c.character})`,
    description: `${c.actor} plays ${c.character} in REDACTED, the horror comedy audio drama from Hush Studios. Bio, roles, and links.`,
    alternates: { canonical: `/cast/${c.slug}` },
  };
}

export default async function CastMember({ params }: { params: Promise<{ slug: string }> }) {
  await assertVisible("/cast");
  const { slug } = await params;
  const idx = cast.findIndex((x) => x.slug === slug);
  const c = cast[idx] as Member | undefined;
  if (!c) notFound();
  const prev = cast[(idx - 1 + cast.length) % cast.length];
  const next = cast[(idx + 1) % cast.length];

  // Same actor may play several roles (the two Ignatius entries share a bio, not an actor)
  const roles = cast.filter((x) => x.actor === c.actor).map((x) => x.character);
  const all = await getAllItems().catch(() => [] as Episode[]);
  const appearances = all.filter((e) => e.kind !== "trailer" && e.starring.some((s) => sameActor(s, c.actor))).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const episodes = appearances.filter((e) => e.kind === "episode" || e.kind === "minisode");
  const postmortems = appearances.filter((e) => e.kind === "postmortem");
  // Hard-coded debuts where the main-show preference gets it wrong
  const FIRST_HEARD_OVERRIDES: Record<string, string> = { "lyssa-jay": "postmortem-false-start" };
  const first = (FIRST_HEARD_OVERRIDES[c.slug] ? appearances.find((e) => e.slug === FIRST_HEARD_OVERRIDES[c.slug]) : undefined) ?? appearances.find((e) => e.kind === "episode") ?? appearances[0];
  // Extra roles from the credits beyond the listed character(s), e.g. "a Plaster Pig"
  const extraRoles = Array.from(
    new Set(
      appearances
        .flatMap((e) => e.starring.filter((s) => sameActor(s, c.actor)).map((s) => s.split(/\s+as\s+/i)[1]?.trim()))
        .filter((r): r is string => !!r && !roles.some((x) => norm(x) === norm(r))),
    ),
  );
  const ownSource = c.aboutSource && (c.aboutSource.url.startsWith("/") || /theredactedunit\.com/i.test(c.aboutSource.url));
  const links = Object.entries(c.links ?? {}).filter(([, v]) => !!v) as [IconName, string][];

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}/cast/${c.slug}`,
    name: c.actor,
    image: `${SITE.url}${c.image}`,
    description: c.about || `${c.actor} plays ${c.character} in REDACTED.`,
    url: `${SITE.url}/cast/${c.slug}`,
    sameAs: links.map(([, v]) => v),
    performerIn: [{ "@id": `${SITE.url}/#series` }, ...episodes.slice(0, 10).map((e) => ({ "@type": "PodcastEpisode", name: e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title, url: `${SITE.url}/episodes/${e.slug}` }))],
  };

  return (
    <article>
      <JsonLd data={person} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Cast", url: `${SITE.url}/cast` }, { name: c.actor, url: `${SITE.url}/cast/${c.slug}` }])} />

      {/* Header band: big photo, name and character at equal weight */}
      <div className="relative border-b border-line bg-ink-2/80 overflow-hidden">
        <Image src={c.image} alt="" fill sizes="100vw" className="object-cover object-top scale-110 blur-3xl opacity-25" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/60" aria-hidden />
        <Container className="relative py-8 sm:py-12">
          <Crumbs items={[{ label: "Cast", href: "/cast" }, { label: c.actor }]} />
          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,24rem)_1fr] items-end">
            <div className="relative aspect-[4/5] overflow-hidden bg-ink border border-line shadow-[0_30px_60px_rgba(0,0,0,.6)]">
              <Image src={c.image} alt={`${c.actor} as ${c.character}`} fill priority sizes="(min-width:768px) 24rem, 100vw" className="object-cover object-top" />
            </div>
            <div className="md:pb-2">
              <h1 className="display text-5xl sm:text-7xl">
                {c.actor}
                <span className="block">as {roles.join(" · ")}</span>
              </h1>
              {extraRoles.length > 0 && <p className="mt-3 text-sm text-muted">Also voices {extraRoles.join(", ")}.</p>}

              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                {episodes.length > 0 && (
                  <div>
                    <dt className="eyebrow">Episodes</dt>
                    <dd className="display text-3xl tabular">{episodes.length}</dd>
                  </div>
                )}
                {postmortems.length > 0 && (
                  <div>
                    <dt className="eyebrow">Postmortems</dt>
                    <dd className="display text-3xl tabular">{postmortems.length}</dd>
                  </div>
                )}
                {first && (
                  <div>
                    <dt className="eyebrow">First heard in</dt>
                    <dd className="display text-3xl">
                      <Link href={`/episodes/${first.slug}`} className="hover:text-yellow">
                        {first.kind === "episode" ? first.code : first.title}
                      </Link>
                      <span className="block font-sans text-xs text-muted normal-case tracking-normal">{formatDate(first.date)}</span>
                    </dd>
                  </div>
                )}
              </dl>
              {first && (
                <div className="mt-6 flex items-center gap-3">
                  <PlayButton track={toTrack(first)} />
                  <span className="text-sm text-muted">Play {c.actor.split(" ")[0]}&apos;s first episode</span>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-14 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-10 content-start">
          {c.about && (
            <section>
              <h2 className="eyebrow mb-3">About {c.actor.split(" ")[0]}</h2>
              <p className="text-lg text-paper/90 max-w-prose whitespace-pre-line">{c.about}</p>
              {c.aboutSource && !ownSource && (
                <p className="mt-2 text-xs text-muted">
                  Source:{" "}
                  <a href={c.aboutSource.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-yellow">
                    {c.aboutSource.label.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </p>
              )}
            </section>
          )}
          {c.bio && (
            <section>
              <h2 className="eyebrow mb-3">The character</h2>
              <p className="display text-3xl mb-2">{c.character}</p>
              <p className="text-paper/85 max-w-prose whitespace-pre-line">{c.bio}</p>
            </section>
          )}
          {c.otherWork.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <h2 className="eyebrow">Also heard in</h2>
                {"imdb" in c && c.imdb && (
                  <a href={c.imdb as string} target="_blank" rel="noreferrer" className="text-xs text-muted underline underline-offset-2 hover:text-yellow">
                    Full credits on IMDb
                  </a>
                )}
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {(c.otherWork as { title: string; url?: string; note?: string }[]).map((w) => (
                  <li key={w.title} className="border border-line bg-ink-2/70 p-3">
                    {w.url ? (
                      <a href={w.url} target="_blank" rel="noreferrer" className="display text-xl hover:text-yellow">
                        {w.title}
                      </a>
                    ) : (
                      <span className="display text-xl">{w.title}</span>
                    )}
                    {w.note && <p className="text-xs text-muted mt-1">{w.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="grid gap-8 content-start">
          {links.length > 0 && (
            <div>
              <h2 className="eyebrow mb-3">Find {c.actor.split(" ")[0]}</h2>
              <ul className="grid gap-2">
                {links.map(([k, href]) => {
                  const I = ICONS[k];
                  const label = k === "web" ? href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : LINK_LABELS[k] ?? k;
                  return (
                    <li key={k}>
                      <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-line bg-ink-2/70 px-4 py-3 hover:border-yellow hover:text-yellow">
                        <I width={18} height={18} />
                        <span className="text-sm font-semibold truncate">{label}</span>
                        <Arrow className="ml-auto shrink-0 text-muted" width={14} height={14} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <Link href="/cast" className="text-sm text-muted underline underline-offset-4 hover:text-yellow">
            Full cast
          </Link>
        </aside>
      </Container>

      {/* Browse the cast without going back to the grid */}
      <nav aria-label="More cast" className="border-t border-line">
        <Container className="py-6 grid sm:grid-cols-2 gap-4">
          {[
            { m: prev, dir: "prev" as const },
            { m: next, dir: "next" as const },
          ].map(({ m, dir }) => (
            <Link key={dir} href={`/cast/${m.slug}`} className={`group flex items-center gap-4 ${dir === "next" ? "sm:flex-row-reverse sm:text-right" : ""}`}>
              <span className="relative size-16 shrink-0 overflow-hidden bg-ink-3 border border-line group-hover:border-yellow">
                <Image src={m.image} alt="" fill sizes="64px" className="object-cover object-top" />
              </span>
              <span className="min-w-0">
                <span className="eyebrow block">{dir === "prev" ? "Previous" : "Next"}</span>
                <span className="display text-2xl block group-hover:text-yellow">{m.actor}</span>
                <span className="text-xs text-muted block">{m.character}</span>
              </span>
            </Link>
          ))}
        </Container>
      </nav>
    </article>
  );
}
