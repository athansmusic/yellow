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
export type Settings = { seasonStatus: SeasonStatus; seasonLabel: string; seasonNote: string; promoEnabled: boolean; promoCode: string; promoText: string; hiddenPages?: string[] };

export type FanArt = { id: string; image: string; width: number; height: number; title: string; artist: string; postUrl: string; ts: number };
export type StoreCopy = Record<string, { description?: string; artist?: string; artistUrl?: string }>;
type Docs = { aberrations: Aberration[]; like: LikePage[]; featured: Featured; settings: Settings; storeCopy: StoreCopy; fanart: FanArt[] };
export type DocName = keyof Docs;

const FILES: Record<DocName, string> = {
  aberrations: "src/data/aberrations.json",
  like: "src/data/like.json",
  featured: "src/data/featured.json",
  settings: "src/data/settings.json",
  storeCopy: "src/data/store-copy.json",
  fanart: "src/data/fanart.json",
};
// Committed JSON is the seed everywhere; in prod it is what you get until a doc has been saved to Blob once.
const SEEDS: Docs = { aberrations: seedAberrations as Aberration[], like: seedLike as LikePage[], featured: seedFeatured as Featured, settings: seedSettings as Settings, storeCopy: seedStoreCopy as StoreCopy, fanart: seedFanart as FanArt[] };

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const blobKey = (name: DocName) => `content/${name}.json`;

async function readRaw<N extends DocName>(name: N): Promise<Docs[N]> {
  if (useBlob()) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: blobKey(name), limit: 1 });
    const b = blobs.find((x) => x.pathname === blobKey(name));
    if (!b) return SEEDS[name];
    const r = await fetch(b.url, { cache: "no-store" });
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
    await put(blobKey(name), body, { access: "public", addRandomSuffix: false, contentType: "application/json" });
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
  };
  for (const p of paths[name]) {
    if (Array.isArray(p)) revalidatePath(p[0], p[1]);
    else revalidatePath(p, p.includes("[") ? "page" : undefined);
  }
}
