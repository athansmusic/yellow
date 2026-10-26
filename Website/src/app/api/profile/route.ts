import { NextResponse } from "next/server";

/** Carries a renamed member through their existing comments. Proxied to Curtain, like the rest. */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const res = await fetch(`${CURTAIN}/api/public/profile`, {
      method: "POST",
      headers: { "x-sc-token": req.headers.get("x-sc-token") ?? "" },
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json(j, { status: res.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    // The name is already saved with Supporting Cast; only the catch-up failed.
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
