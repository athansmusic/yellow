/**
 * Per-episode links on other platforms, matched by title (case-insensitive),
 * the same way the old UpdateEpisodes script did it.
 *
 * - Apple: public iTunes lookup, no credentials needed.
 * - Spotify: needs SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET (client-credentials flow).
 * - Patreon: needs PATREON_ACCESS_TOKEN.
 * Missing credentials simply mean that platform's per-episode link is omitted
 * and the show-level link is used instead.
 */
import { LISTEN } from "./site";

type LinkMap = Record<string, string>;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

async function appleLinks(): Promise<LinkMap> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${LISTEN.appleShowId}&entity=podcastEpisode&limit=300`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as { results?: { wrapperType: string; trackName: string; trackViewUrl: string }[] };
    const out: LinkMap = {};
    for (const r of data.results ?? []) {
      if (r.wrapperType === "podcastEpisode" && r.trackName && r.trackViewUrl) out[norm(r.trackName)] = r.trackViewUrl;
    }
    return out;
  } catch {
    return {};
  }
}

async function spotifyLinks(): Promise<LinkMap> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return {};
  try {
    const tok = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      next: { revalidate: 3000 },
    });
    if (!tok.ok) return {};
    const { access_token } = (await tok.json()) as { access_token: string };
    const out: LinkMap = {};
    let url: string | null = `https://api.spotify.com/v1/shows/${LISTEN.spotifyShowId}/episodes?limit=50&market=US`;
    while (url) {
      const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` }, next: { revalidate: 3600 } });
      if (!res.ok) break;
      const data = (await res.json()) as { items: ({ name: string; external_urls: { spotify: string } } | null)[]; next: string | null };
      for (const it of data.items) if (it?.name && it.external_urls?.spotify) out[norm(it.name)] = it.external_urls.spotify;
      url = data.next;
    }
    return out;
  } catch {
    return {};
  }
}

async function patreonLinks(): Promise<LinkMap> {
  const token = process.env.PATREON_ACCESS_TOKEN;
  if (!token) return {};
  try {
    const out: LinkMap = {};
    let url: string | null =
      `https://www.patreon.com/api/oauth2/v2/campaigns/${LISTEN.patreonCampaignId}/posts?fields%5Bpost%5D=title,url&page%5Blimit%5D=50`;
    while (url) {
      const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } });
      if (!res.ok) break;
      const data = (await res.json()) as { data: { attributes: { title: string; url: string } }[]; links?: { next?: string } };
      for (const p of data.data) {
        const t = p.attributes?.title;
        const u = p.attributes?.url;
        if (t && u) out[norm(t)] = u.startsWith("http") ? u : `https://www.patreon.com${u}`;
      }
      url = data.links?.next ?? null;
    }
    return out;
  } catch {
    return {};
  }
}

/** Does tru.show have a transcript for this episode slug? Missing ones render a generic "Transcript" title. Cached 6h. */
export async function hasTranscript(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.tru.show/transcripts/redacted/${slug}`, { next: { revalidate: 21600 } });
    if (!res.ok) return false;
    const html = (await res.text()).slice(0, 20000);
    return /<title>\s*Transcripts? for /i.test(html);
  } catch {
    return false;
  }
}

export type PlatformLinks = { spotify?: string; apple?: string; patreon?: string };

export async function getPlatformLinks(title: string): Promise<PlatformLinks> {
  const [apple, spotify, patreon] = await Promise.all([appleLinks(), spotifyLinks(), patreonLinks()]);
  const k = norm(title);
  // Patreon post titles sometimes drop the "S1E26:" prefix; try both.
  const alt = norm(title.replace(/^S\d+E\d+\s*:\s*/i, ""));
  return {
    apple: apple[k] ?? apple[alt],
    spotify: spotify[k] ?? spotify[alt],
    patreon: patreon[k] ?? patreon[alt],
  };
}
