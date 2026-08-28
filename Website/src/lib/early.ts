import "server-only";
import { episodeFromParts, getAllItems, slugify, type Episode } from "@/lib/feed";
import { allEpisodeMeta, type EpisodeMeta } from "@/lib/curtain";
import { privateGuidFor } from "@/lib/private-episodes";

/**
 * Episodes that exist for members before they exist for everyone.
 *
 * Curtain is what publishes to Acast, so it holds the description, the cast and the content
 * warnings it sent — and it holds them for an episode Acast has only SCHEDULED, which is precisely
 * the window where the public RSS has nothing and the early link would otherwise go nowhere.
 * Nothing here reads a second feed, and nothing here needs a secret.
 *
 * The page is built and then hidden: when the schedule fires, the episode appears in the public
 * feed, the published copy wins, and the page unlocks itself with no action taken anywhere.
 */

/** Curtain's shows, in the same shape as feed kinds. */
const SHOWS = [
  { slug: "redacted", kind: "episode" as const },
  { slug: "postmortem", kind: "postmortem" as const },
];

function toEpisode(m: EpisodeMeta, kind: "episode" | "postmortem"): Episode | null {
  const title = (m.title ?? "").trim();
  if (!title) return null;

  // Rebuild the notes in the shape the feed would have carried, so the site's own parser produces
  // exactly the episode it will produce next week from Acast — same summary, cast and warnings.
  const cast = (m.cast ?? "")
    .split("\n")
    .map((l) => l.trim().replace(/^[*\-]\s*/, ""))
    .filter(Boolean);
  const parts = [`<p>${m.description ?? ""}</p>`];
  if (cast.length) parts.push(`<p>Starring:</p><ul>${cast.map((c) => `<li>${c}</li>`).join("")}</ul>`);
  if (m.content_warnings) parts.push(`<p>Content Warnings:</p><p>${m.content_warnings}</p>`);

  const full = kind === "episode" ? `${(m.code ?? "").toUpperCase().replace(/^S(\d+)E/, "S$1E")}: ${title}` : `Postmortem: ${title}`;

  return episodeFromParts({
    title: full,
    descHtml: parts.join(""),
    // Their id on the members' feed, so the play button and MemberAudio agree on which track the
    // adopted element carries. Falls back to the checked-in map for episodes published before
    // Curtain started recording it.
    guid: m.private_episode_id || privateGuidFor(kind === "episode" ? (m.code ?? "") : `postmortem-${slugify(title)}`) || `curtain-${m.code || slugify(title)}`,
  });
}

/** Everything Curtain knows about that the public feed has not carried yet. */
export async function getEarlyEpisodes(): Promise<Episode[]> {
  let published: Set<string>;
  try {
    published = new Set((await getAllItems()).map((e) => e.slug));
  } catch {
    // Without the public feed we cannot tell early from released, and guessing wrong would put a
    // join wall on a published episode. Show nothing.
    return [];
  }

  const lists = await Promise.all(
    SHOWS.map(async (s) => (await allEpisodeMeta(s.slug).catch(() => [])).map((m) => toEpisode(m, s.kind))),
  );

  const out: Episode[] = [];
  const seen = new Set<string>();
  for (const ep of lists.flat()) {
    // An episode with no cast is one Curtain has a row for but never published — there is no page
    // to make from it, and a title alone would announce an episode that does not exist yet.
    if (!ep || published.has(ep.slug) || seen.has(ep.slug) || !ep.starring.length) continue;
    seen.add(ep.slug);
    out.push(ep);
  }
  return out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/** The early episode at this slug, or null if it is already public, or unknown. */
export async function getEarlyEpisode(slug: string): Promise<Episode | null> {
  return (await getEarlyEpisodes()).find((e) => e.slug === slug) ?? null;
}

export async function earlySlugs(): Promise<string[]> {
  return (await getEarlyEpisodes()).map((e) => e.slug);
}

/** The members'-feed guid for any episode, for Supporting Cast's player. */
export async function memberGuid(slug: string): Promise<string | null> {
  return privateGuidFor(slug);
}
