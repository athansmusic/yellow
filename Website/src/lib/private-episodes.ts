/**
 * Episode guids on the members' feed, keyed by this site's episode slug.
 *
 * These are the RSS <guid> values from the private Acast feed that Supporting Cast ingests — their
 * feed record points `feed_url` straight at it, so this is their own key namespace, not a way
 * around them. Their player takes one as `data-episode-guid`, resolves it through
 * player-api.supportingcast.fm, and decides entitlement itself.
 *
 * Verified against their API, unauthenticated:
 *   GET player/config?episode_guid=6a7e65e7f8e81c4395aeba79
 *   -> success: true, episode "S1E27: Watchtower", duration 1733
 * feed_uuid is optional — the response returns it — so it is not needed here.
 *
 * A guid identifies an episode and grants nothing. The FEED URL is the sensitive part: that feed is
 * unlisted rather than protected, and its enclosures serve ad-free audio to anyone who asks with no
 * authentication at all. So the URL stays out of this repo and out of the browser; only these
 * opaque ids ship to the client.
 *
 * Deliberately one episode. This is the trial run for whether driving their player from our bar
 * still registers as a play on their side; the rest follow once that answer is in.
 */
export const PRIVATE_EPISODE_GUIDS: Record<string, string> = {
  s1e27: "6a7e65e7f8e81c4395aeba79",
};

export function privateGuidFor(slug: string): string | null {
  return PRIVATE_EPISODE_GUIDS[slug] ?? null;
}
