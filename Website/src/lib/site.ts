export const SITE = {
  name: "REDACTED",
  tagline: "A Horror Comedy Audio Show",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://theredactedunit.com",
  email: "crew@theredactedunit.com",
  schedule: "Fridays 9/8c",
  studio: { name: "Hush Studios", url: "https://hushstudios.co/" },
  network: { name: "Rusty Quill", url: "https://rustyquill.com/" },
  showArtist: { name: "7cfc00", url: "https://www.instagram.com/7cfc00art/" },
};

export const FEEDS = {
  redacted: "https://feeds.acast.com/public/shows/68dfd04b043c361f82e093c0",
  sevenPlanes: "https://feeds.acast.com/public/shows/68e2c02b5f95c3d4193a1538",
};

export const LISTEN = {
  spotify: "https://open.spotify.com/show/21ELGMQm084YVNCRqjqGJz",
  apple: "https://podcasts.apple.com/us/podcast/redacted/id1848745811",
  rss: FEEDS.redacted,
  patreon: "https://www.patreon.com/theredactedunit",
  youtube: "https://www.youtube.com/@hushstudiosofficial",
  acast: "https://shows.acast.com/redacted",
  akouva: "https://listen.akouva.com/pages/podcast_details.php?id=50",
  appleShowId: "1848745811",
  spotifyShowId: "21ELGMQm084YVNCRqjqGJz",
  patreonCampaignId: "12767029",
};

/** Listen buttons used by the home hero and the "If you like" pages. */
export const LISTEN_BUTTONS = [
  { name: "Spotify", href: LISTEN.spotify, icon: "spotify" },
  { name: "Apple Podcasts", href: LISTEN.apple, icon: "apple" },
  { name: "Akouva", href: LISTEN.akouva, icon: "akouva" },
  { name: "YouTube", href: LISTEN.youtube, icon: "youtube" },
  { name: "RSS", href: LISTEN.rss, icon: "rss" },
] as const;

export const T7P_LISTEN = {
  spotify: "https://open.spotify.com/show/1KbvIbGaohctCN8NVwRT32",
  apple: "https://podcasts.apple.com/gb/podcast/the-seven-planes/id1848749565",
  rss: FEEDS.sevenPlanes,
};

export const SOCIAL = [
  { name: "Patreon", href: "https://patreon.com/TheRedactedUnit", icon: "patreon" },
  { name: "Discord", href: "/discord", icon: "discord" },
  { name: "X", href: "https://x.com/TheRedactedUnit", icon: "x" },
  { name: "Bluesky", href: "https://bsky.app/profile/theredactedunit.com", icon: "bluesky" },
  { name: "YouTube", href: "https://www.youtube.com/@hushstudiosofficial", icon: "youtube" },
  { name: "TikTok", href: "https://www.tiktok.com/@theredactedunit", icon: "tiktok" },
] as const;

export const NAV = [
  { label: "Episodes", href: "/episodes" },
  { label: "Cast", href: "/cast" },
  { label: "Store", href: "/store" },
] as const;

/** Secondary pages, under "More" in the header and listed in the mobile drawer. */
export const MORE_NAV = [
  { label: "Where to listen", href: "/where" },
  { label: "Aberrations", href: "/aberrations" },
  { label: "If you like…", href: "/like" },
  { label: "Contributors", href: "/contributors" },
  { label: "Fan art", href: "/fan-art" },
  { label: "About", href: "/about" },
  { label: "Bingo", href: "/bingo" },
  { label: "FAQ", href: "/faq" },
  { label: "Partner with us", href: "/partner" },
  { label: "Supporter wall", href: "/supporter-wall" },
] as const;

export const EXTERNAL = {
  /** Fan-run wiki (not official, not canon) */
  wiki: "https://theredactedunit.miraheze.org/",
  kickstarter: "/ks",
  whatsOnMars: "https://www.youtube.com/playlist?list=PLnKcUvxEvEXooA0CKLNBSfbRz-UcazIBZ",
  goodpods: "https://goodpods.com/podcasts/redacted-712167",
  trailerYouTubeId: "c5JSMQpgXZc",
  postmortemTrailerYouTubeId: "RDWCAfHyMq0",
  t7pTrailerYouTubeId: "k7JGgzqKpR0",
  newsletterApi: "https://www.opencurtain.app/api/contacts/subscribe",
  // Aggregate-only stats feed published daily by the RedactedStats collector
  // (Supabase Storage, public bucket). Data runs through yesterday; the
  // collector re-verifies the last week daily, so recent days can restate.
  statsFeed: "https://vuafrblbvvweznxrczhs.supabase.co/storage/v1/object/public/public-stats/stats.json",
  // Legacy manual sheet: still supplies hours consumed / avg Twitch viewers,
  // which the automated feed doesn't track.
  partnerStatsCsv:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRlIKfsRhRQ-fp32Z1JDBIIXapNUaL9_3Nb33UIMQ0RvxcarO0jyIOV64sf9Api20c4nK0ntjOqIcXX/pub?output=csv",
  discordCountApi: "https://discordusers.athan-438.workers.dev/",
};

/** Shown on the store terms and privacy pages. Bump when either policy changes. */
export const POLICY_UPDATED = "August 23, 2026";
