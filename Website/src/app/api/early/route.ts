import { NextResponse } from "next/server";
import { privateGuidFor } from "@/lib/private-episodes";
import { getEarlyEpisode } from "@/lib/early";
import { resolveStarring } from "@/lib/starring";

/**
 * The synopsis for an early episode, for members only.
 *
 * An early page ships no description in its HTML — that is the point of holding it back — so a
 * member has to be handed it after the fact. Membership is not ours to judge, so this asks
 * Supporting Cast: their player API is given the caller's own token and answers is_authorized.
 * We return the text only when they say yes.
 *
 * The token arrives in a header rather than the query string, so it stays out of logs and out of
 * the Referer sent to any other origin.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const token = req.headers.get("x-sc-token") ?? "";
  const guid = privateGuidFor(slug);

  if (!guid || !token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const qs = new URLSearchParams({
    feed_uuid: "",
    episode_guid: guid,
    episode_uuid: "",
    free_feed_uuid: "",
    free_episode_guid: "",
    free_episode_uuid: "",
    video_uuid: "",
    redirect_url: "",
  });

  try {
    const res = await fetch(`https://player-api.supportingcast.fm/player/config?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "Supportingcast-Widget-Access-Token": token,
        "Supportingcast-Player-User-Agent": `SupportingCast Player/0.1.0 (host=theredactedunit.com; episode_guid=${guid})`,
      },
      cache: "no-store",
    });
    const j = (await res.json()) as {
      success?: boolean;
      is_authorized?: boolean;
      episode?: { title?: string; description?: string };
    };
    if (!j?.success || !j.is_authorized) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }
    // Built from Curtain — what it published to Acast — and parsed by the site's own parser, so a
    // member reads the same shaped page everyone else will once the schedule fires.
    const ep = await getEarlyEpisode(slug);
    return NextResponse.json(
      {
        title: ep?.title ?? j.episode?.title ?? "",
        summary: ep?.summary ?? "",
        notesHtml: ep?.notesHtml ?? "",
        contentWarnings: ep?.contentWarnings ?? "",
        // Resolved here, with the same helper the episode page uses, so the member's cast list is
        // the same list with the same links rather than a plain-text imitation of it.
        starring: resolveStarring(ep?.starring ?? []),
      },
      // Entitlement is per-listener; nothing here may be held in a shared cache.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  }
}
