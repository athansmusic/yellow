import { NextResponse } from "next/server";

/** Discord link status and unlinking, proxied to Curtain. Same reasons as comments and updates. */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

async function forward(method: "GET" | "DELETE", token: string) {
  const res = await fetch(`${CURTAIN}/api/public/discord`, {
    method,
    headers: { "x-sc-token": token },
    cache: "no-store",
  });
  const j = await res.json();
  return NextResponse.json(j, {
    status: res.status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(req: Request) {
  try {
    return await forward("GET", req.headers.get("x-sc-token") ?? "");
  } catch {
    // A Discord panel that cannot load simply does not offer itself.
    return NextResponse.json({ available: false, linked: false }, { status: 200 });
  }
}

export async function DELETE(req: Request) {
  try {
    return await forward("DELETE", req.headers.get("x-sc-token") ?? "");
  } catch {
    return NextResponse.json({ error: "Could not reach the server. Try again." }, { status: 502 });
  }
}
