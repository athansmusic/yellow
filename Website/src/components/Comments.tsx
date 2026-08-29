"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { liveToken, useMember } from "@/lib/member";

type Comment = { id: string; author_name: string; body: string; created_at: string };

const MAX = 2000;

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

/**
 * The episode's comment thread. Anyone can read it; only members can post.
 *
 * Read by everyone on purpose: a thread only members can see does nothing for the person deciding
 * whether to join, and an episode page with people talking on it is a better argument for joining
 * than a locked box would be.
 *
 * Nothing here decides who the author is. The post carries the member's Supporting Cast token, and
 * the server files the comment under whoever Supporting Cast says that token belongs to — a
 * browser can claim any name, a token cannot.
 */
export function Comments({ slug }: { slug: string }) {
  const member = useMember();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`);
      const j = (await r.json()) as { comments?: Comment[] };
      setComments(j.comments ?? []);
    } catch {
      setComments([]);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text || busy) return;
      const token = liveToken();
      if (!token) {
        setError("Your session expired. Sign in again to post.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const r = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-sc-token": token },
          body: JSON.stringify({ slug, body: text }),
        });
        const j = (await r.json()) as { comment?: Comment; error?: string };
        if (!r.ok || !j.comment) {
          setError(j.error ?? "Could not post that.");
        } else {
          setComments((prev) => [...(prev ?? []), j.comment!]);
          setDraft("");
        }
      } catch {
        setError("Could not post that. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [draft, busy, slug],
  );

  const count = comments?.length ?? 0;

  return (
    <section id="comments" className="scroll-mt-24">
      <h2 className="eyebrow mb-3">
        Discussion{count > 0 ? ` · ${count}` : ""}
      </h2>

      {comments === null ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : count === 0 ? (
        <p className="text-muted">No one has said anything yet.</p>
      ) : (
        <ul className="grid gap-5 border-t border-line pt-5">
          {comments.map((c) => (
            <li key={c.id}>
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="display text-lg">{c.author_name}</span>
                <span className="text-xs text-muted tabular">{when(c.created_at)}</span>
              </p>
              <p className="mt-1 text-paper/85 max-w-prose whitespace-pre-wrap [overflow-wrap:anywhere]">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* undefined means the membership check has not finished; showing neither state avoids a
          sign-in prompt flashing at someone who is already signed in. */}
      {member === undefined ? null : member.signedIn ? (
        <form onSubmit={submit} className="mt-7 border-t border-line pt-6">
          <label htmlFor="comment-body" className="eyebrow block mb-2">
            Add yours
          </label>
          <textarea
            id="comment-body"
            ref={box}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
            rows={3}
            placeholder="No spoilers for anyone still catching up."
            className="w-full bg-ink-2 border border-line p-3 text-paper placeholder:text-muted focus:outline-none focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="inline-flex items-center gap-2 display text-xl px-4 py-2 bg-yellow text-ink border border-yellow hover:bg-transparent hover:text-yellow transition-colors disabled:opacity-40 disabled:hover:bg-yellow disabled:hover:text-ink"
            >
              {busy ? "Posting…" : "Post"}
            </button>
            <span className="text-xs text-muted tabular">
              posting as {member.name ?? "your account"} · {MAX - draft.length} left
            </span>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-yellow">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="mt-7 border-t border-line pt-6">
          <p className="text-muted max-w-prose">
            Members can join the discussion.{" "}
            <Link href="/join" className="text-yellow hover:underline underline-offset-4">
              Join the Unit
            </Link>{" "}
            or{" "}
            <Link href="/login" className="text-yellow hover:underline underline-offset-4">
              sign in
            </Link>
            .
          </p>
        </div>
      )}
    </section>
  );
}
