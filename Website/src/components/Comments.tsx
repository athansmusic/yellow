"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { liveToken, useMember } from "@/lib/member";

type Comment = {
  id: string;
  author_name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
  /** Whether this one is the reader's own. Decided by the server from their token. */
  mine?: boolean;
};

/** Two initials, for a member who has never uploaded a picture. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * The member's picture, or their initials.
 *
 * An avatar that fails to load falls back rather than leaving a broken image: the URL is stored
 * when the comment is written, and Supporting Cast is free to move or remove it afterwards.
 */
function Avatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center overflow-hidden border border-line bg-ink-2 text-xs text-muted"
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element -- a member-supplied URL on a host
        // next/image is not configured for; sizing is fixed so there is nothing to optimise.
        <img
          src={src}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

const MAX = 2000;

/**
 * Whether a signed-out visitor is told the discussion exists.
 *
 * Off until membership moves to Supporting Cast: /join still sends people to Patreon, so the
 * pitch would invite them to buy the wrong thing. Members are unaffected either way — this only
 * governs what someone who is not signed in sees. Flip to true on the switch.
 */
const SHOW_SIGNED_OUT_PITCH = false;

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
 * The episode's comment thread. Members only, to read as well as to write.
 *
 * A signed-out visitor is never sent the comments at all — not sent them and told not to look.
 * The fetch only happens with a token, and the endpoint behind it refuses without one, so the
 * thread is absent from the page rather than hidden in it.
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
  const [removing, setRemoving] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const token = liveToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, {
        headers: { "x-sc-token": token },
      });
      const j = (await r.json()) as { comments?: Comment[] };
      setComments(j.comments ?? []);
    } catch {
      setComments([]);
    }
  }, [slug]);

  // Only once we know they are signed in — a fetch without a token is refused anyway, and asking
  // would tell a signed-out reader that there is something here to be refused.
  useEffect(() => {
    if (member?.signedIn) void load();
  }, [member?.signedIn, load]);

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

  const remove = useCallback(async (id: string) => {
    const token = liveToken();
    if (!token) return;
    if (!confirm("Delete your comment?")) return;
    setRemoving(id);
    setError(null);
    try {
      const r = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-sc-token": token },
        body: JSON.stringify({ id }),
      });
      const j = (await r.json()) as { deleted?: string; error?: string };
      if (!r.ok || !j.deleted) setError(j.error ?? "Could not delete that.");
      else setComments((prev) => (prev ?? []).filter((c) => c.id !== id));
    } catch {
      setError("Could not delete that. Try again.");
    } finally {
      setRemoving(null);
    }
  }, []);

  const count = comments?.length ?? 0;

  // Nothing at all until the membership check has run, so neither state flashes at the wrong person.
  if (member === undefined) return null;

  if (!member.signedIn) {
    if (!SHOW_SIGNED_OUT_PITCH) return null;
    return (
      <section id="comments" className="scroll-mt-24">
        <h2 className="eyebrow mb-3">Discussion</h2>
        <p className="text-muted max-w-prose">
          Members talk about each episode here.{" "}
          <Link href="/join" className="text-yellow hover:underline underline-offset-4">
            Join the Unit
          </Link>{" "}
          or{" "}
          <Link href="/login" className="text-yellow hover:underline underline-offset-4">
            sign in
          </Link>
          .
        </p>
      </section>
    );
  }

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
            <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <Avatar src={c.avatar_url} name={c.author_name} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="display text-lg">{c.author_name}</span>
                  <span className="text-xs text-muted tabular">{when(c.created_at)}</span>
                  {c.mine && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      disabled={removing === c.id}
                      className="text-xs text-muted hover:text-yellow underline underline-offset-4 disabled:opacity-40"
                    >
                      {removing === c.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </p>
                <p className="mt-1 text-paper/85 max-w-prose whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

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
    </section>
  );
}
