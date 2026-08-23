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
