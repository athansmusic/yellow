import { NextResponse } from "next/server";

/** Members-only albums, proxied to Curtain. Same reasons as comments: no CORS, token stays here. */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  try {
    const res = await fetch(`${CURTAIN}/api/public/albums${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`, {
      headers: { "x-sc-token": req.headers.get("x-sc-token") ?? "" },
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json(j, { status: res.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ albums: [], tracks: [] }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  }
}
