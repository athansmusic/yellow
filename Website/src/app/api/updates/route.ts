import { NextResponse } from "next/server";

/** Members-only Updates, proxied to Curtain. Same reasons as comments: no CORS, token stays here. */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = new URLSearchParams();
  const slug = url.searchParams.get("slug");
  const tag = url.searchParams.get("tag");
  if (slug) qs.set("slug", slug);
  if (tag) qs.set("tag", tag);

  try {
    const res = await fetch(`${CURTAIN}/api/public/updates?${qs}`, {
      headers: { "x-sc-token": req.headers.get("x-sc-token") ?? "" },
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json(j, { status: res.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ updates: [], files: [] }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  }
}
