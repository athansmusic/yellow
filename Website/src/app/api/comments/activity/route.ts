import { NextResponse } from "next/server";

/** Recent discussion and this member's reply notices, proxied to Curtain. */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

async function forward(method: "GET" | "POST", token: string) {
  const res = await fetch(`${CURTAIN}/api/public/comments/activity`, {
    method,
    headers: { "Content-Type": "application/json", "x-sc-token": token },
    cache: "no-store",
  });
  const j = await res.json();
  return NextResponse.json(j, { status: res.status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(req: Request) {
  try {
    return await forward("GET", req.headers.get("x-sc-token") ?? "");
  } catch {
    // An activity list that cannot load should leave the account page working.
    return NextResponse.json({ recent: [], notifications: [], unread: 0 }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    return await forward("POST", req.headers.get("x-sc-token") ?? "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
