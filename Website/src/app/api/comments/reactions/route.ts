import { NextResponse } from "next/server";

/**
 * Reaction toggles, proxied to Curtain for the same reasons as the thread itself: no CORS to open,
 * and the member's Supporting Cast token never leaves this origin. Curtain decides who is reacting
 * from that token, so nobody can inflate a count on their own.
 */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("x-sc-token") ?? "";
  const body = await req.text();
  try {
    const res = await fetch(`${CURTAIN}/api/public/comments/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sc-token": token },
      body,
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json(j, { status: res.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not react. Try again." }, { status: 502 });
  }
}
