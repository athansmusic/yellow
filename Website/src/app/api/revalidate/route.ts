import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Curtain calls this when an episode is published or a transcript is locked, so the site updates
 * within seconds instead of waiting for the feed/transcript caches. Bearer REVALIDATE_SECRET.
 * Body (optional): { "what": "episodes" | "transcripts" | "catalog" | "all" }
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "REVALIDATE_SECRET not set" }, { status: 503 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { what?: string };
  const what = body.what ?? "all";
  if (what === "transcripts" || what === "all") revalidateTag("transcripts");
  // The store had no way to be told a product was added, so a new one waited on the 15-minute
  // window — and waited longer whenever the refresh behind it came back rate limited.
  if (what === "catalog" || what === "all") {
    revalidateTag("catalog");
    revalidatePath("/store", "layout");
  }
  if (what === "episodes" || what === "all") {
    revalidateTag("episodes");
    revalidatePath("/", "layout"); // episode pages, home, episodes list, sitemap, search index
  } else {
    revalidatePath("/episodes", "layout");
    revalidatePath("/admin/transcripts");
  }
  return NextResponse.json({ ok: true, what, at: new Date().toISOString() });
}
