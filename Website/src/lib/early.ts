import "server-only";
import { getAllItems } from "@/lib/feed";
import { PRIVATE_EPISODE_GUIDS, privateGuidFor } from "@/lib/private-episodes";

/**
 * Episodes that exist for members before they exist for everyone.
 *
 * An episode reaches Supporting Cast days before the public Acast feed, and the site builds its
 * pages from the public feed — so for that window there is no page at all, and the early link goes
 * nowhere. This fills the gap.
 *
 * The details come from Supporting Cast's own player API, keyed by the guid already in
 * private-episodes.ts. That endpoint answers without authentication, so nothing secret is needed
 * here and no private feed URL goes anywhere near the repo or the browser. It also means the copy
 * shown on an early page is the copy THEY hold, which is the same thing the member's app shows.
 */
export type EarlyEpisode = {
  slug: string;
  guid: string;
  title: string;
  description: string;
  image: string | null;
  duration: number | null;
};

type PlayerConfig = {
  success?: boolean;
  episode?: { title?: string; description?: string; duration?: number; image_url?: string };
  feed?: { image_url?: string };
};

async function fetchConfig(guid: string): Promise<PlayerConfig | null> {
  const qs = new URLSearchParams({
    feed_uuid: "",
    episode_guid: guid,
    episode_uuid: "",
    free_feed_uuid: "",
    free_episode_guid: "",
    free_episode_uuid: "",
    video_uuid: "",
    redirect_url: "",
  });
  try {
    const res = await fetch(`https://player-api.supportingcast.fm/player/config?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "Supportingcast-Player-User-Agent": `SupportingCast Player/0.1.0 (host=theredactedunit.com; episode_guid=${guid})`,
      },
      // Early windows are days long and this is one small request, so an hour is plenty.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PlayerConfig;
  } catch {
    return null;
  }
}

/** Slugs we hold a member guid for that the public feed does not know about yet. */
export async function earlySlugs(): Promise<string[]> {
  let published: Set<string>;
  try {
    published = new Set((await getAllItems()).map((e) => e.slug));
  } catch {
    // Without the public feed we cannot tell early from released, and guessing wrong would hide
    // every published episode behind a join wall. Show nothing instead.
    return [];
  }
  return Object.keys(PRIVATE_EPISODE_GUIDS).filter((s) => !published.has(s));
}

/**
 * The early episode at this slug, or null if it is published, unknown, or their API declines.
 * Never returns an audio URL: playback goes through their player, for members only.
 */
export async function getEarlyEpisode(slug: string): Promise<EarlyEpisode | null> {
  const guid = privateGuidFor(slug);
  if (!guid) return null;

  try {
    if ((await getAllItems()).some((e) => e.slug === slug)) return null;
  } catch {
    return null;
  }

  const cfg = await fetchConfig(guid);
  if (!cfg?.success || !cfg.episode?.title) return null;

  return {
    slug,
    guid,
    title: cfg.episode.title,
    description: cfg.episode.description ?? "",
    image: cfg.episode.image_url ?? cfg.feed?.image_url ?? null,
    duration: typeof cfg.episode.duration === "number" ? cfg.episode.duration : null,
  };
}
