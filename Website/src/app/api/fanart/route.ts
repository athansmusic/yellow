import { NextResponse } from "next/server";
import { setDoc, type FanArt } from "@/lib/content";

/**
 * The stream control server (Streamv2/control) pushes the APPROVED fan-art list here whenever the
 * owner approves or undoes a piece. Bearer token = FANART_TOKEN. The body replaces the whole list.
 */
export async function POST(req: Request) {
  const token = process.env.FANART_TOKEN;
  if (!token) return NextResponse.json({ error: "FANART_TOKEN not set" }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${token}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
  if (!body || !Array.isArray(body.items)) return NextResponse.json({ error: "Expected { items: [] }" }, { status: 400 });

  const ok = (v: unknown) => typeof v === "string" && v.length < 600;
  const items: FanArt[] = [];
  for (const raw of body.items as Record<string, unknown>[]) {
    if (!raw || !ok(raw.id) || !ok(raw.image) || !/^https:\/\/[a-z0-9.-]*media\.tumblr\.com\//.test(String(raw.image))) continue;
    items.push({
      id: String(raw.id),
      image: String(raw.image),
      width: Number(raw.width) || 0,
      height: Number(raw.height) || 0,
      title: ok(raw.title) ? String(raw.title) : "",
      artist: ok(raw.artist) ? String(raw.artist) : "",
      postUrl: ok(raw.post_url ?? raw.postUrl) ? String(raw.post_url ?? raw.postUrl) : "",
      ts: Number(raw.ts) || 0,
    });
  }
  items.sort((a, b) => b.ts - a.ts);
  await setDoc("fanart", items.slice(0, 200));
  return NextResponse.json({ ok: true, count: items.length });
}
