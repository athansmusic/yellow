import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import cast from "@/data/cast.json";
import { SITE } from "@/lib/site";
import { getAllItems, type Episode } from "@/lib/feed";
import { Container, LinkIcons } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import type { IconName } from "@/components/Icons";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Cast of REDACTED",
  description: "The cast of REDACTED: who plays Jacob Kane, Eli Reyes, Hedy, Jo Valentine, Lucas Kipp, Maxwell Clark, Control, and the rest of The Redacted Unit, with bios and links.",
  alternates: { canonical: "/cast" },
};

const CORE = ["Jamie Petronis", "Athan", "Ishani Kanetkar", "Kirsten Ria", "Devin Steffens", "Joe Cliff Thompson", "Ash Millman"];
type Member = (typeof cast)[number];

const GROUPS = [
  ["all", "Everyone"],
  ["unit", "TRU"],
  ["recurring", "Recurring"],
  ["postmortem", "Postmortem"],
  ["team", "Team"],
] as const;
type Group = (typeof GROUPS)[number][0];

/** Production team, shown only on the Team tab. Photo and links come from cast.json when the person is also in the cast. */
const TEAM: { name: string; role: string; image?: string }[] = [
  { name: "Jamie Petronis", role: "Co-creator and Head of Content" },
  { name: "Athan", role: "Co-creator and Head of Studio" },
  { name: "Derek Moreland", role: "Head of Production" },
  { name: "Natalie Light", role: "Creative Director" },
  { name: "Landon Whisnant", role: "Lead Sound Designer", image: "/team/landon-whisnant.avif" },
  { name: "Bard", role: "Dialogue Editor" },
  { name: "Lyssa Jay", role: "Writer (Postmortem)" },
  { name: "Krista Langlois", role: "Moderation & Support", image: "/team/krista-langlois.avif" },
  { name: "Taylor Michaels", role: "Production Assistant" },
  { name: "Reag Koster", role: "Social Media", image: "/team/reag-koster.avif" },
];

const normName = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");

