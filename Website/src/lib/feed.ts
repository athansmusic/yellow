import { XMLParser } from "fast-xml-parser";
import { FEEDS } from "./site";

export type EpisodeKind = "episode" | "postmortem" | "minisode" | "bonus" | "trailer";

export type Episode = {
  kind: EpisodeKind;
  slug: string;
  title: string; // "S1E26: Clickolding"
  shortTitle: string; // "Clickolding"
  code?: string; // "S1 E26"
  season?: number;
  number?: number;
  date: string; // ISO
  audioUrl: string;
  image: string;
  duration?: string;
  summary: string; // first paragraph, plain text
  bodyHtml: string; // description with boilerplate stripped
  starring: string[];
  contentWarnings?: string;
  guestDirector?: string; // "This episode was guest directed by …"
  credits: { label: string; value: string }[];
  notesHtml: string; // body minus summary / starring / warnings / boilerplate
  acastUrl?: string;
  guid: string;
};

type RawItem = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "#cdata",
  textNodeName: "#text",
  isArray: (name) => name === "item",
});

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["#cdata"] === "string") return o["#cdata"];
    if (typeof o["#text"] === "string") return o["#text"];
  }
  return "";
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’"“”*]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EP_RE = /^S(\d+)\s*E(\d+)\s*[:\-–]\s*(.+)$/i;

