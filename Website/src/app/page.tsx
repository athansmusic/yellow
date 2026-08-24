import Image from "next/image";
import Link from "next/link";
import { getEpisodes, getSevenPlanes, formatDate, formatDuration, toTrack, type Episode } from "@/lib/feed";
import { getProducts } from "@/lib/catalog";
import { getDoc } from "@/lib/content";
import { ContinueListening } from "@/components/ContinueListening";
import { EXTERNAL, LISTEN, LISTEN_BUTTONS, SITE } from "@/lib/site";
import writers from "@/data/writers.json";
import press from "@/data/press.json";
import cast from "@/data/cast.json";
import supporters from "@/data/supporters.json";
import { ThankYou } from "@/components/ThankYou";
import { FanArtRail } from "@/components/FanArtRail";
import { Container, Heading, PlatformButtons, Section } from "@/components/ui";
import { AwardsStrip } from "@/components/AwardsStrip";
import { TrailerButton } from "@/components/TrailerButton";
import { HeroLoop } from "@/components/HeroLoop";
import { PlayButton } from "@/components/AudioPlayer";
import { Countdown } from "@/components/Countdown";
import { ReturnsCountdown } from "@/components/ReturnsCountdown";
import { Reveal } from "@/components/Reveal";
import { EarlyAccess } from "@/components/LiveNow";
import { ProductCard } from "@/components/ProductCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Arrow, Discord, Patreon } from "@/components/Icons";

export const revalidate = 600;
export const metadata = { alternates: { canonical: "/" } };


