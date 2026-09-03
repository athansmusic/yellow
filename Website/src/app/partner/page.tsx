import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EXTERNAL, SITE } from "@/lib/site";
import { FACTS, LOGLINE, PRESS_ZIP } from "@/data/press";
import { getAudience, getDailyPlays, getStats } from "@/lib/partnerStats";
import writers from "@/data/writers.json";
import { Container } from "@/components/ui";
import { Laurels } from "@/components/Laurels";
import { Bar, Counter } from "@/components/partner/Counters";
import { PlaysChart } from "@/components/partner/PlaysChart";
import { SectionNav } from "@/components/partner/SectionNav";
import { JsonLd, audienceJsonLd, breadcrumbJsonLd } from "@/lib/schema";
import awards from "@/data/awards.json";
import { assertVisible } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "Advertise on REDACTED: Media Kit & Sponsorship",
  description: "Media kit for REDACTED, the horror comedy audio drama on the Rusty Quill Network: 1.4M+ plays, daily listens by platform, listener demographics, festival awards, press kit downloads, and host-read sponsorship options.",
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
const OPTIONS = [
  { t: "Pre-roll", d: "30-second host-read spot at the top of every episode.", pts: ["Available on all public episodes", "Host-read, in your brand's voice", "New episode every Friday"] },
  { t: "Post-roll", d: "60-second host-read spot at the close of each episode.", pts: ["Available on all public episodes", "Longer format, more storytelling room", "High-retention audience"] },
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

const mailto = `mailto:${SITE.email}?subject=Partnership`;

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
  const [s, plays, audience] = await Promise.all([getStats(), getDailyPlays(), getAudience()]);
  const PLATFORMS = audience?.platforms ?? PLATFORMS_FALLBACK;
  const REGIONS = audience?.regions ?? REGIONS_FALLBACK;
  const DEMOS = audience?.demos ?? DEMOS_FALLBACK;

  return (
    <div className="[&_section]:scroll-mt-16">
      <JsonLd data={audienceJsonLd(s)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Partner", url: `${SITE.url}/partner` }])} />
      <SectionNav />

      {/* HERO */}
      <section id="top" className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 left-1/2 -translate-x-1/4 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-60" style={{ background: "radial-gradient(closest-side, rgba(255,150,0,0.45), rgba(255,60,0,0.12) 60%, transparent)" }} />
        </div>
        <Container className="relative pt-10 pb-12 sm:pt-14 sm:pb-16 text-center">
          <h1 className="inline-block border border-yellow px-3 py-1 text-yellow font-light text-base sm:text-lg tracking-wide">ADVERTISE WITH US</h1>
          <Image src="/home/redacteded.avif" alt="REDACTED show art" width={260} height={260} priority className="mx-auto mt-4 size-48 sm:size-64 shadow-[0_20px_60px_rgba(0,0,0,0.6)]" />
          <p className="mt-5 text-sm sm:text-base tracking-[0.12em] uppercase">A procedural horror comedy</p>
          <p className="mt-1 text-base sm:text-lg text-paper/90">
            On the <a href={SITE.network.url} target="_blank" rel="noreferrer" className="font-bold hover:text-yellow">Rusty Quill Network</a> · New episodes every Friday, 9/8c
          </p>
          <a href={mailto} className="btn btn-yellow mt-5 text-lg">
            Partner with us
          </a>
          <Laurels className="mt-10 max-w-5xl mx-auto" />
        </Container>
      </section>

      {/* STATS BAND */}
      <section id="stats" className="bg-yellow text-ink">
        <Container className="py-8 sm:py-10">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 text-center">
            {[
              ["Total plays", s.totalPlays],
              ["Daily average", s.dailyAverage],
              ["Hours consumed", s.hoursConsumed],
              ["Apple/Spotify followers", s.followers],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dd className="font-bold text-4xl sm:text-5xl lg:text-[3.35rem] leading-none">{typeof v === "number" ? <Counter value={v} /> : "n/a"}</dd>
                <dt className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/80">{k as string}</dt>
              </div>
            ))}
          </dl>
          {s.lastUpdated && <p className="mt-6 text-center text-[11px] font-semibold tracking-[0.12em] uppercase text-ink/60">As of {s.lastUpdated}</p>}
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
            {plays ? <PlaysChart data={plays} /> : <p className="text-sm text-muted">Chart unavailable right now.</p>}
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
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
                  ["Cadence", "New episodes every Tuesday and Friday, 9/8c"],
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
                <a href={mailto} className="col-span-2 bg-yellow text-ink font-bold text-sm tracking-[0.14em] uppercase p-4 text-center hover:bg-paper transition-colors">
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
            <span className="block mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">150+ five-star Spotify reviews in the first 30 days</span>
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

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {OPTIONS.map((o) => (
              <div key={o.t} className="border border-white/10 bg-ink/40 p-7">
                <h3 className="font-extrabold uppercase text-2xl tracking-tight">{o.t}</h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow">REDACTED · All episodes</p>
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
            <a href={mailto} className="btn btn-yellow shrink-0">
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
                <ul className="mt-3 grid gap-1.5 text-sm">
                  {awards.map((a) => (
                    <li key={a.file} className="flex justify-between gap-4 border-b border-white/10 py-1.5">
                      <span className="text-paper/85">{a.festival}</span>
                      <span className="text-right text-paper/55 shrink-0">
                        {a.result} · {a.year}
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
          <p className="mx-auto mt-5 max-w-[400px] text-[15px] font-light text-paper/40">We handle sponsorships directly. Reach out and we&apos;ll get back to you immediately.</p>
          <a href={mailto} className="inline-block mt-8 display text-2xl sm:text-3xl text-yellow border-b-2 border-yellow pb-1 hover:text-paper hover:border-paper transition-colors">
            {SITE.email}
          </a>
        </Container>
      </section>
    </div>
  );
}
