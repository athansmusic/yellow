import { NextResponse } from "next/server";
import { EXTERNAL } from "@/lib/site";

export const runtime = "nodejs";

type Body = { first_name?: string; email?: string; opted_in?: boolean; marketing_opt_in?: boolean; source?: string };

/**
 * Episode-alerts sign-up. Proxies to OpenCurtain from the server because its CORS policy only allows
 * the bare production origin (not localhost, www, or preview deployments).
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const first_name = String(body.first_name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().slice(0, 200);
  if (!first_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "first_name and email are required." }, { status: 400 });
  if (body.opted_in !== true) return NextResponse.json({ error: "Please tick the consent box." }, { status: 400 });

  try {
    const r = await fetch(EXTERNAL.newsletterApi, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ first_name, email, opted_in: true, marketing_opt_in: body.marketing_opt_in === true, source: String(body.source ?? "website").slice(0, 60) }),
      cache: "no-store",
    });
    const data = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) return NextResponse.json({ error: data.error ?? "Something went wrong. Please try again." }, { status: r.status });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("subscribe proxy failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
