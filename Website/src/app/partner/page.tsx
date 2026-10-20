import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EXTERNAL, SITE } from "@/lib/site";
import { factsFor, LOGLINE, PRESS_ZIP, seasonState } from "@/data/press";
import { getAudience, getDailyPlays, getRatings, getStats, seasonMarks } from "@/lib/partnerStats";
import { getEpisodes } from "@/lib/feed";
import { getDoc } from "@/lib/content";
import { PartnerForm } from "@/components/partner/PartnerForm";
import writers from "@/data/writers.json";
import { Container } from "@/components/ui";
import { Laurels } from "@/components/Laurels";
import { Bar, Counter } from "@/components/partner/Counters";
import { PlaysChart } from "@/components/partner/PlaysChart";
import { SectionNav } from "@/components/partner/SectionNav";
import { JsonLd, audienceJsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { awards, isWin } from "@/lib/awards";
import { assertVisible } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "Advertise on REDACTED: Media Kit & Sponsorship",
  description: "Media kit for REDACTED, the horror comedy audio drama on the Rusty Quill Network: 1.9M+ plays, daily listens by platform, listener demographics, festival awards, press kit downloads, and host-read sponsorship options.",
  alternates: { canonical: "/partner" },
};
export const revalidate = 3600;

// Static fallbacks (last manual snapshot) — used only if the automated feed is unavailable.
const PLATFORMS_FALLBACK: [string, number][] = [
  ["Spotify", 41.2],
  ["Apple Podcasts", 36.2],
  ["Pocket Casts", 6.1],
  ["Amazon Music", 1.2],
  ["Other", 15.3],
];
const REGIONS_FALLBACK: [string, string][] = [
  ["United States", "58.6%"],
  ["United Kingdom", "7.9%"],
  ["Canada", "7.0%"],
  ["Australia", "4.1%"],
  ["Germany", "2.8%"],
];
const DEMOS_FALLBACK: [string, string, string][] = [
  ["Core age range", "18 to 44", "Over 70% of listeners"],
  ["Peak bracket", "35 to 44", "25.6% of audience"],
  ["Male", "50.7%", "Spotify listener data"],
  ["Female", "38.8%", "Spotify listener data"],
  ["Non-binary", "2.6%", "Spotify listener data"],
];
const QUOTES = [
  { q: "REDACTED is the inheritor to all your favourite spooky procedurals. Fun and sinister in equal measure, with a central mystery that grabs you by the brain and won't let go.", who: "Jonathan Sims", role: "The Magnus Archives" },
  { q: "If you've wanted to take your monster of the week with you on the go, look no further!", who: "John Squires", role: "Bloody Disgusting" },
  { q: "REDACTED wastes no time building stakes, and laying the groundwork for a solid mystery.", who: "Elyse Willems", role: "Funhaus" },
  { q: "Whatever you are expecting, REDACTED blows those expectations out the water. With incredible performances by the cast supported by high grade sound design and intelligent scripting, REDACTED perfectly represents the genre that is horror comedy.", who: "Tatiana Gefter", role: "Soul Operator" },
];
// `when` is filled in from the season state so a card never promises a Friday episode that isn't coming.
const OPTIONS = [
  { t: "Pre-roll", tag: "REDACTED · All episodes", d: "30-second host-read spot at the top of every episode.", pts: ["Available on all public episodes", "Host-read, in your brand's voice"] },
  { t: "Post-roll", tag: "REDACTED · All episodes", d: "60-second host-read spot at the close of each episode.", pts: ["Available on all public episodes", "Longer format, more storytelling room", "High-retention audience"] },
];
const TEAM = [
  {
    n: "Johnathan Magno",
    r: "Co-creator · Head of Studio",
    b: "Johnathan “Athan” Magno is a content creator, producer, and creative director focused on scripted audio drama. His work centers on character-forward storytelling and high end sound design. Prior to production, he owned an escape room and spent five years in game design, shaping immersive experiences built around team-building and tension.",
    p: "The Grotto · Esc2You",
  },
  {
    n: "Jamie Petronis",
    r: "Co-creator · Head of Content",
    b: "Jamie is a New England based actor and writer with a lifelong love of horror. Before creating The Cellar Letters in 2020 and moving into podcasting, he worked toward a career in film and television: an experience that developed his character-driven approach to audio drama.",
    p: "The Cellar Letters",
  },
];

