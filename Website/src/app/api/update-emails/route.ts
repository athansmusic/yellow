import { NextResponse } from "next/server";

/** Update-email preference, proxied to Curtain. The address is read there, never sent from here. */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

async function forward(method: "GET" | "POST", token: string, body?: string) {
  const res = await fetch(`${CURTAIN}/api/public/update-emails`, {
    method,
    headers: { "Content-Type": "application/json", "x-sc-token": token },
    body,
    cache: "no-store",
  });
  const j = await res.json();
  return NextResponse.json(j, { status: res.status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(req: Request) {
  try {
    return await forward("GET", req.headers.get("x-sc-token") ?? "");
  } catch {
    return NextResponse.json({ subscribed: false }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  try {
    return await forward("POST", req.headers.get("x-sc-token") ?? "", body);
  } catch {
    return NextResponse.json({ error: "Could not save that. Try again." }, { status: 502 });
  }
}