export default async function Home() {
  const [{ episodes, postmortems }, products, t7p, featured, settings] = await Promise.all([
    getEpisodes().catch(() => ({ episodes: [] as Episode[], postmortems: [] as Episode[] })),
    getProducts().catch(() => []),
    getSevenPlanes().catch(() => ({ episodes: [] })),
    getDoc("featured").catch(() => ({ slugs: [] as string[] })),
    getDoc("settings").catch(() => null),
  ]);
  const fanart = await getDoc("fanart").catch(() => []);
  const t7pCount = t7p.episodes.length;
  const latest = episodes[0];
  const first = [...episodes].sort((a, b) => (a.season ?? 1) - (b.season ?? 1) || (a.number ?? 0) - (b.number ?? 0))[0];
  // Admin-picked products first; fall back to the first four in the catalog
  const picked = featured.slugs.map((s) => products.find((p) => p.slug === s)).filter((p): p is (typeof products)[number] => !!p);
  const merch = picked.length ? picked : products.slice(0, 4);
  const latestPM = postmortems[0];
  const onBreak = settings?.seasonStatus === "break";
  const returnsAt = onBreak && settings?.nextSeasonDate ? settings.nextSeasonDate : null;
  const nextLabel = settings?.nextSeasonLabel || "Season 2";
  const CORE = ["Jamie Petronis", "Athan", "Ishani Kanetkar", "Kirsten Ria", "Devin Steffens", "Joe Cliff Thompson", "Ash Millman"];
  const core = CORE.map((n) => cast.find((c) => c.actor === n)).filter(Boolean) as typeof cast;

  return (
    <>
      {/* ── HERO ── art owns the left, logo + CTAs sit in the dark right third */}
      <section className="relative overflow-hidden border-b border-line min-h-[70svh] lg:min-h-[88svh] flex items-center bg-ink">
        <HeroLoop />
        <div className="absolute inset-0 bg-[url('/home/static.gif')] bg-[length:280px] opacity-[0.07] mix-blend-screen" aria-hidden />
        {/* scrims: keep the art clean on the left, darken under the copy on the right, fade into the page at the bottom */}
        <div className="absolute inset-0 hidden lg:block bg-[linear-gradient(90deg,transparent_30%,rgba(9,9,9,.7)_52%,rgba(9,9,9,.92)_70%,rgba(9,9,9,.96)_100%)]" aria-hidden />
        <div className="absolute inset-0 bg-ink/55 lg:hidden" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink" aria-hidden />
        <Container className="relative py-10 sm:py-20 lg:py-28 w-full">
          <div className="lg:ml-auto lg:w-[52%] xl:w-[48%] text-center lg:text-left [text-shadow:0_2px_18px_rgba(0,0,0,.85)]">
            <h1 className="sr-only">[REDACTED]: a horror comedy audio drama</h1>
            <Image src="/brand/logo-hero.avif" alt="" width={900} height={225} priority className="w-[min(92vw,36rem)] h-auto mx-auto lg:mx-0 drop-shadow-[0_0_40px_rgba(0,0,0,.85)]" />
            <p className="mt-4 text-sm sm:text-base font-semibold uppercase tracking-[0.22em] text-paper">A Procedural Horror Comedy</p>
            {settings && settings.seasonStatus !== "airing" && (
              <p className="mt-3 hidden sm:inline-flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="border border-yellow/70 text-yellow px-2 py-1">
                  {settings.seasonLabel}
                  {settings.seasonStatus === "finale" ? " finale this week" : settings.seasonStatus === "break" ? " complete" : " complete"}
                </span>
                {settings.seasonNote && <span className="text-paper/70 normal-case tracking-normal font-medium">{settings.seasonNote}</span>}
              </p>
            )}
            {onBreak && returnsAt ? (
              <div className="mt-5 flex justify-center lg:justify-start">
                <ReturnsCountdown to={returnsAt} label={nextLabel} />
              </div>
            ) : (
              <p className="display mt-4 text-2xl sm:text-4xl">
                {settings?.seasonStatus === "break" || settings?.seasonStatus === "finished" ? <span className="text-yellow">{settings.seasonStatus === "finished" ? "The complete series" : `${nextLabel} is coming`}</span> : <>New episodes <span className="text-yellow">{SITE.schedule}</span></>}
              </p>
            )}
            {(!settings || settings.seasonStatus === "airing" || settings.seasonStatus === "finale") && (
              <p className="mt-2 text-xs sm:text-sm font-medium uppercase tracking-[0.18em] text-paper/70">
                <span className="sm:hidden">
                  {settings?.seasonStatus === "finale" ? "Finale " : ""}
                  <Countdown compact prefix="in" />
                </span>
                <span className="hidden sm:inline">
                  <Countdown />
                </span>
              </p>
            )}
            <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center lg:justify-start">
              {first && <PlayButton track={toTrack(first)} plain label="Start from Episode 1" className="btn btn-yellow !text-2xl whitespace-nowrap" />}
              <TrailerButton id={EXTERNAL.trailerYouTubeId} className="btn btn-ghost !text-2xl whitespace-nowrap" />
            </div>
            <div className="mt-7 flex items-center justify-center lg:justify-start gap-5 flex-wrap">
              <PlatformButtons links={LISTEN_BUTTONS} size="sm" />
              <Link href="/where" className="text-sm text-paper/90 hover:text-yellow underline underline-offset-4">
                More apps
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ── AWARDS + ROTATING PRESS ── */}
      <AwardsStrip quotes={press} />

      {/* ── THIS WEEK ── the live row */}
      <div className="relative z-10 border-y border-line bg-ink">
        <Container className="py-5 grid gap-4 md:grid-cols-3 md:divide-x divide-line">
          {latest && (
            <ContinueListening
              fallback={
                <div className="md:pr-6 flex items-center gap-3">
                  <PlayButton track={toTrack(latest)} size="sm" />
                  <div className="min-w-0">
                    <p className="eyebrow text-yellow whitespace-nowrap">Latest episode · {formatDate(latest.date)}</p>
                    <Link href={`/episodes/${latest.slug}`} className="display text-xl leading-none block truncate hover:text-yellow">
                      {latest.code}: {latest.shortTitle}
                    </Link>
                  </div>
                </div>
              }
            />
          )}
          {latestPM && (
            <div className="md:px-6 flex items-center gap-3">
              <PlayButton track={toTrack(latestPM)} size="sm" />
              <div className="min-w-0">
                <p className="eyebrow whitespace-nowrap">Postmortem · {formatDate(latestPM.date)}</p>
                <Link href={`/episodes/${latestPM.slug}`} className="display text-xl leading-none block truncate hover:text-yellow">
                  {latestPM.shortTitle}
                </Link>
              </div>
            </div>
          )}
          <div className="md:pl-6 flex items-center">
            <div>
              {onBreak ? (
                <>
                  <p className="eyebrow">{nextLabel}</p>
                  <p className="display text-xl leading-none whitespace-nowrap">
                    {returnsAt ? (
                      <>
                        Returns in <span className="text-yellow"><ReturnsCountdown to={returnsAt} label={nextLabel} compact /></span>
                      </>
                    ) : (
                      "Between seasons"
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="eyebrow">Next episode</p>
                  <p className="display text-xl leading-none whitespace-nowrap">
                    {SITE.schedule} · <span className="text-yellow font-sans text-sm font-semibold tracking-wide normal-case"><Countdown compact prefix="in" /></span>
                  </p>
                </>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* ── MEET TRU ── the core six */}
      <section className="relative border-b border-line bg-ink-2/80 overflow-hidden">
        <Container className="relative py-12 sm:py-16">
          <Reveal>
            <p className="eyebrow">Meet the cast</p>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <h2 className="display text-[13vw] lg:text-[8.5rem] leading-[0.85] -ml-[0.04em]">
                The Redacted Unit
              </h2>
              <Link href="/cast" className="btn btn-ghost mb-2">
                View the full cast <Arrow />
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" aria-label="Core cast">
              {core.map((c, i) => (
                <li key={c.actor}>
                  <Link href="/cast" className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-ink">
                      <Image src={c.image} alt={`${c.actor} as ${c.character}`} fill sizes="(min-width:1024px) 16vw, (min-width:640px) 33vw, 50vw" priority={i < 3} className="object-cover object-top group-hover:scale-[1.04] transition-transform duration-500" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/60 to-transparent p-3 pt-10">
                        <p className="display text-2xl leading-none group-hover:text-yellow">{c.character}</p>
                        <p className="text-xs text-paper/80 mt-1">{c.actor}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/cast" className="group flex h-full items-center justify-center border border-line bg-ink hover:border-yellow aspect-[4/5]">
                  <span className="text-center px-4">
                    <span className="display text-3xl block group-hover:text-yellow">Everyone</span>
                    <span className="text-xs text-muted mt-1 block">{cast.length} cast &amp; crew</span>
                  </span>
                </Link>
              </li>
            </ul>
          </Reveal>
        </Container>
      </section>

      {/* ── LATEST EPISODE ── */}
      {latest && (
        <Section>
          <Reveal><div className="grid gap-8 md:grid-cols-[minmax(0,18rem)_1fr] items-center">
            <Link href={`/episodes/${latest.slug}`} aria-label={`${latest.code}: ${latest.shortTitle}`} className="relative aspect-square block border border-line overflow-hidden bg-ink max-w-xs w-full mx-auto">
              <Image src={latest.image || "/brand/showart.jpeg"} alt="" fill sizes="(min-width:768px) 18rem, 20rem" className="object-cover" />
            </Link>
            <div>
              <p className="eyebrow text-yellow mb-2">Latest episode · {formatDate(latest.date)}</p>
              <h2 className="display text-4xl sm:text-6xl">
                <Link href={`/episodes/${latest.slug}`} className="hover:text-yellow">
                  {latest.code}: {latest.shortTitle}
                </Link>
              </h2>
              {latest.summary && <p className="mt-4 text-lg text-paper/85 max-w-prose">{latest.summary}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-5">
                <PlayButton track={toTrack(latest)} size="lg" />
                <Link href={`/episodes/${latest.slug}#warnings`} className="text-sm underline underline-offset-4 text-muted hover:text-yellow">
                  Content warnings
                </Link>
                <span className="text-sm text-muted tabular">{formatDuration(latest.duration)}</span>
              </div>
            </div>
          </div></Reveal>
        </Section>
      )}

      {/* ── CATCH IT A DAY EARLY ── Thursday live on Twitch */}
      <EarlyAccess onBreak={onBreak} />

      {/* ── WHAT IS REDACTED ── text beside the skinwalker art */}
      <Section className="bg-ink-2/80 border-y border-line">
        <Reveal><div className="grid gap-10 lg:grid-cols-2 items-center">
          <div className="prose-site">
            <Heading eyebrow="The show">What is [REDACTED]?</Heading>
            <p className="mt-6">
              REDACTED is a horror comedy audio drama from Athan (<em>The Grotto</em>) and Jamie Petronis (<em>The Cellar Letters</em>), on the Rusty Quill network.
            </p>
            <p>
              The show follows Jacob (Jamie Petronis), a struggling actor who, desperate for a fresh start, assumes the identity of his deceased twin, Jordan. Expecting a simple accounting job, he instead finds himself accidentally in an underfunded secret government agency called THE REDACTED UNIT, tasked with discreetly handling bizarre and often dangerous paranormal cases.
            </p>
            <p>
              As Jacob settles into his role, he begins to unravel the unsettling truths around his brother’s death. What begins as an act of reinvention slowly becomes a desperate descent into a treacherous web of paranormal forces, secret agendas, and moral compromise.
            </p>
            <p>This multi-season, monster-of-the-week series follows Jacob as he fights to keep his cover while facing terrifying threats known as “Aberrations.”</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/episodes" className="btn btn-yellow">
                Episodes
              </Link>
              <Link href="/about" className="btn btn-ghost">
                More about the show
              </Link>
            </div>
          </div>
          <Image src="/home/skinwalker.avif" alt="" width={800} height={800} sizes="(min-width:1024px) 50vw, 100vw" className="w-full h-auto" />
        </div></Reveal>
      </Section>

      {/* ── GUEST WRITERS ── even list, no hierarchy */}
      <Section>
        <Reveal><div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr] items-start">
          <div>
            <Heading eyebrow="Featuring">Guest writers</Heading>
            <p className="mt-4 text-paper/85">
              In addition to core episodes, each season of [REDACTED] features multiple guest writers, prominent in the film, gaming, and audio drama space, who write, design, and direct the aberration that Jacob and the team face.
            </p>
          </div>
          <ul className="grid gap-px bg-line border border-line sm:grid-cols-2 lg:grid-cols-4">
            {writers.map((w) => (
              <li key={w.name} className="bg-ink p-4">
                <p className="display text-2xl leading-none">{w.name}</p>
                <p className="text-xs text-yellow mt-1">{w.credit}</p>
              </li>
            ))}
          </ul>
        </div></Reveal>
      </Section>

      {/* ── PATREON / COMMUNITY ── */}
      <section className="relative overflow-hidden bg-red text-white border-y border-line">
        <div className="absolute inset-0 bg-[url('/home/static.gif')] bg-[length:320px] opacity-[0.08] mix-blend-screen" aria-hidden />
        <Container className="relative py-14 sm:py-20 grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
          <div>
            <p className="eyebrow !text-white/70">Join the unit</p>
            <h2 className="display text-4xl sm:text-6xl mt-1">Early. Ad-free.</h2>
            <p className="mt-4 max-w-prose text-white/90">From $2 a month. 400+ people backed this show into existence. This is how it keeps existing.</p>
            <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
              {["Early + ad-free episodes", "Bonus commentaries & debriefs", "Audience-directed decisions", "Exclusive music", "Private Discord", "Name on the wall", "Live Q&As", "Merch discounts"].map((b) => (
                <li key={b} className="border border-white/40 px-2.5 py-1">
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-3">
            <a href={LISTEN.patreon} target="_blank" rel="noreferrer" className="btn bg-white text-ink hover:bg-yellow">
              <Patreon /> Support on Patreon
            </a>
            <a href="/discord" target="_blank" rel="noreferrer" className="btn border-2 border-white text-white hover:bg-white hover:text-ink">
              <Discord /> Join the Discord
            </a>
            <ThankYou names={[...supporters.associateProducers, ...supporters.backers]} className="w-full" />
          </div>
        </Container>
      </section>

      {/* ── FAN ART ── approved Tumblr pieces, pushed by the stream control server */}
      {!(settings?.hiddenPages ?? []).includes("/fan-art") && <FanArtRail items={fanart} />}

      {/* ── MERCH ── */}
      {merch.length > 0 && (
        <Section>
          <div className="flex items-end justify-between gap-4">
            <Heading eyebrow="Printed to order · free US shipping">Store</Heading>
            <Link href="/store" className="text-sm text-yellow underline underline-offset-4 whitespace-nowrap">
              Shop everything
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            {merch.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
        </Section>
      )}

      {/* ── SPIN-OFFS ── */}
      <Section className="bg-ink-2/80 border-y border-line">
        <Reveal>
          <Heading eyebrow="More from REDACTED">Spin-offs</Heading>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <SpinOff href="/episodes?show=postmortem" img="/home/postmortem.avif" title="[REDACTED] Postmortem" text="Postmortem is an in-universe spin-off series, detailing the aberrations featured in each episode as the team debriefs their findings to The Curtain. Starring Lyssa Jay, Derek Moreland, Natalie Light, and Athan." cta={`${postmortems.length} episodes`} />
            <SpinOff href="/episodes?show=t7p" img="/spinoffs/t7p-art.jpeg" title="The Seven Planes" text="A collection of analog horror tapes chronicling the history of a strange world filled with even stranger inhabitants. Created by Landon Whisnant." cta={`${t7pCount} episodes`} />
          </div>
        </Reveal>
      </Section>

      {/* ── NEWSLETTER ── */}
      <Section id="alerts">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <Heading eyebrow="Episode alerts">Know when it drops</Heading>
            <p className="mt-4 text-paper/85 max-w-prose">An email whenever an episode drops, plus the occasional update. Sign up and get 10% off store orders of $25 or more. Unsubscribe any time.</p>
          </div>
          <NewsletterForm source="website-home" />
        </div>
      </Section>
    </>
  );
}

function SpinOff({ href, img, title, text, cta }: { href: string; img: string; title: string; text: string; cta: string }) {
  return (
    <Link href={href} className="group grid sm:grid-cols-[minmax(0,14rem)_1fr] bg-ink border border-line hover:border-yellow transition-colors">
      <div className="relative aspect-square overflow-hidden">
        <Image src={img} alt="" fill sizes="(min-width:640px) 14rem, 100vw" className="object-cover group-hover:scale-[1.03] transition-transform" />
      </div>
      <div className="p-5 sm:p-6 flex flex-col">
        <h3 className="display text-3xl group-hover:text-yellow">{title}</h3>
        <p className="mt-2 text-sm text-muted">{text}</p>
        <p className="mt-auto pt-4 text-yellow text-sm font-semibold inline-flex items-center gap-2">
          {cta} <Arrow width={16} height={16} />
        </p>
      </div>
    </Link>
  );
}
