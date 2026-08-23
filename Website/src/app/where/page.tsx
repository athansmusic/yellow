import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getEpisodes, formatDate, formatDuration, toTrack, type Episode } from "@/lib/feed";
import { getPlatformLinks } from "@/lib/episodeLinks";
import { LISTEN, SITE } from "@/lib/site";
import { PlayButton } from "@/components/AudioPlayer";
import { Container } from "@/components/ui";
import { Arrow, ICONS, type IconName } from "@/components/Icons";
import { CopyButton, SmartLink } from "@/components/ListenLinks";
import { EpisodePicker } from "@/components/EpisodePicker";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Where to Listen",
  description: "Listen to [REDACTED] free on Apple Podcasts, Spotify, Akouva, YouTube, Overcast, Pocket Casts, Amazon Music, and every other podcast app, or right here on the site. Per-episode links for each app.",
  alternates: { canonical: "/where" },
};
export const revalidate = 600;

const APPLE_ID = LISTEN.appleShowId;
const RSS = LISTEN.rss;
type App = { name: string; href: string; scheme?: string; icon?: IconName; img?: string; note?: string };

const TOP: App[] = [
  { name: "Apple Podcasts", href: LISTEN.apple, scheme: LISTEN.apple.replace(/^https:/, "podcasts:"), img: "/brand/apps/applepodcasts.svg" },
  { name: "Spotify", href: LISTEN.spotify, scheme: `spotify:show:${LISTEN.spotifyShowId}`, img: "/brand/apps/spotify.svg" },
  { name: "Akouva", href: LISTEN.akouva, img: "/brand/akouva.png" },
];
const APPS: App[] = [
  { name: "YouTube", href: LISTEN.youtube, img: "/brand/apps/youtube.svg" },
  { name: "YouTube Music", img: "/brand/apps/youtubemusic.svg", href: "https://music.youtube.com/playlist?list=PLnKcUvxEvEXof7nLNUE4uVmpRIEXRNYMj" },
  { name: "Amazon Music", img: "/brand/apps/amazonmusic.png", href: "https://music.amazon.com/podcasts/aecbcb69-21f4-4016-a6cb-52981d3ea374/redacted" },
  { name: "Audible", img: "/brand/apps/audible.svg", href: "https://www.audible.com/podcast/REDACTED/B0FXV1G5PB" },
  { name: "Overcast", img: "/brand/apps/overcast.svg", href: `https://overcast.fm/itunes${APPLE_ID}`, scheme: `overcast://x-callback-url/add?url=${encodeURIComponent(RSS)}` },
  { name: "Pocket Casts", img: "/brand/apps/pocketcasts.svg", href: `https://pca.st/itunes/${APPLE_ID}`, scheme: `pktc://subscribe/${RSS.replace(/^https?:\/\//, "")}` },
  { name: "Castro", img: "/brand/apps/castro.svg", href: `https://castro.fm/itunes/${APPLE_ID}` },
  { name: "Castbox", img: "/brand/apps/castbox.svg", href: `https://castbox.fm/vic/${APPLE_ID}` },
  { name: "Podcast Addict", img: "/brand/apps/podcastaddict.svg", href: `https://podcastaddict.com/feed/${encodeURIComponent(RSS)}` },
  { name: "iHeartRadio", img: "/brand/apps/iheartradio.svg", href: "https://iheart.com/podcast/1333-redacted-305527885" },
  { name: "Pandora", img: "/brand/apps/pandora.svg", href: "https://www.pandora.com/podcast/redacted/PC:1001118921" },
  { name: "Goodpods", img: "/brand/apps/goodpods.png", href: "https://goodpods.com/podcasts/redacted-712167" },
  { name: "Podbean", img: "/brand/apps/podbean.png", href: `https://www.podbean.com/itunes/${APPLE_ID}` },
  { name: "Deezer", img: "/brand/apps/deezer.svg", href: "https://www.deezer.com/show/1002317702" },
  { name: "Player FM", img: "/brand/apps/playerfm.svg", href: "https://player.fm/series/https:%252F%252Ffeeds%252Eacast%252Ecom%252Fpublic%252Fshows%252F68dfd04b043c361f82e093c0" },
  { name: "AntennaPod", img: "/brand/apps/antennapod.svg", href: `https://antennapod.org/deeplink/subscribe?url=${encodeURIComponent(RSS)}` },
];

