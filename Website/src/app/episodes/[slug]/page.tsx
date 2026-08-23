import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllItems, getItemBySlug, getNeighbours, formatDate, formatDuration, toTrack } from "@/lib/feed";
import { getPlatformLinks, hasTranscript } from "@/lib/episodeLinks";
import { getDoc } from "@/lib/content";
import { ResumeBadge } from "@/components/ResumeBadge";
import { LISTEN, SITE } from "@/lib/site";
import cast from "@/data/cast.json";
import { PlayButton } from "@/components/AudioPlayer";
import { Container, Crumbs, PlatformButtons } from "@/components/ui";
import { Arrow } from "@/components/Icons";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 600;

export async function generateStaticParams() {
  try {
    return (await getAllItems()).map((e) => ({ slug: e.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const ep = await getItemBySlug(slug);
  if (!ep) return {};
  const desc = `${ep.summary} [REDACTED] ${ep.kind === "episode" ? ep.code : ep.kind}, ${formatDate(ep.date)}. Listen, see the cast, content warnings, and transcript.`;
  return {
    title: ep.title,
    description: desc.slice(0, 300),
    alternates: { canonical: `/episodes/${ep.slug}` },
    openGraph: { title: ep.title, description: ep.summary, type: "article", publishedTime: ep.date },
  };
}

const KIND_LABEL = { episode: "Episode", postmortem: "Postmortem", minisode: "Minisode", bonus: "Bonus", trailer: "Trailer" } as const;
const KIND_QUERY = { episode: "show=redacted", postmortem: "show=postmortem", minisode: "show=redacted&season=minisodes", bonus: "show=redacted", trailer: "show=redacted" } as const;

function safeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    // Feed copy sometimes links "example.com" without a scheme, which the browser would treat as a path on our site
    .replace(/href="(?!https?:|mailto:|\/|#)([^"]+\.[a-z]{2,}[^"]*)"/gi, 'href="https://$1"')
    .replace(/<a\s/gi, '<a target="_blank" rel="noreferrer" ');
}

function castFor(actor: string) {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");
  const a = norm(actor);
  return cast.find((c) => norm(c.actor) === a) ?? cast.find((c) => a.startsWith(norm(c.actor)) || norm(c.actor).startsWith(a));
}

export default async function EpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ep = await getItemBySlug(slug);
  if (!ep) notFound();
  const transcriptSlug = ep.kind === "episode" ? ep.slug : undefined;
  const [{ newer, older }, links, all, aberrations, transcriptOk] = await Promise.all([
    getNeighbours(ep),
    getPlatformLinks(ep.title),
    getAllItems().catch(() => []),
    getDoc("aberrations").catch(() => []),
    transcriptSlug ? hasTranscript(transcriptSlug) : Promise.resolve(false),
  ]);
  const norm = (x?: string) => (x ?? "").toLowerCase().replace(/[\s:]+/g, "");
  const stripPart = (x: string) => x.replace(/\s*\(part \d+\)\s*$/i, "");
  // Companion Postmortem for an episode, or the episode a Postmortem debriefs
  const companion =
    ep.kind === "episode"
      ? (all.find((e) => e.kind === "postmortem" && norm(e.shortTitle) === norm(ep.shortTitle)) ?? all.find((e) => e.kind === "postmortem" && norm(stripPart(e.shortTitle)) === norm(stripPart(ep.shortTitle))))
      : ep.kind === "postmortem"
        ? (all.find((e) => e.kind === "episode" && norm(e.shortTitle) === norm(ep.shortTitle)) ?? all.find((e) => e.kind === "episode" && norm(stripPart(e.shortTitle)) === norm(stripPart(ep.shortTitle))))
        : undefined;
  const aberration = ep.code ? aberrations.find((a) => norm(a.episodeCode) === norm(ep.code)) : undefined;

  const platforms = [
    { name: "Spotify", href: links.spotify ?? LISTEN.spotify, icon: "spotify" as const },
    { name: "Apple Podcasts", href: links.apple ?? LISTEN.apple, icon: "apple" as const },
    { name: "Akouva", href: LISTEN.akouva, icon: "akouva" as const },
    { name: "RSS", href: ep.acastUrl ?? LISTEN.rss, icon: "rss" as const },
    { name: "Patreon", href: links.patreon ?? LISTEN.patreon, icon: "patreon" as const },
  ];

  const title = ep.kind === "episode" ? `${ep.code}: ${ep.shortTitle}` : ep.title;
  const url = `${SITE.url}/episodes/${ep.slug}`;
  const art = ep.image || "/brand/showart.jpeg";
  const transcriptUrl = transcriptOk && transcriptSlug ? `https://www.tru.show/transcripts/redacted/${transcriptSlug}` : undefined;
  const boilerplate = new Set(["Co-created", "Executive producers", "Writing", "Music and Sound Design", "Dialogue Editing", "Show art", "Associated producers", "Concept"].map((x) => x.toLowerCase()));
  const episodeCredits = ep.credits.filter((c) => !boilerplate.has(c.label.toLowerCase()));
  const showCredits = ep.credits.filter((c) => boilerplate.has(c.label.toLowerCase()));
  const starring = ep.starring.map((s) => {
    const [actor, role] = s.split(/\s+as\s+/i);
    return { actor: actor.trim(), role: role?.trim(), member: castFor(actor.trim()) };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    "@id": url,
    name: title,
    url,
    datePublished: ep.date,
    description: ep.summary,
    image: art.startsWith("http") ? art : `${SITE.url}${art}`,
    associatedMedia: { "@type": "MediaObject", contentUrl: ep.audioUrl, encodingFormat: "audio/mpeg" },
    partOfSeries: { "@id": `${SITE.url}/#series` },
    ...(ep.number ? { episodeNumber: ep.number, partOfSeason: { "@type": "PodcastSeason", seasonNumber: ep.season ?? 1, name: `Season ${ep.season ?? 1}` } } : {}),
    ...(starring.length ? { actor: starring.map((s) => ({ "@type": "Person", name: s.actor })) } : {}),
  };

  const NavBtn = ({ e, dir }: { e: typeof newer; dir: "prev" | "next" }) => {
    const label = dir === "prev" ? "Previous" : "Next";
    const cls = "inline-flex items-center gap-2 min-h-10 px-3 border text-sm font-semibold";
    if (!e) return <span aria-disabled="true" className={`${cls} border-line text-muted/40 cursor-default`}>{dir === "prev" ? <Arrow className="rotate-180" width={16} height={16} /> : null}{label}{dir === "next" ? <Arrow width={16} height={16} /> : null}</span>;
    const name = e.kind === "episode" ? e.code : e.shortTitle;
    return (
      <Link href={`/episodes/${e.slug}`} title={e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title} className={`${cls} border-line hover:border-yellow hover:text-yellow`}>
        {dir === "prev" && <Arrow className="rotate-180" width={16} height={16} />}
        <span className="sr-only">{label}: </span>
        <span className="tabular">{name}</span>
        {dir === "next" && <Arrow width={16} height={16} />}
      </Link>
    );
  };

  return (
    <article>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Episodes", url: `${SITE.url}/episodes` }, { name: title, url }])} />

      {/* Header band: blurred cover behind, cover + title in front */}
      <div className="relative overflow-hidden border-b border-line">
        <Image src={art} alt="" fill sizes="100vw" className="object-cover scale-110 blur-2xl opacity-40" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/40" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" aria-hidden />
        <Container className="relative py-8 sm:py-12">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Crumbs items={[{ label: "Episodes", href: `/episodes?${KIND_QUERY[ep.kind]}` }, { label: ep.kind === "episode" ? ep.code ?? ep.title : KIND_LABEL[ep.kind] }]} />
            <div className="flex gap-2">
              <ShareButton title={`${title} · [REDACTED]`} text={ep.summary} path={`/episodes/${ep.slug}`} />
              <nav aria-label="Episode navigation" className="flex gap-2">
                <NavBtn e={older} dir="prev" />
                <NavBtn e={newer} dir="next" />
              </nav>
            </div>
          </div>
          <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,18rem)_1fr] items-center">
            <div className="relative aspect-square overflow-hidden bg-ink max-w-xs shadow-[0_30px_60px_rgba(0,0,0,.6)]">
              <Image src={art} alt="" fill sizes="(min-width:768px) 18rem, 100vw" priority className="object-cover" />
            </div>
            <div>
              <p className="eyebrow text-yellow mb-2">
                {KIND_LABEL[ep.kind]}
                {ep.code ? ` · ${ep.code}` : ""}
                {` · ${formatDate(ep.date)}`}
                {ep.duration ? ` · ${formatDuration(ep.duration)}` : ""}
              </p>
              <h1 className="display text-5xl sm:text-7xl">{ep.kind === "episode" ? ep.shortTitle : ep.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {ep.guestDirector && (
                  <span className="inline-flex items-center gap-1.5 border border-yellow/60 text-yellow px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                    Guest director · <span className="normal-case tracking-normal font-bold">{ep.guestDirector}</span>
                  </span>
                )}
                <ResumeBadge id={ep.guid} />
              </div>
              {ep.summary && <p className="mt-4 text-lg text-paper/85 max-w-prose">{ep.summary}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-6">
                <PlayButton track={{ id: ep.guid, title, subtitle: "[REDACTED]", src: ep.audioUrl, image: art, href: `/episodes/${ep.slug}` }} size="lg" />
                <PlatformButtons links={platforms} size="sm" />
                <Link href="/where" className="text-sm text-paper/80 hover:text-yellow underline underline-offset-4">
                  More apps
                </Link>
                {transcriptUrl && (
                  <a href={transcriptUrl} target="_blank" rel="noreferrer" className="text-sm text-paper/80 hover:text-yellow underline underline-offset-4">
                    Transcript
                  </a>
                )}
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-14 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-12 content-start">
          {ep.notesHtml && !(ep.guestDirector && /guest[\s-]*directed by/i.test(ep.notesHtml) && ep.notesHtml.replace(/<[^>]+>/g, "").trim().length < 120) && (
            <section>
              <h2 className="eyebrow mb-3">Episode notes</h2>
              <div className="prose-site text-paper/90 [overflow-wrap:anywhere] [&_a]:break-all [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1" dangerouslySetInnerHTML={{ __html: safeHtml(ep.notesHtml) }} />
            </section>
          )}

          {starring.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Starring</h2>
              <ul className="grid sm:grid-cols-2 gap-x-8 border-t border-line">
                {starring.map((s) => (
                  <li key={s.actor + s.role} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
                    <span className="display text-xl">{s.role ?? s.actor}</span>
                    {s.role &&
                      (s.member ? (
                        <Link href={`/cast/${s.member.slug}`} className="text-sm text-yellow text-right hover:underline underline-offset-4 shrink-0">
                          {s.actor}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted text-right shrink-0">{s.actor}</span>
                      ))}
                  </li>
                ))}
              </ul>
              <Link href="/cast" className="inline-block mt-3 text-sm text-yellow underline underline-offset-4">
                Full cast
              </Link>
            </section>
          )}

          <section id="warnings" className="scroll-mt-24">
            <details className="group border border-line bg-ink-2/70">
              <summary className="cursor-pointer list-none p-4 flex items-center justify-between display text-2xl">
                Content warnings
                <span aria-hidden className="text-yellow text-3xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-4 pb-4 text-paper/85">{ep.contentWarnings ?? "None listed for this one beyond the usual: horror, violence, language."}</p>
            </details>
          </section>


        </div>

        <aside className="grid gap-8 content-start">
          {(companion || newer || aberration) && (
            <div className="grid gap-3">
              {companion && (
                <Link href={`/episodes/${companion.slug}`} className="group flex items-center gap-3 border border-line bg-ink-2/70 p-3 hover:border-yellow">
                  <span className="relative size-14 shrink-0 overflow-hidden bg-ink-3">
                    <Image src={companion.image || "/brand/showart.jpeg"} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="eyebrow text-yellow block">{ep.kind === "postmortem" ? "Debriefs" : "Companion Postmortem"}</span>
                    <span className="display text-xl block group-hover:text-yellow">{companion.kind === "episode" ? `${companion.code}: ${companion.shortTitle}` : companion.shortTitle}</span>
                  </span>
                </Link>
              )}
              {aberration && (
                <Link href={`/aberrations/${aberration.slug}`} className="btn btn-ghost justify-between">
                  Aberration: {aberration.name} <Arrow />
                </Link>
              )}
              {newer && (
                <div className="border border-line bg-ink-2/70 p-3">
                  <p className="eyebrow">Up next</p>
                  <div className="mt-2 flex items-center gap-3">
                    <PlayButton track={toTrack(newer)} size="sm" />
                    <Link href={`/episodes/${newer.slug}`} className="display text-xl hover:text-yellow min-w-0">
                      {newer.kind === "episode" ? `${newer.code}: ${newer.shortTitle}` : newer.shortTitle}
                    </Link>
                  </div>
                  {newer.summary && <p className="mt-2 text-xs text-muted line-clamp-2">{newer.summary}</p>}
                </div>
              )}
            </div>
          )}

          {episodeCredits.length > 0 && (
            <div>
              <h2 className="eyebrow mb-3">This episode</h2>
              <dl className="grid gap-2 text-sm">
                {episodeCredits.map((c) => (
                  <div key={c.label} className="border-b border-line pb-2">
                    <dt className="text-muted text-xs uppercase tracking-wider">{c.label}</dt>
                    <dd className="text-paper/90">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {showCredits.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none flex items-center justify-between eyebrow">
                Show credits
                <span aria-hidden className="text-yellow text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <dl className="mt-3 grid gap-2 text-sm">
                {showCredits.map((c) => (
                  <div key={c.label} className="border-b border-line pb-2">
                    <dt className="text-muted text-xs uppercase tracking-wider">{c.label}</dt>
                    <dd className="text-paper/90">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          <Link href={`/episodes?${KIND_QUERY[ep.kind]}`} className="text-sm text-muted underline underline-offset-4 hover:text-yellow">
            All episodes
          </Link>
        </aside>
      </Container>
    </article>
  );
}
