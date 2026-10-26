import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CURTAIN = "https://www.opencurtain.app/api/public/partner-inquiry";

type Body = { name?: string; email?: string; company?: string; interest?: string; message?: string; website?: string; t?: number };

/**
 * The /partner contact form. The mail itself is sent from OpenCurtain (it already has the mailer),
 * which accepts this call only with the secret the two projects share for cache refreshes, so the
 * browser never talks to it and the recipient cannot be chosen from the form.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Bots fill every field. The hidden "website" box is invisible to a person, and a form that
  // arrives in under two seconds was not typed. Both answer "sent" so a bot learns nothing.
  if (body.website) return NextResponse.json({ ok: true });
  if (typeof body.t === "number" && Date.now() - body.t < 2000) return NextResponse.json({ ok: true });

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
    return NextResponse.json({ error: "Please add your name, a valid email and a message." }, { status: 400 });
  }

  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "Messaging is not set up yet. Please email us directly." }, { status: 503 });

  try {
    const r = await fetch(CURTAIN, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({ name, email, company: body.company, interest: body.interest, message }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return NextResponse.json({ error: "We couldn't send that. Please email us directly." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("partner inquiry proxy failed", e);
    return NextResponse.json({ error: "We couldn't send that. Please email us directly." }, { status: 502 });
  }
}