function Mark({ a, size = 20 }: { a: App; size?: number }) {
  const I = a.icon ? ICONS[a.icon] : null;
  if (I) return <I width={size} height={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={a.img} alt="" width={size} height={size} className="app-mark" style={{ width: size, height: size, borderRadius: a.img?.endsWith(".png") ? 4 : 0 }} />;
}

export default async function ListenPage({ searchParams }: { searchParams: Promise<{ tab?: string; ep?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "episodes" ? "episodes" : "apps";
  const { episodes, all } = await getEpisodes().catch(() => ({ episodes: [] as Episode[], all: [] as Episode[] }));
  const recent = all.filter((e) => e.kind !== "trailer" && !/^we recommend/i.test(e.title)).slice(0, 40);
  const selected = recent.find((e) => e.slug === sp.ep) ?? recent[0];
  const epLinks = tab === "episodes" && selected ? await getPlatformLinks(selected.title) : {};

  return (
    <Container className="py-10 sm:py-16">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Where to listen", url: `${SITE.url}/where` }])} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] items-start">
        {/* Side: show art + schedule */}
        <div className="order-2 lg:order-1 min-w-0 lg:sticky lg:top-24 text-center lg:text-left">
          <Image src="/brand/showart.jpeg" alt="[REDACTED] show art" width={500} height={500} priority className="w-full max-w-[16rem] lg:max-w-full mx-auto lg:mx-0 border border-line" />
          <p className="mt-4 text-sm text-paper/85">
            New episodes {SITE.schedule}. Free everywhere.
          </p>
          <Link href="/episodes" className="mt-2 inline-block text-sm text-yellow underline underline-offset-4">
            All episodes
          </Link>
          <div className="mt-6 border border-line bg-ink-2/70 p-4 text-left">
            <p className="eyebrow mb-1">Patreon supporters</p>
            <p className="text-xs text-paper/80">Your early, ad-free feed is a private RSS link. In Patreon, open the [REDACTED] page, go to Membership and then Podcast, and tap the app you use; it adds the feed for you.</p>
            <a href={LISTEN.patreon} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-yellow underline underline-offset-2">
              Open Patreon
            </a>
          </div>
        </div>

        <div className="order-1 lg:order-2 min-w-0 text-center lg:text-left">
          <p className="eyebrow">Where to listen</p>
          <h1 className="display text-5xl sm:text-6xl mt-1">Listen to [REDACTED] on any app</h1>

          <nav aria-label="Listen sections" className="mt-6 flex justify-center lg:justify-start gap-1 border-b border-line mb-6 overflow-x-auto [scrollbar-width:none]">
            {(["apps", "episodes"] as const).map((id) => (
              <Link key={id} href={id === "apps" ? "/where" : "/where?tab=episodes"} aria-current={tab === id ? "page" : undefined} className={`display text-2xl px-4 py-2 border-b-4 -mb-px whitespace-nowrap [text-wrap:nowrap] ${tab === id ? "border-yellow text-yellow" : "border-transparent hover:text-yellow"}`}>
                {id === "apps" ? "The show" : "One episode"}
              </Link>
            ))}
          </nav>

          {tab === "apps" ? (
            <>
              {/* Top tier: the three that matter */}
              <ul className="grid gap-2 sm:gap-3 grid-cols-3">
                {TOP.map((a) => (
                  <li key={a.name}>
                    <SmartLink href={a.href} scheme={a.scheme} className="group flex flex-col items-center gap-2 sm:gap-3 border border-line bg-ink-2/70 hover:border-yellow p-3 sm:p-5 text-center">
                      <span className="size-11 sm:size-14 grid place-items-center rounded-full bg-paper text-ink group-hover:bg-yellow">
                        <Mark a={a} size={24} />
                      </span>
                      <span className="display text-base sm:text-2xl leading-tight">{a.name}</span>
                    </SmartLink>
                  </li>
                ))}
              </ul>

              <h2 className="eyebrow mt-10 mb-3">Everywhere else</h2>
              <ul className="grid gap-2 sm:grid-cols-2 text-left">
                {APPS.map((a) => (
                  <li key={a.name}>
                    <SmartLink href={a.href} scheme={a.scheme} className="group flex items-center gap-3 border border-line bg-ink-2/70 hover:border-yellow p-3">
                      <span className="size-9 shrink-0 grid place-items-center rounded-full bg-paper text-ink group-hover:bg-yellow">
                        <Mark a={a} />
                      </span>
                      <span className="display text-xl flex-1">{a.name}</span>
                      <Arrow className="text-muted group-hover:text-yellow shrink-0" width={16} height={16} />
                    </SmartLink>
                  </li>
                ))}
                <li className="sm:col-span-2 flex flex-wrap items-center gap-3 border border-line bg-ink-2/70 p-3 min-w-0 overflow-hidden">
                  <span className="size-9 shrink-0 grid place-items-center rounded-full bg-paper text-ink">
                    <Mark a={{ name: "RSS", href: RSS, img: "/brand/apps/rss.svg" }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="display text-xl block">RSS feed</span>
                    <span className="text-xs text-muted block truncate">{RSS}</span>
                  </span>
                  <CopyButton text={RSS} label="Copy link" className="btn btn-yellow !min-h-10 !text-base !px-4" />
                  <a href={RSS} target="_blank" rel="noreferrer" className="text-xs text-muted underline underline-offset-2 hover:text-yellow">
                    Open
                  </a>
                </li>
              </ul>

              <p className="mt-6 text-paper/85 max-w-prose mx-auto lg:mx-0">
                Don&apos;t see your app? Search for <strong>REDACTED Hush Studios</strong> in it, or paste the RSS link above. You can also{" "}
                <Link href="/episodes" className="text-yellow underline underline-offset-4">
                  listen right here
                </Link>
                ; the site player keeps your place.
              </p>
            </>
          ) : (
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {/* On phones the links come first; the list is second */}
              {/* Episode picker */}
              <ol className="hidden md:block md:order-1 divide-y divide-line border-y border-line max-h-[32rem] overflow-y-auto">
                {recent.map((e) => {
                  const on = e.slug === selected?.slug;
                  return (
                    <li key={e.guid}>
                      <Link href={`/where?tab=episodes&ep=${e.slug}`} scroll={false} aria-current={on ? "true" : undefined} className={`flex items-center gap-3 px-3 py-2.5 ${on ? "bg-yellow text-ink" : "hover:bg-ink-2"}`}>
                        <span className="min-w-0 flex-1">
                          <span className="display text-lg block truncate">{e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title}</span>
                          <span className={`text-xs tabular block ${on ? "text-ink/70" : "text-muted"}`}>
                            {formatDate(e.date)}
                            {e.duration ? ` · ${formatDuration(e.duration)}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>

              {/* Links for the selected episode */}
              {selected && (
                <div className="order-1 md:order-2 md:sticky md:top-24 min-w-0">
                  <EpisodePicker className="md:hidden mb-5 text-left" value={selected.slug} options={recent.map((e) => ({ slug: e.slug, label: e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title }))} />
                  <div className="flex items-center gap-3 justify-center lg:justify-start text-left">
                    <span className="relative size-14 shrink-0 overflow-hidden bg-ink-3">
                      <Image src={selected.image || "/brand/showart.jpeg"} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <div className="min-w-0">
                      <p className="eyebrow text-yellow">Open this episode in</p>
                      <p className="display text-2xl">{selected.kind === "episode" ? `${selected.code}: ${selected.shortTitle}` : selected.title}</p>
                    </div>
                  </div>
                  <ul className="mt-4 grid gap-2 text-left">
                    {(
                      [
                        { name: "Apple Podcasts", href: epLinks.apple, img: "/brand/apps/applepodcasts.svg", scheme: epLinks.apple?.replace(/^https:/, "podcasts:") },
                        { name: "Spotify", href: epLinks.spotify, img: "/brand/apps/spotify.svg" },
                        { name: "Patreon (ad-free)", href: epLinks.patreon, icon: "patreon" as const },
                        { name: "Acast", href: selected.acastUrl, icon: "web" as const },
                      ] as (App & { href?: string })[]
                    )
                      .filter((a) => !!a.href)
                      .map((a) => (
                        <li key={a.name}>
                          <SmartLink href={a.href} scheme={a.scheme} className="group flex items-center gap-3 border border-line bg-ink-2/70 hover:border-yellow p-3">
                            <span className="size-9 shrink-0 grid place-items-center rounded-full bg-paper text-ink group-hover:bg-yellow">
                              <Mark a={a} />
                            </span>
                            <span className="display text-xl flex-1">{a.name}</span>
                            <Arrow className="text-muted group-hover:text-yellow shrink-0" width={16} height={16} />
                          </SmartLink>
                        </li>
                      ))}
                    <li className="flex items-center gap-3 border border-line bg-ink-2/70 p-3">
                      <PlayButton track={toTrack(selected)} size="sm" />
                      <span className="display text-xl flex-1">Play it here</span>
                      <CopyButton text={`${SITE.url}/episodes/${selected.slug}`} label="Copy page link" className="text-xs text-muted underline underline-offset-2 hover:text-yellow" />
                    </li>
                  </ul>
                  {!epLinks.spotify && <p className="mt-3 text-xs text-muted">Spotify episode links appear once the Spotify app credentials are set; until then use the show link on the other tab.</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
