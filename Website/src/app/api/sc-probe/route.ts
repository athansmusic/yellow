import { NextResponse } from "next/server";

/**
 * Server half of the Supporting Cast diagnostic.
 *
 * The member's private RSS cannot be read from the browser — their CDN sends no CORS headers — but
 * a server can fetch it. This answers the question the browser could not: does that feed carry
 * Supporting Cast's episode uuid per item? If it does, one fetch builds the whole slug -> uuid map
 * and it stays current by itself.
 *
 * The member's token arrives from their browser and is used once, in memory, against Supporting
 * Cast. It is never logged, never stored, and never returned. The personal feed URL is redacted in
 * the response for the same reason: it is effectively a subscription credential.
 */
export const dynamic = "force-dynamic";

const PK =
  "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN";

const first = (s: string, re: RegExp) => (s.match(re) || [])[1]?.trim() ?? "";

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "no token" }, { status: 400 });

  const feedsRes = await fetch("https://widget-api.supportingcast.fm/feeds", {
    headers: {
      "Supportingcast-Widget-Publishable-Key": PK,
      "Supportingcast-Widget-Access-Token": token,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!feedsRes.ok) {
    return NextResponse.json({ step: "feeds", status: feedsRes.status }, { status: 200 });
  }
  const feeds = (await feedsRes.json()) as { feeds?: { uuid?: string; tokenized_setup_url?: string; url?: string }[] };
  const feed = feeds.feeds?.[0];
  const rss = feed?.tokenized_setup_url || feed?.url;
  if (!rss) return NextResponse.json({ step: "no rss url on the feed record" }, { status: 200 });

  const rssRes = await fetch(rss, { cache: "no-store", headers: { "user-agent": "theredactedunit.com" } });
  if (!rssRes.ok) {
    return NextResponse.json({ step: "rss", status: rssRes.status }, { status: 200 });
  }
  const xml = await rssRes.text();

  const items = xml.split("<item>").slice(1);
  const sample = items.slice(0, 3).map((it) => {
    const title = first(it, /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const guid = first(it, /<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/);
    const enclosure = first(it, /<enclosure[^>]*url="([^"]+)"/);
    let host = "";
    try {
      host = new URL(enclosure).host;
    } catch {}
    return {
      title,
      guid,
      guidLooksLikeUuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guid),
      enclosureHost: host,
      // Never the full URL: it plays without any further auth.
      enclosurePathLength: enclosure.length,
    };
  });

  // Any uuid-shaped strings anywhere in an item tell us where the id might be hiding.
  const uuidsInFirstItem = Array.from(
    new Set((items[0] ?? "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? []),
  ).slice(0, 5);

  return NextResponse.json(
    { itemCount: items.length, feedUuid: feed?.uuid ?? null, sample, uuidsInFirstItem },
    { headers: { "Cache-Control": "no-store" } },
  );
}
