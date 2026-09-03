import { NextResponse } from "next/server";
import { getAllItems, type Episode } from "@/lib/feed";

export type ListenOrder = "full" | "redacted" | "postmortem";

/**
 * Player neighbors under a listen order:
 *  - full:       REDACTED episodes + Postmortems + minisodes, by release date (no Seven Planes)
 *  - redacted:   episodes and minisodes (no Postmortems), by release date
 *  - postmortem: Postmortems only, by release date
 * Also drives autoplay when an episode ends.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const guid = url.searchParams.get("guid");
  const order = (url.searchParams.get("order") as ListenOrder) || "full";
  if (!guid) return NextResponse.json({ next: null, prev: null });
  const all = await getAllItems().catch(() => []);
  const cur = all.find((e) => e.guid === guid);
  if (!cur) return NextResponse.json({ next: null, prev: null });

  const byDate = (a: Episode, b: Episode) => +new Date(a.date) - +new Date(b.date);
  let list: Episode[];
  if (order === "redacted") {
    list = all.filter((e) => (e.kind === "episode" || e.kind === "minisode") && !e.guid.startsWith("t7p-")).sort(byDate);
  } else if (order === "postmortem") {
    list = all.filter((e) => e.kind === "postmortem").sort(byDate);
  } else {
    list = all.filter((e) => (e.kind === "episode" || e.kind === "postmortem" || e.kind === "minisode") && !e.guid.startsWith("t7p-")).sort(byDate);
  }

  const i = list.findIndex((e) => e.guid === cur.guid);
  let prev: Episode | undefined;
  let next: Episode | undefined;
  if (i >= 0) {
    prev = list[i - 1];
    next = list[i + 1];
  } else {
    // Current track isn't part of this order (e.g. a minisode while in REDACTED mode):
    // bridge by release date so play continues into the selected order.
    prev = [...list].reverse().find((e) => +new Date(e.date) < +new Date(cur.date));
    next = list.find((e) => +new Date(e.date) > +new Date(cur.date));
  }

  const pack = (e?: Episode) =>
    e ? { id: e.guid, title: e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title, subtitle: "REDACTED", src: e.audioUrl, image: e.image || "/brand/showart.jpeg", href: `/episodes/${e.slug}` } : null;
  return NextResponse.json({ next: pack(next), prev: pack(prev) });
}
