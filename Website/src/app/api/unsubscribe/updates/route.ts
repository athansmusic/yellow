import { NextResponse } from "next/server";

/**
 * One-click unsubscribe, proxied to Curtain.
 *
 * The link has to be on this domain: it goes out in mail from theredactedunit.com, and a recipient
 * asked to click through to opencurtain.app to stop emails has every reason to think it is a
 * phish. The route that owns the token lives in Curtain, so this forwards to it.
 *
 * Both verbs, because RFC 8058 mail clients POST the header link without a human ever seeing a
 * page, while a person clicking the footer link expects one.
 */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

async function forward(method: "GET" | "POST", token: string) {
  const res = await fetch(
    `${CURTAIN}/api/unsubscribe/updates?token=${encodeURIComponent(token)}`,
    { method, cache: "no-store" },
  );
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function token(req: Request) {
  return new URL(req.url).searchParams.get("token") ?? "";
}

export async function GET(req: Request) {
  try {
    return await forward("GET", token(req));
  } catch {
    return new NextResponse(
      "<p>We could not reach the mailing list just now. Try the link again, or reply to the email and we will take you off by hand.</p>",
      { status: 502, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

export async function POST(req: Request) {
  try {
    return await forward("POST", token(req));
  } catch {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}
