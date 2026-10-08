import { NextResponse } from "next/server";

/** Supporter-wall listings, proxied to Curtain. Same reasons as comments: no CORS, token stays here. */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = req.headers.get("x-sc-token") ?? "";
  try {
    const res = await fetch(`${CURTAIN}/api/public/wall`, {
      headers: token ? { "x-sc-token": token } : {},
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json(j, { status: res.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    // A wall that cannot load should leave the page working.
    return NextResponse.json({ members: [], listed: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const token = req.headers.get("x-sc-token") ?? "";
  const body = await req.text();
  try {
    const res = await fetch(`${CURTAIN}/api/public/wall`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sc-token": token },
      body,
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json(j, { status: res.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not save that. Try again." }, { status: 502 });
  }
}
