import { NextResponse } from "next/server";
import { getAllItems, type Episode } from "@/lib/feed";

/**
 * Neighbors of an episode for the player: `next` (also used for autoplay when one ends) and
 * `prev`. Episodes walk season/number; Postmortems and minisodes walk their own kind by date.
 */
export async function GET(req: Request) {
  const guid = new URL(req.url).searchParams.get("guid");
  if (!guid) return NextResponse.json({ next: null, prev: null });
  const all = await getAllItems().catch(() => []);
  const cur = all.find((e) => e.guid === guid);
  if (!cur) return NextResponse.json({ next: null, prev: null });

  let next: Episode | undefined;
  let prev: Episode | undefined;
  if (cur.kind === "episode") {
    const ep = (delta: number) => all.find((e) => e.kind === "episode" && (e.season ?? 1) === (cur.season ?? 1) && e.number === (cur.number ?? 0) + delta);
    next = ep(1);
    prev = ep(-1);
  } else if (cur.kind === "postmortem" || cur.kind === "minisode") {
    // Same kind, ordered by date
    const same = all.filter((e) => e.kind === cur.kind).sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const i = same.findIndex((e) => e.guid === cur.guid);
    if (i >= 0) {
      next = same[i + 1];
      prev = same[i - 1];
    }
  }
  const pack = (e?: Episode) =>
    e ? { id: e.guid, title: e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title, subtitle: "[REDACTED]", src: e.audioUrl, image: e.image || "/brand/showart.jpeg", href: `/episodes/${e.slug}` } : null;
  return NextResponse.json({ next: pack(next), prev: pack(prev) });
}
