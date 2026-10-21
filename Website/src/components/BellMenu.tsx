"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { liveToken } from "@/lib/member";

type Notice = {
  id: string;
  episode_slug: string;
  actor_name: string;
  read_at: string | null;
  created_at: string;
};
type Post = { id: string; slug: string; title: string; published_at: string };

/**
 * Ids of posts this browser has seen.
 *
 * A list of ids rather than a "newest seen" timestamp, because a timestamp cannot express "I read
 * that one but not the two under it" — opening the newest would bury everything older with it.
 */
export const SEEN_POSTS_KEY = "tru-updates-seen-ids";

export function readSeenPosts(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_POSTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markPostsSeen(ids: string[]) {
  try {
    const merged = Array.from(new Set([...readSeenPosts(), ...ids]));
    // Kept bounded; nobody needs a thousand ids to answer "is this new".
    localStorage.setItem(SEEN_POSTS_KEY, JSON.stringify(merged.slice(-200)));
  } catch {}
}

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
 * Two things worth interrupting someone for: a reply to something they wrote, and a post they have
 * not seen. Both, because a bell counting only replies sits permanently empty for the many members
 * who read without ever commenting.
 *
 * Reading is per item. Opening the panel used to mark everything read, so one glance cleared eight
 * things — and the list emptied under the reader while they were still looking at it. An item is
 * now read when it is clicked, with "Mark all read" there for anyone who wants that as a deliberate
 * act rather than a side effect.
 */
export function BellMenu() {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [seenPosts, setSeenPosts] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // The panel is portalled to <body>, which does not exist during the server render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    const token = liveToken();
    if (!token) return;
    setSeenPosts(readSeenPosts());
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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      // The panel lives outside this component's DOM now, so both have to be checked.
      const t = e.target as Node;
      if (!wrap.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
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
  const newPosts = posts.filter((p) => !seenPosts.includes(p.id));
  const count = unreadReplies.length + newPosts.length;

  /** Read one reply. Optimistic, since the click is about to navigate away. */
  const readOne = useCallback((id: string) => {
    const token = liveToken();
    setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    try {
      sessionStorage.removeItem("tru-unread-replies");
    } catch {}
    if (!token) return;
    void fetch("/api/comments/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sc-token": token },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const readPost = useCallback((id: string) => {
    markPostsSeen([id]);
    setSeenPosts((prev) => [...prev, id]);
  }, []);

  const readAll = useCallback(() => {
    const token = liveToken();
    const now = new Date().toISOString();
    setNotices((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    markPostsSeen(posts.map((p) => p.id));
    setSeenPosts(posts.map((p) => p.id));
    try {
      sessionStorage.removeItem("tru-unread-replies");
    } catch {}
    if (!token) return;
    void fetch("/api/comments/activity", { method: "POST", headers: { "x-sc-token": token } }).catch(() => {});
  }, [posts]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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

      {open &&
        mounted &&
        createPortal(
          /*
           * Rendered into <body>, not here.
           *
           * The header sets backdrop-filter, which makes it a containing block for fixed
           * descendants — so a "fixed" panel inside it was positioned against the header rather
           * than the viewport, and collapsed to nothing. A portal is the only way out of that;
           * no amount of positioning fixes it from inside.
           *
           * Below lg it spans the viewport under the header; from lg it is pinned to the right,
           * where the bell is.
           */
          <div
            ref={panel}
            className="fixed inset-x-3 top-[4.5rem] z-[60] max-h-[70vh] overflow-y-auto border border-line bg-ink-2 shadow-[0_20px_40px_rgba(0,0,0,.6)] lg:left-auto lg:right-6 lg:w-80">
          <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-line bg-ink-2 px-3 py-2">
            <p className="eyebrow">Notifications</p>
            {count > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="border border-line px-2 py-1 text-xs text-muted hover:border-yellow hover:text-yellow"
              >
                Read all
              </button>
            )}
          </div>

          {!loaded ? (
            <p className="p-4 text-sm text-muted">Loading…</p>
          ) : count === 0 ? (
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
                          onClick={() => {
                            readPost(p.id);
                            setOpen(false);
                          }}
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
                          onClick={() => {
                            readOne(n.id);
                            setOpen(false);
                          }}
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
          </div>,
          document.body,
        )}
    </div>
  );
}
