import { NextResponse } from "next/server";

/**
 * Where Discord sends the member back after they approve the link.
 *
 * This URL is on the show's domain because that is what a member recognises, and because Discord
 * checks the redirect against a fixed list — it cannot point straight at Curtain without exposing
 * an admin domain in the consent screen. The work happens in Curtain; this hands over the code and
 * sends the member somewhere with words on it.
 */
const CURTAIN = process.env.CURTAIN_URL ?? "https://www.opencurtain.app";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const denied = url.searchParams.get("error");

  const back = (status: string) => NextResponse.redirect(new URL(`/account?discord=${status}`, url.origin));

  // They pressed Cancel on Discord's screen. Not an error worth a page of its own.
  if (denied) return back("cancelled");
  if (!code || !state) return back("failed");

  try {
    const res = await fetch(`${CURTAIN}/api/public/discord/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
      cache: "no-store",
    });
    const j = (await res.json()) as { linked?: boolean; error?: string; needsJoin?: boolean };
    // Not being in the server yet is not a failure — it gets its own landing so the page can offer
    // an invite and a retry instead of an apology.
    if (j.needsJoin) return back("join");
    if (!res.ok || !j.linked) {
      // The reason travels in the URL so the account page can say what went wrong.
      return NextResponse.redirect(
        new URL(`/account?discord=failed&why=${encodeURIComponent(j.error ?? "")}`, url.origin),
      );
    }
    return back("linked");
  } catch {
    return back("failed");
  }
}
