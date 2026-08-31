"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { liveToken, useMember } from "@/lib/member";

type Recent = {
  id: string;
  episode_slug: string;
  author_name: string;
  avatar_url: string | null;
  body: string;
  is_spoiler: boolean;
  created_at: string;
};

type Notice = {
  id: string;
  comment_id: string;
  episode_slug: string;
  actor_name: string;
  read_at: string | null;
  created_at: string;
};

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/** "s1e27" → "S1 E27". Postmortem slugs are left as they read. */
function label(slug: string) {
  const m = /^s(\d+)e(\d+)$/.exec(slug);
  if (m) return `S${Number(m[1])} E${Number(m[2])}`;
  return slug.replace(/^postmortem-/, "Postmortem: ").replace(/-/g, " ");
}

/**
 * Replies waiting for this member, and what has been said lately anywhere.
 *
 * Fifty-three threads each holding a trickle look abandoned; the same trickle gathered into one
 * list looks like a room with people in it. At low volume that matters more, not less — which is
 * why this exists at all rather than leaving conversation buried per episode.
 *
 * A reply clears when it is clicked, not when this page loads. Loading a page is not the same as
 * having read eight things, and clearing them on sight loses the ones you meant to come back to.
 */
export function Discussion() {
  const member = useMember();
  const [recent, setRecent] = useState<Recent[] | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  const load = useCallback(async () => {
    const token = liveToken();
    if (!token) return;
    try {
      const r = await fetch("/api/comments/activity", { headers: { "x-sc-token": token } });
      const j = (await r.json()) as { recent?: Recent[]; notifications?: Notice[] };
      setRecent(j.recent ?? []);
      setNotices(j.notifications ?? []);
      // Deliberately does NOT mark anything read. Loading a page is not reading eight replies;
      // each one clears when it is clicked, in the bell or here.
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (member?.signedIn) void load();
  }, [member?.signedIn, load]);

  if (!member?.signedIn || recent === null) return null;

  const unread = notices.filter((n) => !n.read_at);

  return (
    <div className="mt-12 grid gap-10">
      {unread.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3 text-yellow">Replies to you</h2>
          <ul className="grid gap-2 border-t border-line pt-4">
            {unread.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/episodes/${n.episode_slug}#comments`}
                  onClick={() => {
                    const t = liveToken();
                    if (!t) return;
                    try {
                      sessionStorage.removeItem("tru-unread-replies");
                    } catch {}
                    void fetch("/api/comments/activity", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "x-sc-token": t },
                      body: JSON.stringify({ id: n.id }),
                    }).catch(() => {});
                  }}
                  className="flex flex-wrap items-baseline gap-x-3 hover:text-yellow"
                >
                  <span className="display text-lg">{n.actor_name}</span>
                  <span className="text-sm text-muted">replied on {label(n.episode_slug)}</span>
                  <span className="text-xs text-muted tabular">{when(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-3">Lately in the discussion</h2>
        {recent.length === 0 ? (
          <p className="text-muted max-w-prose">
            Nothing yet anywhere. Episode pages are where it happens —{" "}
            <Link href="/episodes" className="text-yellow hover:underline underline-offset-4">
              pick one
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-4 border-t border-line pt-4">
            {recent.map((c) => (
              <li key={c.id}>
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="display text-base">{c.author_name}</span>
                  <Link
                    href={`/episodes/${c.episode_slug}#comments`}
                    className="text-xs text-yellow hover:underline underline-offset-4"
                  >
                    {label(c.episode_slug)}
                  </Link>
                  <span className="text-xs text-muted tabular">{when(c.created_at)}</span>
                </p>
                {/* Spoilers stay covered here too — this list is read at a glance, which is exactly
                    where an unguarded spoiler does its damage. */}
                <p className="mt-0.5 text-sm text-paper/80 line-clamp-2 max-w-prose [overflow-wrap:anywhere]">
                  {c.is_spoiler ? "Marked as a spoiler — open the episode to read it." : c.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
