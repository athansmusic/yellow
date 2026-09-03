import { NextResponse } from "next/server";
import { LIVESTREAM } from "@/lib/schedule";

export const runtime = "nodejs";

const CHANNEL = new URL(LIVESTREAM.url).pathname.replace(/^\//, "");

type Live = { configured: boolean; live: boolean; title?: string; startedAt?: string; viewers?: number; channel: string };

// App access token (client credentials), kept in memory until shortly before it expires
let token: { value: string; exp: number } | null = null;
async function appToken(id: string, secret: string) {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`twitch token ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.value;
}

/** Is the show's Twitch channel live right now? Polled by the LiveDock; cached for a minute. */
export async function GET(req: Request) {
  // Dev only: /api/live?preview=1 fakes a live stream so the dock can be checked without streaming
  if (process.env.NODE_ENV !== "production" && new URL(req.url).searchParams.get("preview")) {
    return NextResponse.json({ configured: true, live: true, title: "REDACTED S2E1 premiere (preview)", startedAt: new Date().toISOString(), viewers: 117, channel: CHANNEL } satisfies Live);
  }
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  const headers = { "cache-control": "public, max-age=60, s-maxage=60" };
  if (!id || !secret) return NextResponse.json({ configured: false, live: false, channel: CHANNEL } satisfies Live, { headers });
  try {
    const t = await appToken(id, secret);
    const r = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(CHANNEL)}`, {
      headers: { "client-id": id, authorization: `Bearer ${t}` },
      next: { revalidate: 60 },
    });
    if (r.status === 401) token = null; // force a fresh token next time
    if (!r.ok) throw new Error(`twitch streams ${r.status}`);
    const j = (await r.json()) as { data: { title: string; started_at: string; viewer_count: number; type: string }[] };
    const s = j.data[0];
    const body: Live = s && s.type === "live" ? { configured: true, live: true, title: s.title, startedAt: s.started_at, viewers: s.viewer_count, channel: CHANNEL } : { configured: true, live: false, channel: CHANNEL };
    return NextResponse.json(body, { headers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ configured: true, live: false, channel: CHANNEL } satisfies Live, { headers });
  }
}
