import type { Metadata } from "next";
import { ScrollActiveIntoView } from "@/components/ScrollActiveIntoView";
import { getDoc } from "@/lib/content";
import Image from "next/image";
import Link from "next/link";
import { getEpisodes, getSevenPlanes, formatDate, formatDuration, type Episode } from "@/lib/feed";
import { EXTERNAL, LISTEN, LISTEN_BUTTONS, SITE, T7P_LISTEN } from "@/lib/site";
import { PlayButton } from "@/components/AudioPlayer";
import { Countdown } from "@/components/Countdown";
import { Container, PlatformButtons } from "@/components/ui";
import { getEarlyEpisodes } from "@/lib/early";
import { Arrow } from "@/components/Icons";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Episodes",
  description: "Every episode of REDACTED: Season 1, minisodes, Postmortem debriefs, and The Seven Planes. Listen on the site, with content warnings and transcripts.",
  alternates: { canonical: "/episodes" },
};
export const revalidate = 600;

const SHOWS = [
  { id: "redacted", label: "REDACTED" },
  { id: "postmortem", label: "Postmortem" },
  { id: "t7p", label: "The Seven Planes", short: "Seven Planes" },
  { id: "corrupted", label: "CORRUPTED", soon: true, href: "/corrupted" },
] as const;
type Show = (typeof SHOWS)[number]["id"];

const track = (e: Episode) => ({ id: e.guid, title: e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title, subtitle: e.guid.startsWith("t7p-") ? "The Seven Planes" : "REDACTED", src: e.audioUrl, image: e.image || "/brand/showart.jpeg", href: e.guid.startsWith("t7p-") ? `/${e.slug}` : `/episodes/${e.slug}` });
const pageHref = (e: Episode) => (e.guid.startsWith("t7p-") ? `/episodes?show=t7p` : `/episodes/${e.slug}`);

