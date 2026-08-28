import "server-only";

/**
 * Curtain (the production CRM) is the source of truth for transcripts. Its public endpoint returns a
 * transcript only once the team has LOCKED it, so "has transcript" here means "locked in Curtain".
 * Cached an hour; Curtain pings /api/revalidate on lock/publish to refresh sooner.
 */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";
const SHOW_SLUG = "redacted";

export type TranscriptLine = { start: number; end: number; character: string; text: string };
export type Transcript = {
  show: { name: string };
  episode: { title: string; season: number; number: number; code: string; release_date: string | null; runtime_seconds: number | null };
  cast: { actor: string; characters: string[] }[];
  lines: TranscriptLine[];
};

/** "S1 E26" / "S1E26" -> "s1e26" (Curtain's code format); null for items without a code (Postmortem, minisodes). */
export function curtainCode(code?: string | null): string | null {
  const m = code?.match(/S\s*(\d+)\s*E\s*(\d+)/i);
  return m ? `s${Number(m[1])}e${Number(m[2])}` : null;
}

async function fetchTranscript(showSlug: string, c: string): Promise<Transcript | null> {
  try {
    const res = await fetch(`${CURTAIN}/api/public-transcript?slug=${showSlug}&code=${c}`, { next: { revalidate: 3600, tags: ["transcripts"] } });
    if (!res.ok) return null;
    const data = (await res.json()) as Transcript;
    return Array.isArray(data.lines) && data.lines.length ? data : null;
  } catch {
    return null;
  }
}

const normTitle = (t: string) =>
  t
    .toLowerCase()
    .replace(/^\s*postmortem\s*:\s*/, "")
    .replace(/\s*\(part\s*\d+\)\s*$/, "")
    .replace(/[^a-z0-9]+/g, "");

/**
 * Postmortem transcripts are a separate show in Curtain (slug "postmortem", numbered s1e1, s1e2, ...) and the
 * feed items on this site carry titles, not numbers. Walk the numbers once (cached), index by title.
 */
async function postmortemIndex(): Promise<Map<string, Transcript>> {
  const map = new Map<string, Transcript>();
  let misses = 0;
  for (let n = 1; n <= 80 && misses < 4; n++) {
    const t = await fetchTranscript("postmortem", `s1e${n}`);
    if (!t) {
      misses++;
      continue;
    }
    misses = 0;
    map.set(normTitle(t.episode.title), t);
  }
  return map;
}

/** Transcript for a Postmortem item, matched by title ("Postmortem: False Start" -> "False Start"). */
export async function getPostmortemTranscript(title?: string | null): Promise<Transcript | null> {
  if (!title) return null;
  return (await postmortemIndex()).get(normTitle(title)) ?? null;
}

export async function getTranscript(code?: string | null): Promise<Transcript | null> {
  const c = curtainCode(code);
  if (!c) return null;
  try {
    const res = await fetch(`${CURTAIN}/api/public-transcript?slug=${SHOW_SLUG}&code=${c}`, { next: { revalidate: 3600, tags: ["transcripts"] } });
    if (!res.ok) return null;
    const data = (await res.json()) as Transcript;
    return Array.isArray(data.lines) && data.lines.length ? data : null;
  } catch {
    return null;
  }
}

/** Cheap existence check (same cache as getTranscript). */
export async function hasLockedTranscript(code?: string | null): Promise<boolean> {
  return (await getTranscript(code)) !== null;
}

export type EpisodeMeta = {
  code: string;
  title: string;
  description: string | null;
  meta_description: string | null;
  writer?: string | null;
};

/**
 * Curtain owns each episode's meta description; it never reaches Acast, so the feed cannot carry it.
 * One request per show, indexed by both keys the site needs: main episodes resolve by code, and
 * Postmortem items only know their title. Tagged "episodes", so the same revalidate ping that picks
 * up a publish also picks up an edit here.
 */
async function metaIndex(showSlug: string): Promise<Map<string, EpisodeMeta>> {
  const map = new Map<string, EpisodeMeta>();
  try {
    const res = await fetch(`${CURTAIN}/api/public/episode-meta?slug=${showSlug}`, { next: { revalidate: 3600, tags: ["episodes"] } });
    if (!res.ok) return map;
    const data = (await res.json()) as { episodes?: EpisodeMeta[] };
    for (const e of data.episodes ?? []) {
      if (e.code) map.set(e.code, e);
      if (e.title) map.set(`t:${normTitle(e.title)}`, e);
    }
  } catch {
    /* Curtain down: the site falls back to the description it derives from the feed */
  }
  return map;
}

export async function getEpisodeMeta(kind: string, code?: string | null, title?: string | null): Promise<EpisodeMeta | null> {
  if (kind === "episode") {
    const c = curtainCode(code);
    return c ? ((await metaIndex(SHOW_SLUG)).get(c) ?? null) : null;
  }
  if (kind === "postmortem" && title) {
    return (await metaIndex("postmortem")).get(`t:${normTitle(title)}`) ?? null;
  }
  return null;
}
