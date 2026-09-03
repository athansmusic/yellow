/**
 * Episode guids on the members' feed, keyed by this site's episode slug.
 *
 * These are the RSS <guid> values from the private Acast feed that Supporting Cast ingests — their
 * feed record points `feed_url` straight at it, so this is their own key namespace, not a way
 * around them. Their player takes one as `data-episode-guid`, resolves it through
 * player-api.supportingcast.fm, and decides entitlement itself.
 *
 * Every entry below was verified against their API before being written here: each guid was sent
 * to player/config unauthenticated and had to come back `success: true` with a title matching the
 * feed. All 54 passed. feed_uuid is optional — the response returns it — so it is not needed here.
 *
 * A guid identifies an episode and grants nothing. The FEED URL is the sensitive part: that feed is
 * unlisted rather than protected, and its enclosures serve ad-free audio to anyone who asks with no
 * authentication at all. So the URL stays out of this repo and out of the browser; only these
 * opaque ids ship to the client.
 *
 * Regenerating: read the private feed, classify each title with the same rules as feed.ts, and
 * re-verify every guid against player/config. Do not hand-edit.
 */
export const PRIVATE_EPISODE_GUIDS: Record<string, string> = {
  "s1e1": "6a3e061d26d5a6687a769b34", // S1E1: False Start (Part 1)
  "s1e2": "6a3e062589bd872840a57be4", // S1E2: False Start (Part 2)
  "s1e3": "6a3e062813f23e0ab60597b7", // S1E3: False Start (Part 3)
  "s1e4": "6a3e062b26d5a6687a769e7e", // S1E4: Skin
  "s1e5": "6a3e062ea3fa978237429ca3", // S1E5: Shoeless Man
  "s1e6": "6a3e063089bd872840a57e13", // S1E6: Wallpaper
  "s1e7": "6a3e0633cb67fc75eabba443", // S1E7: Forest
  "s1e8": "6a3e063613f23e0ab6059a4e", // S1E8: A Very REDACTED Holiday Special
  "s1e9": "6a3e063989bd872840a5802a", // S1E9: Plaster Pigs
  "s1e10": "6a3e05ff13f23e0ab6058ece", // S1E10: Brood
  "s1e11": "6a3e0601a3fa9782374292fd", // S1E11: Home Sweet Home
  "s1e12": "6a3e060426d5a6687a76959e", // S1E12: Hound
  "s1e13": "6a3e0607a3fa978237429444", // S1E13: Aqueduct (Part 1)
  "s1e14": "6a3e060a26d5a6687a7696c3", // S1E14: Aqueduct (Part 2)
  "s1e15": "6a3e060ca3fa978237429584", // S1E15: Gnome
  "s1e16": "6a3e060fcb67fc75eabb9ccf", // S1E16: Don't Eat the Seeds
  "s1e17": "6a3e0614cb67fc75eabb9de6", // S1E17: The Grange
  "s1e18": "6a3e06170ad3211686ce25aa", // S1E18: Vestige
  "s1e19": "6a3e061acb67fc75eabb9f0c", // S1E19: Hooked on Phonics
  "s1e20": "6a3e06200ad3211686ce278e", // S1E20: Toby's Tunnel of Terror
  "s1e21": "6a3e062226d5a6687a769c86", // S1E21: Nightfisher
  "s1e22": "6a3ecfa5cb67fc75eafb9b84", // S1E22: Glow Worm
  "s1e23": "6a4704272d7a15a97957d3b2", // S1E23: Buzzies
  "s1e24": "6a5978e5461a6a4190f6cf80", // S1E24: Prodigy (Part 1)
  "s1e25": "6a62b47e44c9eabf3cd5bc58", // S1E25: Prodigy (Part 2)
  "s1e26": "6a6b793a87f5f77b02418b30", // S1E26: Clickolding
  "s1e27": "6a7e65e7f8e81c4395aeba79", // S1E27: Watchtower
  "s1e28": "6a8861e8e96a6b6c19079308", // S1E28: Loose Ends (Part 1)
  "s1e29": "6a90ddf61f4e42764d32556b", // S1E29: Loose Ends (Part 2)

  "postmortem-a-very-redacted-holiday-special": "6a3e065426d5a6687a76ab12", // Postmortem: A Very REDACTED Holiday Special
  "postmortem-aqueduct": "6a3e063e89bd872840a58158", // Postmortem: Aqueduct
  "postmortem-brood": "6a3e06580ad3211686ce343c", // Postmortem: Brood
  "postmortem-buzzies": "6a4d5e0c195f863605d5ffda", // Postmortem: Buzzies
  "postmortem-clickolding": "6a6b7de86e736c293d8c55f7", // Postmortem: Clickolding
  "postmortem-dont-eat-the-seeds": "6a3e064289bd872840a5822e", // Postmortem: Don't Eat the Seeds
  "postmortem-false-start": "6a3e064c26d5a6687a76a6a8", // Postmortem: False Start
  "postmortem-forest": "6a3e0653a3fa97823742a4ab", // Postmortem: Forest
  "postmortem-glow-worm": "6a45b649e80d75fcb8a06a2a", // Postmortem: Glow Worm
  "postmortem-gnome": "6a3e0640cb67fc75eabba730", // Postmortem: Gnome
  "postmortem-home-sweet-home": "6a3e065acb67fc75eabbafd8", // Postmortem: Home Sweet Home
  "postmortem-hooked-on-phonics": "6a3e064689bd872840a5832e", // Postmortem: Hooked on Phonics
  "postmortem-hound": "6a3e063ca3fa978237429f93", // Postmortem: Hound
  "postmortem-loose-ends": "6a8e04b1d96ec0ba189287a2", // Postmortem: Loose Ends
  "postmortem-nightfisher": "6a3e064a26d5a6687a76a61f", // Postmortem: Nightfisher
  "postmortem-plaster-pigs": "6a3e06560ad3211686ce338c", // Postmortem: Plaster Pigs
  "postmortem-prodigy-part-1": "6a600ce01fed88da55e2f130", // Postmortem: Prodigy (Part 1)
  "postmortem-prodigy-part-2": "6a69289e89139487960a3ba5", // Postmortem: Prodigy (Part 2)
  "postmortem-shoeless-man": "6a3e0650a3fa97823742a3e0", // Postmortem: Shoeless Man
  "postmortem-skin": "6a3e064ecb67fc75eabbaa76", // Postmortem: Skin
  "postmortem-the-grange": "6a3e0643cb67fc75eabba7ef", // Postmortem: The Grange
  "postmortem-tobys-tunnel-of-terror": "6a3e06480ad3211686ce2fc7", // Postmortem: Toby's Tunnel of Terror
  "postmortem-vestige": "6a3e0645a3fa97823742a185", // Postmortem: Vestige
  "postmortem-wallpaper": "6a3e065126d5a6687a76aa54", // Postmortem: Wallpaper
  "postmortem-watchtower": "6a850f77b9d83ea9cc180add", // Postmortem: Watchtower
};

export function privateGuidFor(slug: string): string | null {
  return PRIVATE_EPISODE_GUIDS[slug] ?? null;
}
