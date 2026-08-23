import { NextResponse } from "next/server";
import { getAllItems } from "@/lib/feed";

/** Next thing to autoplay after an episode: the next numbered episode, otherwise nothing. */
export async function GET(req: Request) {
  const guid = new URL(req.url).searchParams.get("guid");
  if (!guid) return NextResponse.json({ next: null });
  const all = await getAllItems().catch(() => []);
  const cur = all.find((e) => e.guid === guid);
  if (!cur) return NextResponse.json({ next: null });

  let next;
  if (cur.kind === "episode") {
    next = all.find((e) => e.kind === "episode" && (e.season ?? 1) === (cur.season ?? 1) && e.number === (cur.number ?? 0) + 1);
  } else if (cur.kind === "postmortem" || cur.kind === "minisode") {
    // Same kind, next by date
    const same = all.filter((e) => e.kind === cur.kind).sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const i = same.findIndex((e) => e.guid === cur.guid);
    next = i >= 0 ? same[i + 1] : undefined;
  }
  if (!next) return NextResponse.json({ next: null });
  return NextResponse.json({
    next: { id: next.guid, title: next.kind === "episode" ? `${next.code}: ${next.shortTitle}` : next.title, subtitle: "[REDACTED]", src: next.audioUrl, image: next.image || "/brand/showart.jpeg", href: `/episodes/${next.slug}` },
  });
}