function classify(title: string, episodeType: string) {
  const t = title.trim();
  const m = t.match(EP_RE);
  if (m) {
    const season = Number(m[1]);
    const number = Number(m[2]);
    return {
      kind: "episode" as const,
      season,
      number,
      code: `S${season} E${number}`,
      shortTitle: m[3].trim(),
      slug: `s${season}e${number}`,
    };
  }
  if (/^postmortem\s*:/i.test(t)) {
    const short = t.replace(/^postmortem\s*:\s*/i, "").trim();
    return { kind: "postmortem" as const, shortTitle: short, slug: `postmortem-${slugify(short)}` };
  }
  if (/^minisode\s*:/i.test(t)) {
    const short = t.replace(/^minisode\s*:\s*/i, "").trim();
    return { kind: "minisode" as const, shortTitle: short, slug: `minisode-${slugify(short)}` };
  }
  // Intermissions (Thanksgiving, Holiday, etc.) live with the minisodes
  if (/intermission/i.test(t)) {
    return { kind: "minisode" as const, shortTitle: t, slug: `minisode-${slugify(t)}` };
  }
  // Cross-posted Seven Planes episodes belong to that show's page, not these tabs
  if (/seven planes/i.test(t)) {
    return { kind: "trailer" as const, shortTitle: t, slug: slugify(t) };
  }
  if (episodeType === "trailer" || /trailer/i.test(t)) {
    return { kind: "trailer" as const, shortTitle: t, slug: slugify(t) };
  }
  const short = t.replace(/^we recommend\s*:\s*/i, "").trim();
  return { kind: "bonus" as const, shortTitle: short, slug: slugify(t) };
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Remove the "-Information on REDACTED-" boilerplate Acast appends to every episode. */
function stripBoilerplate(html: string): string {
  let h = html;
  h = h.replace(/<p[^>]*>\s*-+\s*Information on REDACTED\s*-+\s*<\/p>[\s\S]*$/i, "");
  h = h.replace(/-+\s*Information on REDACTED\s*-+[\s\S]*$/i, "");
  h = h.replace(/<hr\s*\/?>[\s\S]*$/i, "");
  h = h.replace(/<p[^>]*>\s*Hosted on Acast[\s\S]*$/i, "");
  return h.trim();
}

function parseDescription(html: string) {
  // Split off the "-Information on REDACTED-" tail; it carries the credits.
  const splitAt = html.search(/-+\s*Information on REDACTED\s*-+/i);
  const main = splitAt >= 0 ? html.slice(0, splitAt) : html;
  const tail = splitAt >= 0 ? html.slice(splitAt) : "";
  const clean = stripBoilerplate(html);

  // Starring: every <li> before the credits
  let starring = Array.from(main.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((m) => stripTags(m[1]).trim())
    .filter(Boolean)
    .filter((x) => !/^https?:\/\//i.test(x));
  // Some episodes list the cast as plain <p> lines after "Starring:" instead of a <ul>
  if (!starring.length) {
    const m = main.match(/<p[^>]*>\s*(?:<strong>)?\s*Starring\s*:?\s*(?:<\/strong>)?\s*<\/p>([\s\S]*?)(?=<p[^>]*>\s*(?:<strong>)?\s*Content warnings?|-Information on REDACTED-|$)/i);
    if (m) {
      starring = Array.from(m[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
        .map((x) => stripTags(x[1]).trim())
        .filter((line) => /\sas\s/i.test(line));
    }
  }

  // Content warnings: text after the "Content warnings:" heading (any case, optional <strong>)
  let contentWarnings: string | undefined;
  const cwIdx = main.search(/<p[^>]*>\s*(<strong>)?\s*Content warnings?\s*:?\s*(<\/strong>)?\s*<\/p>/i);
  let notesSrc = main;
  if (cwIdx >= 0) {
    const after = main.slice(cwIdx).replace(/^<p[^>]*>[\s\S]*?<\/p>/i, "");
    contentWarnings = stripTags(after).split("\n").map((l) => l.trim()).filter(Boolean).join(" ") || undefined;
    notesSrc = main.slice(0, cwIdx);
  }
  // Notes: paragraphs before Starring, minus the self-link and the "warnings below" line
  const starIdx = notesSrc.search(/<p[^>]*>\s*(<strong>)?\s*Starring\s*:?/i);
  if (starIdx >= 0) notesSrc = notesSrc.slice(0, starIdx);
  const paras = Array.from(notesSrc.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => m[1].trim()).filter((p) => {
    const t = stripTags(p);
    if (!t) return false;
    if (/this episode on our website/i.test(t)) return false;
    if (/content warnings and episode details can be found below/i.test(t)) return false;
    return true;
  });
  const summary = paras.length ? stripTags(paras[0]).split("\n")[0].trim() : stripTags(clean).split("\n").find(Boolean) ?? "";
  const notesHtml = paras.slice(1).map((p) => `<p>${p}</p>`).join("");

  // Credits: <strong>Label</strong> value pairs in the tail, plus the <em>Concept</em> line
  const credits: { label: string; value: string }[] = [];
  for (const m of tail.matchAll(/<p[^>]*>\s*<strong>([^<]+)<\/strong>\s*([\s\S]*?)<\/p>/gi)) {
    const label = m[1].replace(/\s*by\s*$/i, "").trim();
    const value = stripTags(m[2]).trim().replace(/^by\s+/i, "");
    if (label && value) credits.push({ label, value });
  }
  const concept = tail.match(/<em>\s*Concept by\s*([^<]+)<\/em>/i);
  if (concept) credits.push({ label: "Concept", value: concept[1].trim() });

  // Guest director: "This episode was Guest Directed by Trevor Henderson" / "guest directed by Ashley McAnnelly, creator of..."
  const gd = stripTags(clean).match(/guest[\s-]*directed by\s+([A-Z][^.,;:\n(]{2,60}?)(?=\s*(?:[.,;:(\n]|\bcreator\b|\byou can\b|\bcontent warnings?\b|\bstarring\b|\bhttps?:|$))/i);
  const guestDirector = gd ? gd[1].replace(/\s+/g, " ").trim() : undefined;

  return { bodyHtml: clean, summary, starring, contentWarnings, credits, notesHtml, guestDirector };
}

async function fetchFeed(url: string, fresh = false): Promise<RawItem[]> {
  // The fresh read must NOT use cache:"no-store" — this route sets `export const revalidate`, and
  // a no-store fetch under that throws at render time, turning a would-be 404 into a 500. A
  // distinct short-lived cache entry gets the same freshness; Acast ignores the extra param.
  const init: RequestInit & { next?: { revalidate: number; tags?: string[] } } = { headers: { "user-agent": "theredactedunit.com" } };
  init.next = fresh ? { revalidate: 30 } : { revalidate: 600, tags: ["episodes"] };
  const res = await fetch(fresh ? `${url}${url.includes("?") ? "&" : "?"}fresh=1` : url, init);
  if (!res.ok) throw new Error(`Feed ${url} → ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);
  const items = (doc?.rss?.channel?.item ?? []) as RawItem[];
  return items;
}

/** Guest directors the feed text doesn't state in the usual "guest directed by" form. Keyed by episode code. */
/** Keyed by episode code or slug. Empty string SUPPRESSES a false parser match. */
const GUEST_DIRECTOR_OVERRIDES: Record<string, string> = {
  "S1 E26": "Xalavier Nelson Jr.", // Clickolding: "created based on Clickolding, a narrative clicker game by Strange Scaffold"
  // The bloopers notes promo NEXT week's episode ("guest directed by Trevor Henderson"); not this one's credit
  "minisode-holiday-intermission-bloopers": "",
};

/** Show-notes typos and stylings that break cast matching, fixed wherever they appear. */
const NAME_FIXES: [RegExp, string][] = [
  [/Devin Steffins/gi, "Devin Steffens"],
  [/The Joe Cliff Thompson/gi, "Joe Cliff Thompson"],
  [/Nathan Lundsford/gi, "Nathan Lunsford"],
  [/Zoe (?:D\.? )?Lee/gi, "Zoe D Lee"],
  [/Ashley McAnnelly/gi, "Ashley McAnelly"],
];
const fixNames = (x: string) => NAME_FIXES.reduce((acc, [re, to]) => acc.replace(re, to), x);

/** Cast the feed's show notes miss. Keyed by episode code; appended to the parsed starring list. */
const STARRING_OVERRIDES: Record<string, string[]> = {
  "S1 E2": ["Landon Whisnant as The Teejmeister"],
  "S1 E6": ["Taylor Michaels as Mars Donovan"], // in the episode, absent from the Acast notes
  // S1E10's notes carry no cast block at all; same for its Postmortem (keyed by slug, PMs have no code)
  "S1 E10": ["Jamie Petronis as Jacob Kane", "Ishani Kanetkar as Hedy Hauksdottir", "Devin Steffens as Lucas Kipp", "Ash Millman as Riley Fleming"],
  "postmortem-brood": ["Lyssa Jay as Sloan Summers", "Derek Moreland as Dr. Danse", "Natalie Light as Agent Koska"],
  // The Clickolding debrief breaks form: the guest director and both creators, as themselves
  "postmortem-clickolding": ["Xalavier Nelson Jr.", "Johnathan Magno", "Jamie Petronis"],
  "postmortem-prodigy-part-1": ["Jamie Petronis as Jacob Kane"],
  "minisode-thanksgiving-intermission-bonus-scene": ["Jamie Petronis as Jacob Kane", "James Spurney as Phil the Landlord"],
};

function toEpisode(it: RawItem): Episode | null {
  const title = text(it.title).trim();
  if (!title) return null;
  const enclosure = it.enclosure as Record<string, string> | undefined;
  const audioUrl = enclosure?.["@_url"] ?? "";
  const image =
    (it["itunes:image"] as Record<string, string> | undefined)?.["@_href"] ?? "";
  const episodeType = text(it["itunes:episodeType"]).toLowerCase();
  const c = classify(title, episodeType);
  const descHtml = text(it["content:encoded"]) || text(it.description);
  const d = parseDescription(descHtml);
  const pub = new Date(text(it.pubDate));
  return {
    kind: c.kind,
    slug: c.slug,
    title,
    shortTitle: c.shortTitle,
    code: "code" in c ? c.code : undefined,
    season: "season" in c ? c.season : undefined,
    number: "number" in c ? c.number : undefined,
    date: isNaN(pub.getTime()) ? new Date(0).toISOString() : pub.toISOString(),
    audioUrl,
    image,
    duration: text(it["itunes:duration"]) || undefined,
    summary: fixNames(d.summary),
    bodyHtml: fixNames(d.bodyHtml),
    starring: [...d.starring.map(fixNames), ...(STARRING_OVERRIDES[("code" in c && c.code) || ""] ?? STARRING_OVERRIDES[c.slug] ?? []).filter((x) => !d.starring.includes(x))],
    contentWarnings: d.contentWarnings,
    guestDirector: (() => {
      const k = ("code" in c && c.code) || c.slug;
      const gd = k in GUEST_DIRECTOR_OVERRIDES ? GUEST_DIRECTOR_OVERRIDES[k] || undefined : d.guestDirector;
      return gd ? fixNames(gd) : undefined;
    })(),
    credits: d.credits.map((cr) => ({ ...cr, value: fixNames(cr.value) })),
    notesHtml: fixNames(d.notesHtml),
    acastUrl: text(it.link) || undefined,
    guid: text(it.guid) || title,
  };
}

export async function getAllItems(fresh = false): Promise<Episode[]> {
  const items = await fetchFeed(FEEDS.redacted, fresh);
  return items
    .map(toEpisode)
    .filter((e): e is Episode => !!e)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export async function getEpisodes() {
  const all = await getAllItems();
  return {
    episodes: all.filter((e) => e.kind === "episode"),
    postmortems: all.filter((e) => e.kind === "postmortem"),
    minisodes: all.filter((e) => e.kind === "minisode"),
    bonus: all.filter((e) => e.kind === "bonus"),
    trailers: all.filter((e) => e.kind === "trailer"),
    all,
  };
}

/** Our slugs are kebab-case; anything else is a bot or a typo and never earns an uncached read. */
const SLUG_SHAPE = /^[a-z0-9][a-z0-9-]{2,80}$/;

export async function getItemBySlug(slug: string): Promise<Episode | undefined> {
  const hit = (await getAllItems()).find((e) => e.slug === slug);
  if (hit || !SLUG_SHAPE.test(slug)) return hit;
  // An episode that went live minutes ago is not in the cached feed yet, and notFound() would be
  // cached for the whole revalidate window — so the page would stay missing long after it
  // published. A near-fresh read on the miss path fixes that. Never let it throw: a failure here
  // must degrade to "not found", never to a 500 on every unknown slug.
  try {
    return (await getAllItems(true)).find((e) => e.slug === slug);
  } catch {
    return undefined;
  }
}

/** Neighbours of the same kind, for prev/next navigation. */
export async function getNeighbours(ep: Episode) {
  const all = (await getAllItems()).filter((e) => e.kind === ep.kind);
  const i = all.findIndex((e) => e.slug === ep.slug);
  return { newer: i > 0 ? all[i - 1] : undefined, older: i >= 0 && i < all.length - 1 ? all[i + 1] : undefined };
}

export type T7PEpisode = {
  slug: string;
  title: string;
  date: string;
  audioUrl: string;
  image: string;
  summary: string;
  bodyHtml: string;
  duration?: string;
};

export async function getSevenPlanes(): Promise<{ description: string; image: string; episodes: T7PEpisode[] }> {
  const res = await fetch(FEEDS.sevenPlanes, { next: { revalidate: 3600 } });
  const xml = await res.text();
  const doc = parser.parse(xml);
  const ch = doc?.rss?.channel ?? {};
  const items = (ch.item ?? []) as RawItem[];
  const episodes = items
    .map((it) => {
      const title = text(it.title).trim();
      const html = stripBoilerplate(text(it["content:encoded"]) || text(it.description));
      const plain = stripTags(html);
      return {
        slug: slugify(title),
        title,
        date: new Date(text(it.pubDate)).toISOString(),
        audioUrl: (it.enclosure as Record<string, string>)?.["@_url"] ?? "",
        image: (it["itunes:image"] as Record<string, string>)?.["@_href"] ?? "",
        summary: plain.split("\n").find(Boolean) ?? "",
        bodyHtml: html,
        duration: text(it["itunes:duration"]) || undefined,
      };
    })
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return {
    description: stripTags(text(ch.description)),
    image: (ch["itunes:image"] as Record<string, string>)?.["@_href"] ?? "",
    episodes,
  };
}

/** Player track for an episode (handles Seven Planes items, whose guids start with "t7p-"). */
export function toTrack(e: Episode) {
  const t7p = e.guid.startsWith("t7p-");
  return { id: e.guid, title: e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title, subtitle: t7p ? "The Seven Planes" : "REDACTED", src: e.audioUrl, image: e.image || "/brand/showart.jpeg", href: t7p ? "/episodes?show=t7p" : `/episodes/${e.slug}` };
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDuration(d?: string) {
  if (!d) return undefined;
  if (/^\d+$/.test(d)) {
    const s = Number(d);
    const m = Math.round(s / 60);
    return `${m} min`;
  }
  const parts = d.split(":").map(Number);
  if (parts.length === 3) return `${parts[0] * 60 + parts[1]} min`;
  if (parts.length === 2) return `${parts[0]} min`;
  return d;
}
