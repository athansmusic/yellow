import { NextResponse } from "next/server";

/**
 * Episode comments, proxied to Curtain.
 *
 * Same-origin on purpose. The browser talking straight to Curtain would need CORS opened on a
 * public API and would put the member's Supporting Cast token on a cross-origin request; going
 * through here keeps both problems from existing. Curtain is where the database is — this site has
 * only Vercel Blob, whose overwrites serve stale for weeks.
 *
 * No membership check happens here. Curtain asks Supporting Cast who the token belongs to and
 * refuses if the answer is nobody; a check on this side would be one a caller could skip by
 * addressing Curtain directly.
 */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  try {
    const res = await fetch(`${CURTAIN}/api/public/comments?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json(j, { status: res.status });
  } catch {
    // A thread that cannot load should leave the page working, not break it.
    return NextResponse.json({ comments: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const token = req.headers.get("x-sc-token") ?? "";
  const body = await req.text();
  try {
    const res = await fetch(`${CURTAIN}/api/public/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sc-token": token },
      body,
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json(j, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Could not post that. Try again." }, { status: 502 });
  }
}