export default async function EpisodesPage({ searchParams }: { searchParams: Promise<{ show?: string; season?: string; order?: string; tab?: string }> }) {
  const sp = await searchParams;
  const onBreak = (await getDoc("settings").catch(() => null))?.seasonStatus === "break";
  // legacy ?tab= links from the first version
  const legacy: Record<string, { show: Show; season?: string }> = { "season-1": { show: "redacted", season: "1" }, minisodes: { show: "redacted", season: "minisodes" }, postmortem: { show: "postmortem" }, };
  const fromLegacy = sp.tab ? legacy[sp.tab] : undefined;
  const show: Show = (SHOWS.find((t) => t.id === (sp.show ?? fromLegacy?.show))?.id ?? "redacted") as Show;
  const [{ episodes, minisodes, postmortems }, t7pFeed, early] = await Promise.all([getEpisodes(), getSevenPlanes().catch(() => ({ episodes: [] })), getEarlyEpisodes().catch(() => [])]);

  // Episodes members already have and the public feed has not reached. Shown so the join pitch
  // reaches people browsing, rather than only those handed the direct link — but with no
  // synopsis and no play control, since neither is theirs yet.
  const earlySet = new Set<string>();
  const earlyRows: Episode[] = early.map((e) => {
    const m = e.slug.match(/^s(\d+)e(\d+)$/);
    earlySet.add(e.guid);
    return {
      kind: m ? ("episode" as const) : ("postmortem" as const),
      slug: e.slug,
      title: e.title,
      shortTitle: m
        ? e.title.replace(/^S\d+\s*E\d+\s*[:\-\u2013]\s*/i, "").trim()
        : e.title.replace(/^postmortem\s*:\s*/i, "").trim(),
      code: m ? `S${Number(m[1])} E${Number(m[2])}` : undefined,
      season: m ? Number(m[1]) : undefined,
      number: m ? Number(m[2]) : undefined,
      date: e.publishedAt && !Number.isNaN(Date.parse(e.publishedAt)) ? new Date(e.publishedAt).toISOString() : new Date().toISOString(),
      audioUrl: "",
      image: e.image || "/brand/showart.jpeg",
      duration: e.duration ? String(e.duration) : undefined,
      summary: "",
      bodyHtml: "",
      starring: [],
      credits: [],
      notesHtml: "",
      guid: e.guid,
    };
  });
  for (const r of earlyRows) {
    if (r.kind === "episode") episodes.push(r);
    else postmortems.push(r);
  }
  // Seven Planes items as Episode-shaped rows that link to the show page
  const t7p: Episode[] = t7pFeed.episodes.filter((e) => !/trailer/i.test(e.title)).map((e) => ({ kind: "bonus", slug: `t7p#${e.slug}`, title: e.title, shortTitle: e.title, date: e.date, audioUrl: e.audioUrl, image: "/spinoffs/t7p-art.jpeg", duration: e.duration, summary: e.summary, bodyHtml: e.bodyHtml, starring: [], credits: [], notesHtml: "", guid: `t7p-${e.slug}` }));

  const seasonsOf = (eps: Episode[]) => Array.from(new Set(eps.map((e) => e.season ?? 1))).sort((x, y) => x - y);
  const subTabs: { id: string; label: string }[] =
    show === "redacted"
      ? [...seasonsOf(episodes).map((n) => ({ id: String(n), label: `Season ${n}` })), { id: "minisodes", label: "Minisodes" }]
      : show === "postmortem"
        ? seasonsOf(postmortems).map((n) => ({ id: String(n), label: `Season ${n}` }))
        : [];
  const season = subTabs.find((t) => t.id === (sp.season ?? fromLegacy?.season))?.id ?? subTabs[0]?.id;

  const base: Episode[] =
    show === "t7p" ? t7p
    : show === "corrupted" ? []
    : show === "postmortem" ? postmortems.filter((e) => String(e.season ?? 1) === season)
    : season === "minisodes" ? minisodes
    : episodes.filter((e) => String(e.season ?? 1) === season);

  const sectionAll: Episode[] = show === "t7p" ? t7p : show === "postmortem" ? postmortems : show === "corrupted" ? [] : [...episodes, ...minisodes];
  // Early episodes are the newest by date but have no public audio, so letting one become the
  // featured row put an unplayable play button in the most prominent place on the page.
  // "Latest" means the latest one anybody can actually listen to.
  const latest = [...sectionAll].filter((e) => !earlySet.has(e.guid)).sort((x, y) => +new Date(y.date) - +new Date(x.date))[0];

  const defaultOrder = season === "minisodes" ? "newest" : "oldest";
  const order = sp.order === "oldest" || sp.order === "newest" ? sp.order : defaultOrder;
  const list = [...base].sort((x, y) => (order === "oldest" ? +new Date(x.date) - +new Date(y.date) : +new Date(y.date) - +new Date(x.date)));
  const season1 = episodes.filter((e) => (e.season ?? 1) === 1);
  const href = (q: { show?: Show; season?: string; order?: string }) => {
    const u = new URLSearchParams();
    const sh = q.show ?? show;
    u.set("show", sh);
    const se = q.show && q.show !== show ? undefined : (q.season ?? season);
    if (se) u.set("season", se);
    if (q.order) u.set("order", q.order);
    return `/episodes?${u.toString()}`;
  };
  const latestLabel = show === "postmortem" ? "Latest Postmortem" : show === "t7p" ? "Latest tape" : latest?.kind === "minisode" ? "Latest minisode" : "Latest episode";

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "REDACTED Season 1",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: season1.length,
    itemListElement: [...season1].sort((a, b) => (a.number ?? 0) - (b.number ?? 0)).map((e, i) => ({ "@type": "ListItem", position: i + 1, name: `${e.code}: ${e.shortTitle}`, url: `${SITE.url}/episodes/${e.slug}` })),
  };

  return (
    <>
      <JsonLd data={itemList} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Episodes", url: `${SITE.url}/episodes` }])} />

      {/* Page header: show tabs */}
      <div className="border-b border-line bg-ink/60">
        <Container>
          <p className="eyebrow pt-6">Episodes</p>
        <nav id="show-tabs" aria-label="Shows" className="flex gap-1 overflow-x-auto [scrollbar-width:none] -mx-4 px-4 sm:-mx-1 sm:px-1 mt-1 snap-x">
          <ScrollActiveIntoView id="show-tabs" />
          {SHOWS.map((t) => {
            const active = t.id === show;
            if ("soon" in t && t.soon) {
              const soonCls = "display text-xl sm:text-3xl px-3 sm:px-4 py-3 shrink-0 whitespace-nowrap [text-wrap:nowrap] border-b-4 border-transparent text-muted/60";
              const soonInner = (
                <>
                  {t.label} <span className="font-sans text-[10px] font-semibold uppercase tracking-wider align-middle border border-line px-1.5 py-0.5 ml-1">Coming soon</span>
                </>
              );
              // A show that has a teaser page of its own is a real link; the rest stay inert.
              return "href" in t && t.href ? (
                <Link key={t.id} href={t.href} className={`${soonCls} hover:text-yellow transition-colors`}>
                  {soonInner}
                </Link>
              ) : (
                <span key={t.id} aria-disabled="true" className={`${soonCls} cursor-default`}>
                  {soonInner}
                </span>
              );
            }
            return (
              <Link key={t.id} href={href({ show: t.id })} aria-current={active ? "page" : undefined} className={`display text-xl sm:text-3xl px-3 sm:px-4 py-3 shrink-0 snap-center whitespace-nowrap [text-wrap:nowrap] border-b-4 ${active ? "border-yellow text-yellow" : "border-transparent text-paper hover:text-yellow"}`}>
                <span className="sm:hidden">{"short" in t ? t.short : t.label}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </nav>

        </Container>
      </div>

      {/* Show hero: trailer (REDACTED) or show art, name + what it is, then a compact latest row */}
      {(() => {
        const intro =
          show === "postmortem"
            ? { name: "REDACTED Postmortem", tag: "In-universe spin-off", text: "Postmortem is an in-universe spin-off series, detailing the aberrations featured in each episode as the team debriefs their findings to The Curtain. Starring Lyssa Jay, Derek Moreland, Natalie Light, and Athan.", trailer: EXTERNAL.postmortemTrailerYouTubeId, schedule: <>Postmortems Tuesdays 9/8c</>, countdown: onBreak ? null : <Countdown to="postmortem" prefix="Next in" /> }
            : show === "t7p"
              ? { name: "The Seven Planes", tag: "Analog horror · by Landon Whisnant", text: "A collection of analog horror tapes chronicling the history of a strange world filled with even stranger inhabitants. Created by Landon Whisnant.", trailer: EXTERNAL.t7pTrailerYouTubeId, schedule: null, countdown: null }
              : { name: "REDACTED", tag: "A Procedural Horror Comedy", text: "Following the death of his twin, failing actor Jacob Kane assumes his late brother's life in hopes of a fresh start. Instead he finds himself working within The REDACTED Unit, a covert agency tasked with containing impossible creatures and phenomena.", trailer: EXTERNAL.trailerYouTubeId, schedule: <>Episodes {SITE.schedule}</>, countdown: onBreak ? null : <Countdown prefix="Next in" /> };
        const links = show === "t7p"
          ? [
              { name: "Spotify", href: T7P_LISTEN.spotify, icon: "spotify" as const },
              { name: "Apple Podcasts", href: T7P_LISTEN.apple, icon: "apple" as const },
              { name: "RSS", href: T7P_LISTEN.rss, icon: "rss" as const },
            ]
          : [...LISTEN_BUTTONS, { name: "Patreon", href: LISTEN.patreon, icon: "patreon" as const }];
        return (
          <div className="border-b border-line bg-ink-2/60">
            <Container className="py-8 sm:py-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-center">
              <div className="aspect-video w-full bg-black border border-line shadow-[0_30px_60px_rgba(0,0,0,.6)]">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${intro.trailer}?rel=0&modestbranding=1&color=white`}
                  title={`${intro.name} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  className="w-full h-full"
                />
              </div>

              <div>
                <p className="eyebrow text-yellow">{intro.tag}</p>
                <h1 className="display hero-title text-5xl lg:text-[clamp(2.5rem,3.3vw,3.75rem)] mt-1"><span className="sr-only">Episodes: </span>{intro.name}</h1>
                <p className="mt-4 text-paper/85 max-w-prose">{intro.text}</p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <PlatformButtons size="sm" links={links} />
                  {show !== "t7p" && (
                    <Link href="/where" className="text-sm text-paper/80 hover:text-yellow underline underline-offset-4">
                      More apps
                    </Link>
                  )}
                </div>
                {intro.schedule && (
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-paper/60">
                    {intro.schedule} <span className="text-yellow">{intro.countdown}</span>
                  </p>
                )}

                {latest && (
                  <div className="mt-7 flex items-center gap-4 border border-line bg-ink/70 p-3">
                    <Link href={pageHref(latest)} className="relative size-16 shrink-0 overflow-hidden bg-ink-3">
                      <Image src={latest.image || "/brand/showart.jpeg"} alt="" fill sizes="64px" className="object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow text-yellow">{latestLabel} · {formatDate(latest.date)}</p>
                      <Link href={pageHref(latest)} className="display text-2xl leading-[1] block hover:text-yellow">
                        {latest.kind === "episode" ? `${latest.code}: ${latest.shortTitle}` : latest.shortTitle}
                      </Link>
                      <p className="text-xs text-muted mt-1 line-clamp-1">
                        {latest.summary}
                        {latest.duration ? ` · ${formatDuration(latest.duration)}` : ""}
                      </p>
                    </div>
                    <PlayButton track={track(latest)} size="sm" />
                  </div>
                )}
              </div>
            </Container>
          </div>
        );
      })()}

      <Container className="py-8 sm:py-10">
        {/* Season tabs + order */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {subTabs.length > 0 ? (
            <nav aria-label="Seasons" className="flex gap-2 flex-wrap">
              {subTabs.map((t) => {
                const active = t.id === season;
                const n = t.id === "minisodes" ? minisodes.length : (show === "postmortem" ? postmortems : episodes).filter((e) => String(e.season ?? 1) === t.id).length;
                return (
                  <Link key={t.id} href={href({ season: t.id })} scroll={false} aria-current={active ? "page" : undefined} className={`display text-lg px-3 py-1.5 border ${active ? "border-yellow text-yellow" : "border-line text-paper hover:border-paper"}`}>
                    {t.label} <span className="text-muted text-sm tabular">({n})</span>
                  </Link>
                );
              })}
            </nav>
          ) : (
            <span />
          )}
          {list.length > 1 && (
            <div className="flex gap-1 text-sm" role="group" aria-label="Order">
              {(["oldest", "newest"] as const).map((o) => (
                <Link key={o} href={href({ order: o })} scroll={false} aria-current={order === o ? "true" : undefined} className={`px-3 py-1.5 border ${order === o ? "border-yellow text-yellow" : "border-line text-muted hover:text-paper"}`}>
                  {o === "oldest" ? "Oldest first" : "Newest first"}
                </Link>
              ))}
            </div>
          )}
        </div>

        {show === "postmortem" && <p className="mt-6 text-sm text-muted max-w-prose">Postmortem is an in-universe spin-off series, detailing the aberrations featured in each episode as the team debriefs their findings to The Curtain. Starring Lyssa Jay, Derek Moreland, Natalie Light, and Athan.</p>}
                {show === "t7p" && <p className="mt-6 text-sm text-muted max-w-prose">A collection of Analog Horror tapes chronicling the history of a strange world filled with even stranger inhabitants. Created by Landon Whisnant.</p>}

        {show === "corrupted" ? (
          <div className="py-16 text-center">
            <p className="display text-5xl text-muted/60">CORRUPTED</p>
            <p className="mt-2 text-muted">Coming soon.</p>
          </div>
        ) : list.length === 0 ? (
          <p className="py-12 text-muted">Nothing here yet.</p>
        ) : (
          <ol className="mt-6 grid gap-3 lg:grid-cols-2">
            {list.map((e, i) => {
              const n = e.kind === "episode" ? e.number : order === "oldest" ? i + 1 : list.length - i;
              return (
                <li key={e.guid} className="group relative overflow-hidden bg-ink-2/70 border border-line hover:border-yellow transition-colors">
                  <span aria-hidden className="absolute -right-2 -top-4 display text-[7rem] leading-none text-paper/[0.06] group-hover:text-yellow/10 tabular select-none transition-colors">
                    {String(n ?? "").padStart(2, "0")}
                  </span>
                  <div className="relative flex items-center gap-4 p-4 sm:p-5">
                    {earlySet.has(e.guid) ? (
                      /* No play control: there is no public file, and the member's copy lives on
                         the episode page where their token can be checked. */
                      <span aria-hidden className="grid size-11 shrink-0 place-items-center border border-yellow/50 text-yellow">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="10" width="16" height="10" rx="1" />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                      </span>
                    ) : (
                      <PlayButton track={track(e)} size="sm" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow text-yellow">{e.kind === "episode" ? e.code : e.kind === "postmortem" ? `Postmortem ${String(n).padStart(2, "0")}` : e.kind === "minisode" ? "Minisode" : "The Seven Planes"}</p>
                      <h2 className="display text-2xl sm:text-3xl leading-none mt-1">
                        <Link href={pageHref(e)} className="hover:text-yellow after:absolute after:inset-0">
                          {e.shortTitle}
                        </Link>
                      </h2>
                      {e.guestDirector && (
                        <p className="mt-1.5 inline-flex items-center gap-1.5 border border-yellow/50 text-yellow px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                          Guest director · <span className="normal-case tracking-normal font-bold">{e.guestDirector}</span>
                        </p>
                      )}
                      {earlySet.has(e.guid) && (
                        <p className="mt-1.5 inline-flex items-center gap-1.5 border border-yellow/50 text-yellow px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                          Early access · Members
                        </p>
                      )}
                      {e.summary && <p className="mt-1.5 text-sm text-muted line-clamp-1 max-w-prose">{e.summary}</p>}
                      <p className="mt-2 text-xs text-muted tabular">
                        {formatDate(e.date)}
                        {e.duration ? ` · ${formatDuration(e.duration)}` : ""}
                      </p>
                    </div>
                    <Arrow className="hidden sm:block shrink-0 text-muted group-hover:text-yellow" />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Container>
    </>
  );
}
