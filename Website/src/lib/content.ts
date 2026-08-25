import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import seedAberrations from "@/data/aberrations.json";
import seedLike from "@/data/like.json";
import seedSettings from "@/data/settings.json";
import seedFeatured from "@/data/featured.json";
import seedStoreCopy from "@/data/store-copy.json";
import seedFanart from "@/data/fanart.json";
import seedEpisodeMerch from "@/data/episode-merch.json";
import seedSiteText from "@/data/site-text.json";
import seedContributors from "@/data/contributors.json";

/**
 * Editable site content. The JSON files in src/data are the seed and the local-dev store;
 * in production (BLOB_READ_WRITE_TOKEN set) saves go to Vercel Blob and override the files without a deploy.
 */

export { ABERRATION_CLASSES, designationClasses } from "./aberrations";

export type Aberration = {
  slug: string;
  name: string;
  /** Episode it appears in; extra episodes go in `alsoIn` */
  episodeCode: string;
  alsoIn?: string[];
  /** Unit designation: ATPS-0457, Pending, Unknown, or a note like "Unknown - Confirmed CSQ. Assumed T." */
  designation: string;
  /** Person or thing the aberration attached itself to, or "N/A" */
  subject?: string;
  /** Spoiler-free one-liner; index cards and search snippets */
  teaser: string;
  /** Description (spoilers). Blank line between paragraphs. */
  entry: string;
  /** Notes (spoilers) */
  notes?: string;
  handling?: string;
  firstSeen?: string;
  related?: string[];
  aliases?: string[];
  /** Internal only; never rendered publicly */
  threat?: number;
  image?: string;
};

export const LIKE_KINDS = ["podcast", "tv", "film", "game", "book"] as const;
export type LikeKind = (typeof LIKE_KINDS)[number];

export type LikePage = {
  slug: string;
  name: string;
  /** What the other thing is; shows as a tag on the index */
  kind?: LikeKind;
  /** Episode code to start with, e.g. "S1 E1"; the start block links and plays it */
  startEpisode?: string;
  title: string;
  description: string;
  about: string;
  same: string[];
  different: string[];
  quote?: { text: string; who: string; role: string };
  start: string;
  /** Side-by-side table rows: label | theirs | ours */
  facts?: { label: string; theirs: string; ours: string }[];
  faq: { q: string; a: string }[];
};

export type Featured = { slugs: string[] };

export type SeasonStatus = "airing" | "finale" | "break" | "finished";
export type Settings = { seasonStatus: SeasonStatus; seasonLabel: string; seasonNote: string; promoEnabled: boolean; promoCode: string; promoText: string; hiddenPages?: string[]; nextSeasonLabel?: string; nextSeasonDate?: string };

/** Episode slug -> product slugs shown as "Items based on this episode" on that page. */
export type EpisodeMerch = Record<string, string[]>;
/** Id -> owner-written override for a piece of static site copy (see src/lib/site-text.ts). */
export type SiteText = Record<string, string>;
/** Art pieces and owner-written descriptions per contributor, keyed by person slug. */
export type ContributorArt = { id: string; url: string; title: string };
export type ContributorWork = { id: string; title: string; note?: string; url?: string };
/** Only the keys with a value are shown. */
export const SOCIAL_KEYS = ["website", "instagram", "bluesky", "tiktok", "twitter", "youtube", "imdb"] as const;
export type ContributorSocials = Partial<Record<(typeof SOCIAL_KEYS)[number], string>>;
export type Contributors = Record<string, { bio?: string; art?: ContributorArt[]; hidden?: boolean; photo?: string; works?: ContributorWork[]; socials?: ContributorSocials }>;
export type FanArt = { id: string; image: string; width: number; height: number; title: string; artist: string; postUrl: string; ts: number };
export type StoreCopy = Record<string, { description?: string; artist?: string; artistUrl?: string }>;
type Docs = { aberrations: Aberration[]; like: LikePage[]; featured: Featured; settings: Settings; storeCopy: StoreCopy; fanart: FanArt[]; episodeMerch: EpisodeMerch; siteText: SiteText; contributors: Contributors };
export type DocName = keyof Docs;

