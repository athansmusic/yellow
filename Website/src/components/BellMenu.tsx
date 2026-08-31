"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { liveToken } from "@/lib/member";
import { LAST_SEEN_KEY } from "@/components/UpdatesFeed";

type Notice = {
  id: string;
  episode_slug: string;
  actor_name: string;
  read_at: string | null;
  created_at: string;
};
type Post = { id: string; slug: string; title: string; published_at: string };

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function label(slug: string) {
  const m = /^s(\d+)e(\d+)$/.exec(slug);
  if (m) return `S${Number(m[1])} E${Number(m[2])}`;
  if (slug.startsWith("update-")) return "an update";
  return slug.replace(/^postmortem-/, "Postmortem: ").replace(/-/g, " ");
}

/**
 * The bell, and what it opens.
 *
 * Two things worth interrupting someone for: a reply to something they wrote, and a post from the
 * show they have not seen. Both, because a bell that only counted replies would be permanently
 * empty for the many members who read without commenting.
 *
 * New posts are counted against a marker in this browser rather than a row per member per post —
 * there is no fan-out to write and nothing to keep in step, at the cost of the count being
 * per-browser. For "is there something new to read", that is the right trade.
 *
 * Opening the panel is what marks replies read: they have now been seen, and a badge that outlives
 * being looked at is just noise.
 */
export function BellMenu() {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [seen, setSeen] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const token = liveToken();
    if (!token) return;
    try {
      setSeen(localStorage.getItem(LAST_SEEN_KEY));
    } catch {}
    try {
      const [a, u] = await Promise.all([
        fetch("/api/comments/activity", { headers: { "x-sc-token": token } }).then((r) => r.json()),
        fetch("/api/updates", { headers: { "x-sc-token": token } }).then((r) => r.json()),
      ]);
      setNotices((a as { notifications?: Notice[] }).notifications ?? []);
      setPosts((u as { updates?: Post[] }).updates ?? []);
    } catch {
      /* a bell that cannot load simply shows nothing */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Close on outside click and on Escape, like every other menu on the site.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unreadReplies = notices.filter((n) => !n.read_at);
  const newPosts = posts.filter((p) => !seen || p.published_at > seen);
  const count = unreadReplies.length + newPosts.length;

  const toggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    // Seen on opening: replies are marked read, and the newest post becomes the marker.
    const token = liveToken();
    if (token && unreadReplies.length) {
      try {
        await fetch("/api/comments/activity", { method: "POST", headers: { "x-sc-token": token } });
        setNotices((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
        sessionStorage.removeItem("tru-unread-replies");
      } catch {}
    }
    if (posts[0]) {
      try {
        localStorage.setItem(LAST_SEEN_KEY, posts[0].published_at);
      } catch {}
    }
  }, [open, unreadReplies.length, posts]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={count > 0 ? `${count} new` : "Nothing new"}
        className="relative inline-grid size-9 place-items-center border border-yellow/70 text-yellow hover:bg-yellow hover:text-ink transition-colors"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-4 border border-ink bg-yellow px-1 text-[10px] font-bold leading-4 text-ink tabular">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-[min(20rem,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto border border-line bg-ink-2 shadow-[0_20px_40px_rgba(0,0,0,.6)]">
          {!loaded ? (
            <p className="p-4 text-sm text-muted">Loading…</p>
          ) : unreadReplies.length === 0 && newPosts.length === 0 ? (
            <p className="p-4 text-sm text-muted">Nothing new. You are all caught up.</p>
          ) : (
            <>
              {newPosts.length > 0 && (
                <div className="border-b border-line p-3">
                  <p className="eyebrow mb-2 text-yellow">New posts</p>
                  <ul className="grid gap-2">
                    {newPosts.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/updates/${p.slug}`}
                          onClick={() => setOpen(false)}
                          className="block text-sm hover:text-yellow"
                        >
                          {p.title}
                          <span className="ml-2 text-xs text-muted tabular">{when(p.published_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {unreadReplies.length > 0 && (
                <div className="p-3">
                  <p className="eyebrow mb-2 text-yellow">Replies to you</p>
                  <ul className="grid gap-2">
                    {unreadReplies.slice(0, 8).map((n) => (
                      <li key={n.id}>
                        <Link
                          href={`/episodes/${n.episode_slug}#comments`}
                          onClick={() => setOpen(false)}
                          className="block text-sm hover:text-yellow"
                        >
                          <span className="display">{n.actor_name}</span>{" "}
                          <span className="text-muted">replied on {label(n.episode_slug)}</span>
                          <span className="ml-2 text-xs text-muted tabular">{when(n.created_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="border-t border-line p-3">
            <Link href="/updates" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-yellow">
              All updates →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