export default async function CastPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  await assertVisible("/cast");
  const { group: g } = await searchParams;
  const group: Group = (GROUPS.map((x) => x[0]) as string[]).includes(g ?? "") ? (g as Group) : "all";
  const items = await getAllItems().catch(() => [] as Episode[]);

  // Appearances per actor, from the parsed "Starring" lists (episodes, minisodes, Postmortems)
  const appearances = new Map<string, { episodes: Episode[]; postmortems: number }>();
  for (const e of items) {
    if (e.kind === "trailer") continue;
    for (const line of e.starring) {
      const actor = normName(line.split(/\s+as\s+/i)[0]);
      const rec = appearances.get(actor) ?? { episodes: [], postmortems: 0 };
      if (e.kind === "postmortem") rec.postmortems++;
      else rec.episodes.push(e);
      appearances.set(actor, rec);
    }
  }
  // Feed credits sometimes carry an extra surname ("Lev Rodriguez Shivers"); match on prefix either way
  const lookup = (actor: string) => {
    const key = normName(actor);
    if (appearances.has(key)) return appearances.get(key)!;
    for (const [k, v] of appearances) if (k.startsWith(key) || key.startsWith(k)) return v;
    return undefined;
  };
  const stats = (c: Member) => {
    const a = lookup(c.actor) ?? { episodes: [], postmortems: 0 };
    const first = [...a.episodes].sort((x, y) => +new Date(x.date) - +new Date(y.date))[0];
    return { count: a.episodes.length, postmortems: a.postmortems, first };
  };
  const tier = (c: Member): Exclude<Group, "all" | "postmortem"> => (CORE.includes(c.actor) ? "unit" : "recurring");

  const core = CORE.map((n) => cast.find((c) => c.actor === n)).filter(Boolean) as Member[];
  const rest = cast.filter((c) => !CORE.includes(c.actor)); // keeps the order in cast.json
  const ordered = [...core, ...rest];
  const PM_LEADS = ["Lyssa Jay", "Derek Moreland", "Natalie Light"]; // Sloan, Dr. Danse, and Agent Koska front the Postmortem view
  const shown = ordered
    .filter((c) => (group === "all" ? true : group === "postmortem" ? stats(c).postmortems > 0 : group === "team" ? false : tier(c) === group))
    .sort((a, b) => (group === "postmortem" ? (PM_LEADS.includes(a.actor) ? PM_LEADS.indexOf(a.actor) : 99) - (PM_LEADS.includes(b.actor) ? PM_LEADS.indexOf(b.actor) : 99) : 0));
  const counts = Object.fromEntries(GROUPS.map(([id]) => [id, id === "team" ? TEAM.length : ordered.filter((c) => (id === "all" ? true : id === "postmortem" ? stats(c).postmortems > 0 : tier(c) === id)).length])) as Record<Group, number>;

  const people = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "REDACTED cast",
    itemListElement: cast.map((c, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "Person", name: c.actor, url: `${SITE.url}/cast/${c.slug}`, performerIn: { "@type": "PodcastSeries", name: "REDACTED" }, description: `${c.character} in REDACTED` } })),
  };

  return (
    <>
      <JsonLd data={people} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Cast", url: `${SITE.url}/cast` }])} />

      <div className="border-b border-line bg-ink/60">
        <Container className="py-10 sm:py-14">
          <p className="eyebrow">Meet the cast</p>
          <h1 className="display text-5xl sm:text-7xl mt-1">
            Cast of REDACTED
          </h1>
          <nav aria-label="Filter cast" className="mt-6 flex flex-wrap gap-2">
            {GROUPS.map(([id, label]) => {
              const on = id === group;
              return (
                <Link key={id} href={id === "all" ? "/cast" : `/cast?group=${id}`} aria-current={on ? "page" : undefined} className={`display text-lg px-3 py-1.5 border ${on ? "border-yellow bg-yellow text-ink" : "border-line hover:border-yellow hover:text-yellow"}`}>
                  {label} <span className={`font-sans text-xs tabular ${on ? "text-ink/70" : "text-muted"}`}>({counts[id]})</span>
                </Link>
              );
            })}
          </nav>
        </Container>
      </div>

      <section>
        <Container className="py-12 sm:py-16">
          {group === "team" && (
            <ul className="grid gap-x-4 gap-y-8 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {TEAM.map((t) => {
                const c = cast.find((x) => x.actor === t.name);
                return (
                  <li key={t.name}>
                    {c ? (
                      <Link href={`/cast/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-ink border border-line hover:border-yellow">
                        <Image src={c.image} alt={t.name} fill sizes="(min-width:1024px) 20vw, (min-width:768px) 25vw, 50vw" className="object-cover object-top group-hover:scale-[1.03] transition-transform duration-500" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-4 pt-14">
                          <p className="display text-xl">{t.name}</p>
                          <p className="text-yellow font-semibold text-sm mt-1">{t.role}</p>
                        </div>
                      </Link>
                    ) : (
                      <div className="relative block aspect-[4/5] overflow-hidden bg-ink-2 border border-line">
                        {t.image && <Image src={t.image} alt={t.name} fill sizes="(min-width:1024px) 20vw, (min-width:768px) 25vw, 50vw" className="object-cover object-top" />}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-4 pt-14">
                          <p className="display text-xl">{t.name}</p>
                          <p className="text-yellow font-semibold text-sm mt-1">{t.role}</p>
                        </div>
                      </div>
                    )}
                    {c && <LinkIcons links={c.links as Partial<Record<IconName, string>>} size={16} className="mt-2" />}
                  </li>
                );
              })}
            </ul>
          )}
          {group === "all" && <h2 className="eyebrow mb-4">TRU</h2>}
          <ul className={`grid gap-x-4 gap-y-8 grid-cols-2 md:grid-cols-4 ${group === "all" ? "lg:grid-cols-6" : "lg:grid-cols-5"} ${group === "team" ? "hidden" : ""}`}>
            {(group === "all" ? core : shown).map((c, i) => (
              <li key={`${c.character}-${c.actor}`}>
                <Reveal delay={(i % 6) * 50}>
                  <Portrait c={c} size="sm" priority={i < 6} />
                  <Appearances s={stats(c)} />
                  {c.bio && (
                    <p className="mt-2 text-xs text-muted">
                      {lead(c.bio)}{" "}
                      <Link href={`/cast/${c.slug}`} className="text-paper/80 underline underline-offset-2 hover:text-yellow whitespace-nowrap">
                        More
                      </Link>
                    </p>
                  )}
                  <LinkIcons links={c.links as Partial<Record<IconName, string>>} size={16} className="mt-1" />
                </Reveal>
              </li>
            ))}
          </ul>

          {group === "all" && rest.length > 0 && (
            <>
              <h2 className="eyebrow mt-14 mb-4">Also starring</h2>
              <ul className="grid gap-x-4 gap-y-8 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                {rest.map((c, i) => (
                  <li key={`${c.character}-${c.actor}`}>
                    <Reveal delay={(i % 5) * 50}>
                      <Portrait c={c} size="sm" />
                      <Appearances s={stats(c)} />
                      {c.bio && (
                        <p className="mt-2 text-xs text-muted">
                          {lead(c.bio)}{" "}
                          <Link href={`/cast/${c.slug}`} className="text-paper/80 underline underline-offset-2 hover:text-yellow whitespace-nowrap">
                            More
                          </Link>
                        </p>
                      )}
                      <LinkIcons links={c.links as Partial<Record<IconName, string>>} size={16} className="mt-1" />
                    </Reveal>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Container>
      </section>
    </>
  );
}

/** First sentence or two of a bio, cut only at a sentence boundary, so cards never end in an ellipsis. */
function lead(bio: string, max = 130) {
  const sentences = bio.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+(?:["')\]]+)?/g) ?? [bio];
  let out = "";
  for (const sn of sentences) {
    if (out && (out + sn).length > max) break;
    out += (out ? " " : "") + sn.trim();
    if (out.length > max) break;
  }
  return out || sentences[0].trim();
}

/** "21 episodes · 4 Postmortems · first heard in S1 E1" */
function Appearances({ s }: { s: { count: number; postmortems: number; first?: Episode } }) {
  if (!s.count && !s.postmortems) return null;
  return (
    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-paper/70">
      {s.count > 0 && `${s.count} episode${s.count === 1 ? "" : "s"}`}
      {s.count > 0 && s.postmortems > 0 && " · "}
      {s.postmortems > 0 && `${s.postmortems} Postmortem${s.postmortems === 1 ? "" : "s"}`}
      {s.first && (
        <>
          {" · "}
          <Link href={`/episodes/${s.first.slug}`} className="text-yellow hover:underline underline-offset-2 normal-case tracking-normal">
            first heard in {s.first.code ?? s.first.shortTitle}
          </Link>
        </>
      )}
    </p>
  );
}

function Portrait({ c, size, priority = false }: { c: Member; size: "lg" | "sm"; priority?: boolean }) {
  return (
    <Link href={`/cast/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-ink border border-line hover:border-yellow">
      <Image src={c.image} alt={`${c.actor} as ${c.character}`} fill priority={priority} sizes={size === "lg" ? "(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" : "(min-width:1024px) 20vw, (min-width:768px) 25vw, 50vw"} className="object-cover object-top group-hover:scale-[1.03] transition-transform duration-500" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-4 pt-14">
        <p className={`display leading-none ${size === "lg" ? "text-3xl" : "text-xl"}`}>{c.character}</p>
        <p className={`text-yellow font-semibold ${size === "lg" ? "text-base mt-1" : "text-sm mt-1"}`}>{c.actor}</p>
      </div>
    </Link>
  );
}