const FILES: Record<DocName, string> = {
  aberrations: "src/data/aberrations.json",
  like: "src/data/like.json",
  featured: "src/data/featured.json",
  settings: "src/data/settings.json",
  storeCopy: "src/data/store-copy.json",
  fanart: "src/data/fanart.json",
  episodeMerch: "src/data/episode-merch.json",
  siteText: "src/data/site-text.json",
  contributors: "src/data/contributors.json",
};
// Committed JSON is the seed everywhere; in prod it is what you get until a doc has been saved to Blob once.
const SEEDS: Docs = { aberrations: seedAberrations as Aberration[], like: seedLike as LikePage[], featured: seedFeatured as Featured, settings: seedSettings as Settings, storeCopy: seedStoreCopy as StoreCopy, fanart: seedFanart as FanArt[], episodeMerch: seedEpisodeMerch as EpisodeMerch, siteText: seedSiteText as SiteText, contributors: seedContributors as Contributors };

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const blobKey = (name: DocName) => `content/${name}.json`;

/**
 * The blob's public URL, derived from the RW token (vercel_blob_rw_<storeId>_...). Building it
 * ourselves skips list(), which is eventually consistent and can point at a pre-save snapshot.
 */
async function blobUrl(name: DocName): Promise<string | null> {
  const m = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  if (m) return `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/${blobKey(name)}`;
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: blobKey(name), limit: 1 });
  return blobs.find((x) => x.pathname === blobKey(name))?.url ?? null;
}

async function readRaw<N extends DocName>(name: N): Promise<Docs[N]> {
  if (useBlob()) {
    const url = await blobUrl(name);
    if (!url) return SEEDS[name];
    // ?v= busts the Blob CDN cache (it serves overwritten files stale for up to 30 days otherwise,
    // which made admin saves look like no-ops: the site revalidated, re-read the OLD doc, and
    // re-cached the pages). One uncached read per doc per minute is nothing.
    const r = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
    if (r.status === 404) return SEEDS[name];
    return (await r.json()) as Docs[N];
  }
  try {
    const txt = await fs.readFile(path.join(process.cwd(), FILES[name]), "utf8");
    return JSON.parse(txt) as Docs[N];
  } catch {
    return SEEDS[name];
  }
}

/** Read a content document (cached a minute; writes bust it immediately). */
export async function getDoc<N extends DocName>(name: N): Promise<Docs[N]> {
  return unstable_cache(() => readRaw(name), ["content", name], { revalidate: 60, tags: [`content:${name}`] })();
}

/** Write a content document, then refresh every page that depends on it. */
export async function setDoc<N extends DocName>(name: N, value: Docs[N]) {
  const body = JSON.stringify(value, null, 2) + "\n";
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    // allowOverwrite: the SDK (v1+) refuses to replace an existing pathname otherwise, so every save after the first would throw
    // cacheControlMaxAge 60: even if a CDN node ignores the ?v= buster, staleness is capped at a minute
    await put(blobKey(name), body, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
  } else {
    await fs.writeFile(path.join(process.cwd(), FILES[name]), body, "utf8");
  }
  revalidateTag(`content:${name}`);
  const paths: Record<DocName, (string | [string, "page" | "layout"])[]> = {
    aberrations: ["/aberrations", "/aberrations/[slug]", "/sitemap.xml"],
    like: ["/like", "/like/[slug]", "/sitemap.xml"],
    featured: ["/"],
    settings: [["/", "layout"]],
    storeCopy: [["/store", "layout"], ["/store/[slug]", "page"]],
    fanart: ["/", "/fan-art"],
    episodeMerch: [["/episodes/[slug]", "page"]],
    siteText: [["/", "layout"]],
    contributors: [["/cast/[slug]", "page"], "/cast"],
  };
  for (const p of paths[name]) {
    if (Array.isArray(p)) revalidatePath(p[0], p[1]);
    else revalidatePath(p, p.includes("[") ? "page" : undefined);
  }
}
