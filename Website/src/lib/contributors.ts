import "server-only";
import { getAllItems, slugify, type Episode } from "./feed";
import { getDoc, type ContributorArt, type ContributorWork, type ContributorSocials } from "./content";
import castJson from "@/data/cast.json";
import writersJson from "@/data/writers.json";
import overridesJson from "@/data/store-overrides.json";
import infoJson from "@/data/contributor-info.json";

export type ContributorRole = "writer" | "artist" | "cast";

export type Contributor = {
  slug: string;
  name: string;
  roles: ContributorRole[];
  photo?: string;
  /** "Siren Head, Scarewaves" -> chips */
  knownFor: string[];
  /** Episodes they wrote (guest-director credit in the feed). */
  wrote: Episode[];
  /** Store products they made the art for. */
  productCount: number;
  /** Owner-written description; empty means the page shows STATEMENT WITHHELD. */
  bio: string;
  /** Owner-uploaded raw art pieces. */
  art: ContributorArt[];
  /** Owner-entered other work, with optional links. */
  works: ContributorWork[];
  /** Only the filled-in socials. */
  socials: ContributorSocials;
  /** Hidden from the public directory and their own page (admin toggle). */
  hidden: boolean;
  /** Nothing filled in yet: no art pieces and no description, so nothing to show. */
  empty: boolean;
  /** Their cast page, when they also act. */
  castSlug?: string;
  castCharacter?: string;
};

type CastRow = { slug: string; actor: string; character: string; image?: string };
type WriterRow = { name: string; credit: string };

const cast = castJson as CastRow[];
const writers = writersJson as WriterRow[];
const byName = (overridesJson as { byName: Record<string, { artist?: string }> }).byName;
type InfoRow = { bio?: string; photo?: string; socials?: Record<string, string>; works?: { title: string; note?: string; url?: string }[] };
/** Committed research: owner-approved words and official links, overridden by anything set in admin. */
const info = infoJson as Record<string, InfoRow>;

function productCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ov of Object.values(byName)) if (ov.artist) counts[ov.artist] = (counts[ov.artist] ?? 0) + 1;
  return counts;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Everyone who contributed, assembled from cast, writers, store artists, and the feed's guest credits. */
export async function getContributors(): Promise<Contributor[]> {
  const [items, doc] = await Promise.all([getAllItems().catch(() => [] as Episode[]), getDoc("contributors").catch(() => ({}))]);
  const counts = productCounts();
  const map = new Map<string, Contributor>();

  const touch = (name: string): Contributor => {
    const slug = slugify(name);
    let c = map.get(slug);
    if (!c) {
      c = { slug, name, roles: [], knownFor: [], wrote: [], productCount: 0, bio: "", art: [], works: [], socials: {}, hidden: false, empty: true };
      map.set(slug, c);
    }
    return c;
  };

  // Guest writers: their episodes come from the feed's guest-director credits
  for (const w of writers) {
    const c = touch(w.name);
    if (!c.roles.includes("writer")) c.roles.push("writer");
    c.knownFor = w.credit.split(",").map((x) => x.trim()).filter(Boolean);
    c.wrote = items.filter((e) => e.kind === "episode" && e.guestDirector && norm(e.guestDirector) === norm(w.name)).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  }

  // Store artists
  for (const [artist, n] of Object.entries(counts)) {
    const c = touch(artist);
    if (!c.roles.includes("artist")) c.roles.push("artist");
    c.productCount = n;
  }

  // Cast: link, never duplicate — the cast page stays their acting home
  for (const m of cast) {
    const slug = slugify(m.actor);
    const c = map.get(slug);
    if (!c) continue;
    if (!c.roles.includes("cast")) c.roles.push("cast");
    c.castSlug = m.slug;
    c.castCharacter = m.character;
    if (!c.photo && m.image) c.photo = m.image;
  }

  // Owner-managed art and descriptions
  for (const c of map.values()) {
    const entry = (doc as Record<string, { bio?: string; art?: ContributorArt[]; hidden?: boolean; photo?: string; works?: ContributorWork[]; socials?: ContributorSocials }>)[c.slug];
    const base = info[c.slug];
    c.bio = entry?.bio ?? base?.bio ?? "";
    c.hidden = !!entry?.hidden;
    if (entry?.photo) c.photo = entry.photo;
    else if (base?.photo) c.photo = base.photo;
    c.art = entry?.art ?? [];
    c.works = entry?.works?.length ? entry.works : (base?.works ?? []).map((w, i) => ({ id: `info-${i}`, ...w }));
    // Entered work wins: the chips become the real credits instead of repeating them
    if (c.works.length) c.knownFor = c.works.map((w) => w.title);
    c.socials = Object.keys(entry?.socials ?? {}).length ? entry!.socials! : (base?.socials ?? {});
    c.empty = c.art.length === 0 && !c.bio && c.works.length === 0;
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getContributor(slug: string): Promise<Contributor | undefined> {
  return (await getContributors()).find((c) => c.slug === slug);
}
