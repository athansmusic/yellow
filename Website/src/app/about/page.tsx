import type { Metadata } from "next";
import Image from "next/image";
import { Ed } from "@/components/Ed";
import Link from "next/link";
import { getEpisodes, toTrack } from "@/lib/feed";
import { getDoc } from "@/lib/content";
import { EXTERNAL, LISTEN_BUTTONS, SITE } from "@/lib/site";
import writers from "@/data/writers.json";
import cast from "@/data/cast.json";
import { Container, Heading, PlatformButtons } from "@/components/ui";
import { PlayButton } from "@/components/AudioPlayer";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "About the Show",
  description: "What REDACTED is: a horror comedy audio drama (fiction podcast) from Hush Studios on the Rusty Quill network, created by Athan and Jamie Petronis. The premise, who makes it, how it started, and where to listen.",
  alternates: { canonical: "/about" },
};
export const revalidate = 3600;

export default async function About() {
  await assertVisible("/about");
  const [{ episodes, postmortems, minisodes }, settings] = await Promise.all([getEpisodes().catch(() => ({ episodes: [], postmortems: [], minisodes: [] })), getDoc("settings").catch(() => null)]);
  const first = [...episodes].sort((a, b) => (a.season ?? 1) - (b.season ?? 1) || (a.number ?? 0) - (b.number ?? 0))[0];
  const firstDate = episodes.length ? new Date(episodes[episodes.length - 1].date) : null;
  const seasonLine = settings
    ? settings.seasonStatus === "airing"
      ? `${settings.seasonLabel} airing; ${episodes.length} episodes so far`
      : settings.seasonStatus === "finale"
        ? `${settings.seasonLabel} finale this week; ${episodes.length} episodes so far`
        : settings.seasonStatus === "break"
          ? `${settings.seasonLabel} complete (${episodes.length} episodes). ${settings.seasonNote || "Next season confirmed."}`
          : `Complete series, ${episodes.length} episodes`
    : `${episodes.length} episodes`;
  const ROLES: Record<string, string> = {
    Athan: "Co-creator · Head of Studio · Eli Reyes",
    "Jamie Petronis": "Co-creator · Head of Content · Jacob Kane",
    "Derek Moreland": "Head of Production · Dr. Danse",
    "Natalie Light": "Creative Director · Agent Koska",
  };
  const makers = Object.keys(ROLES)
    .map((n) => cast.find((c) => c.actor === n))
    .filter((c): c is (typeof cast)[number] => !!c)
    .map((c) => ({ slug: c.slug, name: c.actor, image: c.image, about: c.about ?? "", role: ROLES[c.actor], href: `/cast/${c.slug}` }));
  makers.push({ slug: "landon-whisnant", name: "Landon Whisnant", image: "/team/landon-whisnant.avif", about: "Landon 'Lemon' Whisnant is a sound designer, actor and writer that has had a hand in a multitude of audio dramas stretching over just about every genre.", role: "Lead Sound Designer", href: "/cast?group=team" });

  const facts: [string, React.ReactNode][] = [
    ["Title", "REDACTED (also written REDACTED)"],
    ["Format", "Scripted horror comedy audio drama in a procedural format: a case per episode, with a main through line"],
    ["Episode length", "About 30 minutes"],
    ["Schedule", "New episodes Fridays, 9 pm ET / 8 pm CT; Postmortem debriefs Tuesdays"],
    ["Setting", "Vaguely northeastern US, vaguely now"],
    ["Seasons", seasonLine + (postmortems.length ? `, plus ${postmortems.length} Postmortem debriefs and ${minisodes.length} minisodes` : "")],
    ["Network", <a key="n" href={SITE.network.url} className="text-yellow underline underline-offset-4">Rusty Quill</a>],
  ];

  return (
    <Container className="py-10 sm:py-16 max-w-5xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "About", url: `${SITE.url}/about` }])} />
      <Heading as="h1" eyebrow="About the show" size="xl">
        What is REDACTED (also written [REDACTED])?
      </Heading>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="prose-site text-lg text-paper/90">
          <p>
            <Ed id="about.intro1"><strong>REDACTED</strong> is a horror comedy audio drama, a fiction podcast, from Athan (<em>The Grotto</em>) and Jamie Petronis (<em>The Cellar Letters</em>), produced by Hush Studios and released on the Rusty Quill network.</Ed>
          </p>
          <p>
            <Ed id="about.intro2">The show follows Jacob Kane, a struggling actor who, desperate for a fresh start, assumes the identity of his deceased twin, Jordan. Expecting a simple accounting job, he instead finds himself accidentally inside an underfunded secret government agency called The REDACTED Unit, tasked with discreetly handling bizarre and often dangerous paranormal cases. The things the Unit handles are called <strong>Aberrations</strong>.</Ed>
          </p>
          <p>
            <Ed id="about.intro3">As Jacob settles into his role, he begins to unravel the unsettling truths around his brother’s death. What begins as an act of reinvention slowly becomes a descent into a web of paranormal forces, secret agendas, and moral compromise.</Ed>
          </p>
          <p><Ed id="about.intro4">It’s a multi-season, monster-of-the-week series: each episode is a self-contained case, and the story of Jordan’s death runs underneath all of them. If you like <em>The X-Files</em>, <em>Buffy</em>, <em>Brooklyn Nine-Nine</em>, <em>Psych</em>, or <em>The Magnus Archives</em>, this is for you.</Ed></p>
        </div>
        <div>
          <Image src="/brand/showart.jpeg" alt="REDACTED show art" width={500} height={500} className="w-full max-w-sm border border-line" />
        </div>
      </div>

      {/* Hear it */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_1fr] items-center border border-line bg-ink-2/70 p-5 sm:p-6">
        <div className="aspect-video bg-black border border-line">
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
          <h2 className="eyebrow mb-2">Hear it</h2>
          <p className="text-paper/90"><Ed id="about.start">Start at the beginning. The pilot is three parts, released together.</Ed></p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {first && <PlayButton track={toTrack(first)} plain label={`Play ${first.code}`} className="btn btn-yellow" />}
            <PlatformButtons links={LISTEN_BUTTONS} size="sm" />
          </div>
          <Link href="/where" className="mt-3 inline-block text-sm text-paper/80 underline underline-offset-4 hover:text-yellow">
            Every app it&apos;s on
          </Link>
        </div>
      </section>

      {/* Who makes it */}
      <section className="mt-14">
        <h2 className="display text-3xl mb-2">Who makes it</h2>
        <p className="text-paper/85 max-w-prose">
          Created by Athan and Jamie Petronis and produced by{" "}
          <a href={SITE.studio.url} className="text-yellow underline underline-offset-4">
            Hush Studios
          </a>
          , the studio behind <em>The Grotto</em> and <em>The Cellar Letters</em>. The show is released on the{" "}
          <a href={SITE.network.url} className="text-yellow underline underline-offset-4">
            Rusty Quill
          </a>{" "}
          network alongside <em>The Magnus Archives</em>.
        </p>
        <ul className="mt-6 grid gap-5 md:grid-cols-2">
          {makers.map((m) => (
            <li key={m.slug} className="flex gap-5 border border-line bg-ink-2/70 p-4">
              <Link href={m.href} className="relative size-28 shrink-0 overflow-hidden bg-ink-3 border border-line">
                <Image src={m.image} alt={m.name} fill sizes="112px" className="object-cover object-top" />
              </Link>
              <div className="min-w-0">
                <Link href={m.href} className="display text-2xl hover:text-yellow">
                  {m.name}
                </Link>
                <p className="text-xs text-yellow font-semibold uppercase tracking-wider">{m.role}</p>
                {m.about && <p className="mt-2 text-sm text-paper/80 line-clamp-4">{m.about}</p>}
              </div>
            </li>
          ))}
        </ul>
        <Link href="/cast?group=team" className="mt-4 inline-block text-sm text-yellow underline underline-offset-4">
          The whole team
        </Link>
      </section>

      {/* How it started */}
      <section className="mt-14 grid gap-8 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="display text-3xl mb-2">How it started</h2>
          <p className="text-paper/85 max-w-prose">
            REDACTED was funded on Kickstarter in May 2025, finishing at 313% with more than 400 backers. The first three episodes were released together on {firstDate ? firstDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "November 8, 2025"}, and new episodes have dropped every Friday since. Everyone who backed it is on the{" "}
            <Link href="/supporter-wall" className="text-yellow underline underline-offset-4">
              supporter wall
            </Link>
            .
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["313%", "Funded"],
            ["400+", "Backers"],
            [String(episodes.length), "Episodes"],
          ].map(([v, k]) => (
            <div key={k} className="border border-line bg-ink-2/70 p-4">
              <dd className="display text-4xl text-yellow tabular">{v}</dd>
              <dt className="eyebrow mt-1">{k}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* The facts that matter */}
      <section className="mt-14">
        <h2 className="display text-3xl mb-4">Quick facts</h2>
        <dl className="grid sm:grid-cols-[12rem_1fr] gap-x-6 border-t border-line">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="eyebrow pt-3 sm:py-3 sm:border-b sm:border-line">{k}</dt>
              <dd className="pb-3 sm:py-3 border-b border-line text-sm text-paper/90">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Guest writers */}
      <section className="mt-14">
        <h2 className="display text-3xl mb-2">Guest writers</h2>
        <p className="text-paper/85 max-w-prose">Each season features guest directors from film, games, and audio drama who write, design, and direct an aberration.</p>
        <ul className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-line">
          {writers.map((w) => (
            <li key={w.name} className="border-b border-r border-line px-4 py-3">
              <p className="display text-xl">{w.name}</p>
              <p className="text-xs text-muted">{w.credit}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 border-t border-line pt-6 text-sm text-paper/80">
        <p>
          Award winner at the Swedish International Film Festival, Grito X, and Film 25 ArtFF, with selections at fifteen more festivals. Press, stats, and downloads are on the{" "}
          <Link href="/partner" className="text-yellow underline underline-offset-4">
            press kit
          </Link>
          . Questions:{" "}
          <a href={`mailto:${SITE.email}`} className="text-yellow underline underline-offset-4">
            {SITE.email}
          </a>
          .
        </p>
      </section>
    </Container>
  );
}