// The 15 guest writers shown on the original media kit, in its order (the home page uses the full list)
const PARTNER_WRITERS = ["Jeffrey Reddick", "KC Wayland", "Trevor Henderson", "Harlan Guthrie", "Nick Lives", "Matt Dymerski", "Dylan Griggs", "Crista Castro", "Pacific Obadiah", "Cam Collins", "Xalavier Nelson Jr.", "Airdorf", "Ashley McAnelly", "Chantal Ryan"]
  .map((n) => writers.find((w) => w.name === n))
  .filter((w): w is (typeof writers)[number] => !!w);

/** Section label + big Montserrat heading with the short yellow rule, as on the original media kit. */
function Title({ label, children, muted = false, className = "" }: { label: string; children: React.ReactNode; muted?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${muted ? "text-paper/50" : "text-yellow"}`}>{label}</p>
      <h2 className="mt-3 font-extrabold uppercase text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-tight text-balance">{children}</h2>
      <span className="block mt-4 h-0.5 w-8 bg-yellow" aria-hidden />
    </div>
  );
}

export default async function PartnerPage() {
  await assertVisible("/partner");
  const [s, plays, audience, ratings, settings, eps] = await Promise.all([getStats(), getDailyPlays(), getAudience(), getRatings(), getDoc("settings").catch(() => null), getEpisodes().catch(() => null)]);
  const state = seasonState(settings);
  const onBreak = settings?.seasonStatus === "break";
  const marks = eps ? seasonMarks(eps.episodes, onBreak) : undefined;
  const FACTS = factsFor(settings);
  const PLATFORMS = audience?.platforms ?? PLATFORMS_FALLBACK;
  const REGIONS = audience?.regions ?? REGIONS_FALLBACK;
  const DEMOS = audience?.demos ?? DEMOS_FALLBACK;

  return (
    <div className="[&_section]:scroll-mt-16">
      <JsonLd data={audienceJsonLd(s)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Partner", url: `${SITE.url}/partner` }])} />
      <SectionNav />

      {/* HERO: art beside a big headline, so neither side is left empty */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 left-1/2 -translate-x-1/4 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-60" style={{ background: "radial-gradient(closest-side, rgba(255,150,0,0.45), rgba(255,60,0,0.12) 60%, transparent)" }} />
        </div>
        <Container className="relative py-8 sm:py-12 lg:py-16 grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-14 items-center text-center lg:text-left">
          <Image src="/home/redacteded.avif" alt="REDACTED show art" width={300} height={300} priority className="mx-auto size-36 sm:size-56 lg:size-72 shadow-[0_20px_60px_rgba(0,0,0,0.6)]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow">Media kit · Sponsorship</p>
            <h1 className="mt-3 font-extrabold uppercase text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.02] tracking-tight text-balance">Advertise on REDACTED</h1>
            <span className="mt-4 block h-0.5 w-8 bg-yellow mx-auto lg:mx-0" aria-hidden />
            <p className="mt-4 text-sm sm:text-base tracking-[0.12em] uppercase">
              A procedural horror comedy · <a href={SITE.network.url} target="_blank" rel="noreferrer" className="font-bold hover:text-yellow">Rusty Quill Network</a>
            </p>
            <p className="mt-1 text-[15px] text-paper/70">{state}</p>
            <p className="hidden sm:block mt-4 mx-auto lg:mx-0 max-w-[52ch] text-[15px] font-light leading-relaxed text-paper/70">{LOGLINE}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <a href="#contact" className="btn btn-yellow">
                Partner with us
              </a>
              <a href="/partner/one-pager.pdf" className="btn btn-ghost">
                One-page media kit (PDF)
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* STATS: a slim yellow band; number and label sit side by side on desktop to keep it short */}
      <section id="stats" className="bg-yellow text-ink">
        <Container className="pt-1 pb-3 sm:pt-2">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {[
              ["Total plays", s.totalPlays],
              ["Daily average", s.dailyAverage],
              ["Hours consumed", s.hoursConsumed],
              ["Apple/Spotify followers", s.followers],
            ].map(([k, v], i) => (
              <div key={k as string} className={`flex flex-col lg:flex-row lg:items-center lg:gap-3 px-4 py-4 sm:px-6 sm:py-5 ${i % 2 === 1 ? "border-l border-ink/20" : ""} ${i > 0 ? "lg:border-l lg:border-ink/20" : ""} ${i > 1 ? "border-t border-ink/20 lg:border-t-0" : ""} ${i === 0 ? "lg:pl-0" : ""}`}>
                <dd className="font-bold text-3xl sm:text-4xl lg:text-[2.5rem] leading-none tabular">{typeof v === "number" ? <Counter value={v} /> : "n/a"}</dd>
                <dt className="mt-2 lg:mt-0 text-[10px] font-bold uppercase tracking-[0.14em] leading-tight text-ink/75 lg:max-w-[6.5rem]">{k as string}</dt>
              </div>
            ))}
          </dl>
          {s.lastUpdated && <p className="px-4 sm:px-6 lg:pl-0 text-[10px] font-semibold tracking-[0.12em] uppercase text-ink/55">As of {s.lastUpdated}</p>}
        </Container>
      </section>

      {/* RECOGNITION: wins as a trophy case, everything else a quieter tier beneath. Nothing is collapsed. */}
      <section id="awards-strip" className="border-b border-line">
        <Container className="py-12 sm:py-16">
          <Title label="Recognition">Winners</Title>
          <Laurels only="wins" className="mt-10" />

          <div className="mt-12 flex items-center gap-4" aria-hidden>
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/60">Nominations and selections · {awards.length - awards.filter(isWin).length}</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <Laurels only="rest" className="mt-8" />
        </Container>
      </section>

      {/* TRAILER + CHART */}
      <section className="border-b border-line">
        <Container className="py-12 sm:py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="aspect-video w-full bg-ink-2 border border-line">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${EXTERNAL.trailerYouTubeId}?rel=0&modestbranding=1&color=white`}
              title="REDACTED teaser trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              className="w-full h-full"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow mb-4">Daily plays by platform</p>
            {plays ? <PlaysChart data={plays} marks={marks} /> : <p className="text-sm text-muted">Chart unavailable right now.</p>}
          </div>
        </Container>
      </section>

      {/* AUDIENCE */}
      <section id="audience" className="bg-[#070707]">
        <Container className="py-14 sm:py-20">
          <Title label="Audience">Who’s listening</Title>

          <div className="mt-12 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50 mb-6">Platform breakdown</h3>
              <ul className="grid gap-5">
                {PLATFORMS.map(([name, pct]) => (
                  <li key={name}>
                    <div className="flex justify-between items-baseline mb-2 text-sm">
                      <span className="text-paper/85">{name}</span>
                      <span className="font-bold tabular">{pct}%</span>
                    </div>
                    <Bar pct={pct} />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50 mb-4">Top regions</h3>
              <ul>
                {REGIONS.map(([c, p]) => (
                  <li key={c} className="flex justify-between items-center border-b border-white/10 py-3 text-sm">
                    <span className="text-paper/85">{c}</span>
                    <span className="font-bold text-yellow tabular">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <h3 className="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50 mb-4">Demographics</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {DEMOS.map(([k, v, n]) => (
              <div key={k} className="bg-white/[0.04] border border-white/[0.06] p-5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/50">{k}</dt>
                <dd className="mt-2 font-bold text-2xl sm:text-3xl tabular">{v}</dd>
                <dd className="mt-1 text-[11px] text-paper/50">{n}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 border-l-2 border-yellow bg-yellow/[0.04] px-6 py-5 text-[15px] font-light text-paper/75">
            Fans of <strong className="font-semibold text-paper">X-Files, Buffy the Vampire Slayer, Brooklyn Nine-Nine,</strong> and <strong className="font-semibold text-paper">Psych</strong>: listeners who grew up on procedural genre television and now consume it on demand.
          </p>
        </Container>
      </section>

      {/* THE SHOW */}
      <section id="redacted" className="bg-[#0c0c0c] border-y border-line">
        <Container className="py-14 sm:py-20">
          <Title label="The show">What is REDACTED?</Title>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-[17px] font-light leading-relaxed text-paper/75 max-w-[62ch]">
                REDACTED is a new procedural horror comedy from Athan (The Grotto) and Jamie Petronis (The Cellar Letters) on the Rusty Quill Network (The Magnus Archives). Following the death of his twin, failing actor Jacob Kane assumes his late-brother&apos;s life in hopes of a fresh start. Instead of finding stability, Jacob finds himself working within The REDACTED Unit, a covert agency tasked with containing impossible creatures and phenomena. As he becomes entangled with paranormal forces and secret agendas, Jacob begins to discover a sense of belonging in a place he never expected.
              </p>

              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">Sounds like</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["The X-Files"],
                    ["Buffy the Vampire Slayer"],
                    ["Brooklyn Nine-Nine"],
                    ["Psych"],
                    ["The Magnus Archives", "/like/the-magnus-archives"],
                    ["SCP Archives"],
                  ] as [string, string?][]
                ).map(([t, href]) => (
                  <li key={t}>
                    {href ? (
                      <Link href={href} className="block border border-yellow/35 text-yellow px-4 py-1.5 text-[12.5px] font-medium tracking-wide hover:bg-yellow hover:text-ink">
                        {t}
                      </Link>
                    ) : (
                      <span className="block border border-yellow/35 text-yellow px-4 py-1.5 text-[12.5px] font-medium tracking-wide">{t}</span>
                    )}
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">Show details</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
                {[
                  ["Format", "Monster-of-the-week · serialized · multi-season"],
                  ["Schedule", state],
                  ["Avg length", "~30 minutes"],
                  ["Network", "Rusty Quill"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow">{k}</dt>
                    <dd className="mt-1.5 text-paper/85">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid gap-3 content-start">
              <div className="bg-white/[0.03] border border-white/[0.06] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow">What’s an audio drama?</p>
                <p className="mt-3 text-[15px] font-light leading-relaxed text-paper/75">
                  <strong className="font-bold text-paper">Think of it like a TV show for your ears.</strong> Fictional podcasts are immersive, fully produced stories told through voice acting, music, and detailed sound design. No visuals, just sound. It&apos;s storytelling in its most intimate form. Because of this, the connection with our audience hits differently. It&apos;s like waiting for your favorite show to air when you were younger: new episodes drop on a routine, you get hooked on the plot and the beats, emotionally connect with the characters, and you have something fresh to share and discuss with your friends.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                {[
                  ["400+", "Kickstarter backers"],
                  ["313%", "Funded"],
                  [s.discordMembers, "Discord members"],
                  [s.avgViewers, "Avg Twitch viewers"],
                ].map(([v, k]) => (
                  <div key={k as string} className="bg-white/[0.03] border border-white/[0.06] p-5">
                    <dd className="font-bold text-3xl tabular text-yellow">{typeof v === "number" ? <Counter value={v} /> : (v as string) || "n/a"}</dd>
                    <dt className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/50">{k as string}</dt>
                  </div>
                ))}
                <a href="#contact" className="col-span-2 bg-yellow text-ink font-bold text-sm tracking-[0.14em] uppercase p-4 text-center hover:bg-paper transition-colors">
                  ✦ Partner
                </a>
              </dl>
            </div>
          </div>
        </Container>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="bg-red text-white">
        <Container className="py-14 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Audience reception</p>
          <h2 className="display mt-3 text-5xl sm:text-6xl lg:text-7xl">What they’re saying</h2>
          <span className="block mt-4 h-0.5 w-8 bg-yellow" aria-hidden />

          <blockquote className="mt-12 border-l-4 border-yellow pl-8">
            <p className="font-bold text-2xl sm:text-3xl lg:text-[2rem] leading-snug tracking-tight text-balance">
              “My calendar should have never been Gregorian. It always should have been set to <span className="text-yellow">REDACTED</span>. I love Fridays 500% more now.”
            </p>
            <footer className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Westoons · Listener</footer>
          </blockquote>

          <ul className="mt-12 grid md:grid-cols-2 border-t border-white/15">
            {QUOTES.map((q, i) => (
              <li key={q.who} className={`py-8 md:px-8 ${i % 2 === 0 ? "md:pl-0 md:border-r border-white/15" : "md:pr-0"} ${i < QUOTES.length - 2 ? "border-b border-white/15" : ""}`}>
                <blockquote>
                  <p className="text-[15px] font-light leading-relaxed text-white/90">“{q.q}”</p>
                  <footer className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow">{q.who}</p>
                    <p className="mt-1 text-[11px] text-white/55">{q.role}</p>
                  </footer>
                </blockquote>
              </li>
            ))}
          </ul>

          <p className="mt-10 text-center">
            <span className="block text-yellow text-2xl tracking-[0.2em]" aria-hidden>
              ★★★★★
            </span>
            <span className="block mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
              {ratings
                ? [
                    ratings.spotify && `${ratings.spotify.average.toFixed(1)} on Spotify${ratings.spotify.count ? ` (${ratings.spotify.count.toLocaleString("en-US")} ratings)` : ""}`,
                    ratings.apple && `${ratings.apple.average.toFixed(1)} on Apple Podcasts${ratings.apple.count ? ` (${ratings.apple.count.toLocaleString("en-US")} ratings)` : ""}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "150+ five-star Spotify reviews in the first 30 days"}
            </span>
          </p>
        </Container>
      </section>

      {/* GUEST WRITERS */}
      <section id="guest-writers" className="border-b border-line">
        <Container className="py-14 sm:py-20">
          <Title label="Special episodes">Guest writers</Title>
          <p className="mt-6 max-w-[600px] text-[15px] font-light leading-relaxed text-paper/55">
            In addition to core episodes, each season of REDACTED features multiple Guest Directors. These guests are prominent in the film, gaming, and audio drama space, and will feature on an episode to write, design, and direct the aberration that Jacob and team faces.
          </p>
          <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-white/10">
            {PARTNER_WRITERS.map((w) => (
              <li key={w.name} className="border-b border-r border-white/10 px-5 py-5">
                <p className="font-semibold text-[15px]">{w.name}</p>
                <p className="mt-1 text-xs text-paper/50">{w.credit}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* PARTNER OPTIONS */}
      <section id="partner-options" className="bg-[#1a1a1a]">
        <Container className="py-14 sm:py-20">
          <Title label="Sponsorship">Partner options</Title>
          <p className="mt-6 max-w-[560px] text-[15px] font-light leading-relaxed text-paper/55">All sponsorships are host-read and produced in-house. Reach out to discuss rates, scheduling, and fit.</p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ...OPTIONS.map((o) => ({ ...o, pts: [...o.pts, onBreak ? "Next season: date TBD, book ahead" : "New episode every Friday"] })),
              {
                t: "Discord",
                tag: `Community${typeof s.discordMembers === "number" ? ` · ${s.discordMembers.toLocaleString("en-US")} members` : ""}`,
                d: "A dedicated announcement in the REDACTED Discord, in front of the show's most engaged fans.",
                pts: ["Reach out for scheduling", "Pairs with a pre-roll or post-roll"],
              },
            ].map((o) => (
              <div key={o.t} className="border border-white/10 bg-ink/40 p-7">
                <h3 className="font-extrabold uppercase text-2xl tracking-tight">{o.t}</h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow">{o.tag}</p>
                <p className="mt-5 text-sm text-paper/85">{o.d}</p>
                <ul className="mt-6 border-t border-white/10 pt-5 grid gap-2 text-xs text-paper/60">
                  {o.pts.map((p) => (
                    <li key={p} className="flex gap-2 items-center">
                      <span className="inline-block h-px w-3 bg-yellow" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 border border-yellow/50 bg-yellow/[0.03] p-7 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <h3 className="font-extrabold uppercase text-2xl tracking-tight text-yellow">In-universe integration</h3>
              <p className="mt-2 text-sm text-paper/75 max-w-[60ch]">Depending on brand fit, we&apos;re open to weaving sponsor messaging directly into the REDACTED world: an in-universe ad placement.</p>
            </div>
            <a href="#contact" className="btn btn-yellow shrink-0">
              Let&apos;s talk
            </a>
          </div>
        </Container>
      </section>

      {/* TEAM */}
      <section id="who" className="bg-red text-white">
        <Container className="py-14 sm:py-20">
          <Title label="The team" muted>
            Who you’re working with
          </Title>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {TEAM.map((m) => (
              <div key={m.n} className="bg-[#7a1320]/90 p-7">
                <h3 className="font-extrabold uppercase text-xl sm:text-2xl tracking-tight">{m.n}</h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">{m.r}</p>
                <p className="mt-5 text-sm leading-relaxed text-white/90">{m.b}</p>
                <p className="mt-5 text-xs text-white/55">Previously: {m.p}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* PRESS KIT: plain text for journalists, roundups, and crawlers (laurels are images and can't be read) */}
      <section id="press-kit" className="border-b border-line">
        <Container className="py-14 sm:py-20">
          <Title label="Press kit">Facts and downloads</Title>
          <p className="mt-6 max-w-[600px] text-[15px] font-light leading-relaxed text-paper/55">Copy anything here. For interviews, review copies, or anything not listed, email {SITE.email}.</p>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">Logline</h3>
              <p className="mt-2 text-[15px] text-paper/85">{LOGLINE}</p>

              <h3 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">Fact sheet</h3>
              <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                {FACTS.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow pt-1">{k}</dt>
                    <dd className="text-paper/85">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid gap-8 content-start">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">Downloads</h3>
                <ul className="mt-3 grid gap-2 text-sm">
                  {[
                    ["Media kit one-pager (PDF)", "/partner/one-pager.pdf"],
                    ["Everything (logos, art, laurels, zip)", `/press/${PRESS_ZIP}`],
                    ["Show art (JPEG)", "/press/REDACTED-show-art.jpg"],
                    ["Wordmark, white (PNG)", "/press/REDACTED-wordmark-white.png"],
                    ["Mark, yellow (SVG)", "/press/REDACTED-mark-yellow.svg"],
                    ["Laurels strip (PNG)", "/press/REDACTED-laurels-strip.png"],
                  ].map(([n, h]) => (
                    <li key={h}>
                      <a href={h} download className="flex items-center justify-between gap-4 border border-white/10 px-4 py-3 hover:border-yellow hover:text-yellow">
                        <span>{n}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Download</span>
                      </a>
                    </li>
                  ))}
                  <li className="text-xs text-paper/50 mt-1">
                    Fonts, colors, and usage notes are on the{" "}
                    <a href="/assets" className="underline hover:text-yellow">
                      brand assets page
                    </a>
                    .
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/50">Awards and festivals</h3>
                {/* Rows stack on a phone and sit side by side from sm. The result used to be shrink-0, so a
                    long one ("Semi-Finalist, Best New Media or Episodic Series") squeezed the festival name
                    to a sliver and ran off the edge, stretching the whole page wider than the screen. */}
                <ul className="mt-3 grid gap-1.5 text-sm">
                  {awards.map((a) => (
                    <li key={a.file} className="flex flex-col gap-0.5 border-b border-white/10 py-1.5 sm:flex-row sm:justify-between sm:gap-4">
                      <span className="min-w-0 text-paper/85">
                        {a.url ? (
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline decoration-white/25 underline-offset-4 hover:text-yellow hover:decoration-yellow">
                            {a.festival}
                          </a>
                        ) : (
                          a.festival
                        )}
                      </span>
                      <span className="min-w-0 text-paper/55 sm:max-w-[55%] sm:text-right">
                        {[a.result, a.year].filter(Boolean).join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CONTACT */}
      <section id="contact" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[26rem] h-[18rem] blur-3xl opacity-70" style={{ background: "radial-gradient(closest-side, rgba(255,140,0,0.5), rgba(255,60,0,0.15) 60%, transparent)" }} />
        </div>
        <Container className="relative pt-28 pb-20 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow">Get in touch</p>
          <h2 className="display mt-3 text-5xl sm:text-6xl lg:text-7xl">Ready to partner?</h2>
          <PartnerForm email={SITE.email} />
        </Container>
      </section>
    </div>
  );
}
