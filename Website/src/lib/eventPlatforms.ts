import type { Episode } from "./feed";
import { LISTEN } from "./site";

type Links = { spotify?: string; apple?: string; patreon?: string };

/** "REDACTED Plays The House Edge (Part 2)" reads "Part 2". Titles with no parenthetical keep their own name. */
export const partLabel = (e: Episode) => e.shortTitle.match(/\(([^)]+)\)\s*$/)?.[1] ?? e.shortTitle;

/**
 * Where a Special Event part can be watched or heard: YouTube first, because the video is what the
 * page leads with, then every audio platform. Per-episode links where the platform has one, the
 * show-level link where it does not yet (a fresh drop takes a while to appear on Apple and Spotify).
 */
export function eventPlatforms(e: Episode, links: Links) {
  return [
    { name: "YouTube", href: `https://www.youtube.com/watch?v=${e.special?.video}`, icon: "youtube" as const },
    { name: "Spotify", href: links.spotify ?? LISTEN.spotify, icon: "spotify" as const },
    { name: "Apple Podcasts", href: links.apple ?? LISTEN.apple, icon: "apple" as const },
    { name: "Akouva", href: LISTEN.akouva, icon: "akouva" as const },
    { name: "RSS", href: e.acastUrl ?? LISTEN.rss, icon: "rss" as const },
    { name: "Patreon", href: links.patreon ?? LISTEN.patreon, icon: "patreon" as const },
  ];
}

/** A big call-to-action per event, for the thing the event is raising money or attention for. Keyed by event name. */
export const EVENT_CTA: Record<string, { label: string; href: string }> = {
  "The House Edge": { label: "The House Edge Kickstarter", href: "https://www.kickstarter.com/projects/hauntedtable/the-house-edge-paranormal-jailbreak-ttrpg/" },
};

/** "The House Edge" becomes the-house-edge, the event's page address under /events. */
export const eventSlug = (event: string) => event.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
