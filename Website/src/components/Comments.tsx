"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { liveToken, useMember } from "@/lib/member";

/** Mirrors the CHECK constraint on episode_comment_reactions. The database is the authority. */
const EMOJI = ["😂", "😱", "❤️", "🤯"] as const;

type Reactions = Record<string, { count: number; mine: boolean }>;

type Comment = {
  id: string;
  author_name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
  is_spoiler: boolean;
  parent_id: string | null;
  /** Whether this one is the reader's own. Decided by the server from their token. */
  mine?: boolean;
  reactions?: Reactions;
};

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
function Avatar({ src, name, small }: { src: string | null; name: string; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <span
      aria-hidden
      className={`grid ${small ? "size-7 text-[10px]" : "size-9 text-xs"} shrink-0 place-items-center overflow-hidden border border-line bg-ink-2 text-muted`}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element -- a member-supplied URL on a host
        // next/image is not configured for; sizing is fixed so there is nothing to optimise.
        <img src={src} alt="" loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/**
 * A comment body that might spoil the season.
 *
 * Hidden until asked for rather than shown under a warning — a warning you read after your eye has
 * already reached the text is not a warning. Everyone reading is a member, so this is a courtesy
 * between listeners rather than a security boundary; the text is in the page either way.
 */
function Body({ text, spoiler }: { text: string; spoiler: boolean }) {
  const [shown, setShown] = useState(!spoiler);
  if (shown) {
    return <p className="mt-1 text-paper/85 max-w-prose whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</p>;
  }
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="mt-1 w-full max-w-prose border border-yellow/40 bg-ink-2/70 px-3 py-2 text-left text-sm text-yellow hover:bg-ink-2"
    >
      Spoiler — tap to read
    </button>
  );
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
  const [spoiler, setSpoiler] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          body: JSON.stringify({ slug, body: text, parentId: replyTo?.id ?? null, isSpoiler: spoiler }),
        });
        const j = (await r.json()) as { comment?: Comment; error?: string };
        if (!r.ok || !j.comment) {
          setError(j.error ?? "Could not post that.");
        } else {
          setComments((prev) => [...(prev ?? []), j.comment!]);
          setDraft("");
          setSpoiler(false);
          setReplyTo(null);
        }
      } catch {
        setError("Could not post that. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [draft, busy, slug, replyTo, spoiler],
  );

  const remove = useCallback(async (id: string) => {
    const token = liveToken();
    if (!token) return;
    if (!confirm("Delete your comment? Any replies to it go too.")) return;
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
      // Replies cascade in the database, so drop them here too rather than leaving orphans on screen.
      else setComments((prev) => (prev ?? []).filter((c) => c.id !== id && c.parent_id !== id));
    } catch {
      setError("Could not delete that. Try again.");
    } finally {
      setRemoving(null);
    }
  }, []);

  const react = useCallback(
    async (id: string, emoji: string) => {
      const token = liveToken();
      if (!token) return;
      // Optimistic: a reaction that waits for a round trip feels broken.
      setComments((prev) =>
        (prev ?? []).map((c) => {
          if (c.id !== id) return c;
          const cur = c.reactions?.[emoji] ?? { count: 0, mine: false };
          return {
            ...c,
            reactions: {
              ...(c.reactions ?? {}),
              [emoji]: { count: Math.max(0, cur.count + (cur.mine ? -1 : 1)), mine: !cur.mine },
            },
          };
        }),
      );
      try {
        const r = await fetch("/api/comments/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-sc-token": token },
          body: JSON.stringify({ commentId: id, emoji }),
        });
        const j = (await r.json()) as { count?: number; mine?: boolean };
        // Reconcile with the server's tally; the optimistic guess is only a guess.
        if (typeof j.count === "number") {
          setComments((prev) =>
            (prev ?? []).map((c) =>
              c.id === id
                ? { ...c, reactions: { ...(c.reactions ?? {}), [emoji]: { count: j.count!, mine: !!j.mine } } }
                : c,
            ),
          );
        }
      } catch {
        void load();
      }
    },
    [load],
  );

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

  const tops = (comments ?? []).filter((c) => !c.parent_id);
  const repliesTo = (id: string) => (comments ?? []).filter((c) => c.parent_id === id);

  const row = (c: Comment, isReply = false) => (
    <div key={c.id} className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 ${isReply ? "mt-4 ml-4 sm:ml-8" : ""}`}>
      <Avatar src={c.avatar_url} name={c.author_name} small={isReply} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className={`display ${isReply ? "text-base" : "text-lg"}`}>{c.author_name}</span>
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

        <Body text={c.body} spoiler={c.is_spoiler} />

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {EMOJI.map((e) => {
            const r = c.reactions?.[e];
            // Only what someone has actually pressed. A row of zeroes reads dead.
            if (!r?.count && !r?.mine) return null;
            return (
              <button
                key={e}
                type="button"
                onClick={() => react(c.id, e)}
                aria-pressed={!!r?.mine}
                className={`inline-flex items-center gap-1 border px-2 py-0.5 text-xs tabular transition-colors ${
                  r?.mine ? "border-yellow text-yellow" : "border-line text-muted hover:border-yellow/60"
                }`}
              >
                <span aria-hidden>{e}</span>
                {r?.count ?? 0}
              </button>
            );
          })}

          <details className="relative">
            <summary className="cursor-pointer list-none border border-line px-2 py-0.5 text-xs text-muted hover:border-yellow/60">
              React
            </summary>
            <div className="absolute z-10 mt-1 flex gap-1 border border-line bg-ink-2 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,.6)]">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => react(c.id, e)}
                  aria-label={`React ${e}`}
                  className="px-1.5 py-0.5 text-base hover:bg-ink-3"
                >
                  {e}
                </button>
              ))}
            </div>
          </details>

          {!isReply && (
            <button
              type="button"
              onClick={() => setReplyTo(c)}
              className="border border-line px-2 py-0.5 text-xs text-muted hover:border-yellow/60 hover:text-yellow"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section id="comments" className="scroll-mt-24">
      <h2 className="eyebrow mb-3">Discussion{count > 0 ? ` · ${count}` : ""}</h2>

      {comments === null ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : count === 0 ? (
        <p className="text-muted">No one has said anything yet.</p>
      ) : (
        <ul className="grid gap-6 border-t border-line pt-5">
          {tops.map((c) => (
            <li key={c.id}>
              {row(c)}
              {repliesTo(c.id).map((r) => row(r, true))}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-7 border-t border-line pt-6">
        <label htmlFor="comment-body" className="eyebrow block mb-2">
          {replyTo ? `Replying to ${replyTo.author_name}` : "Add yours"}
        </label>
        {replyTo && (
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="mb-2 block text-xs text-muted hover:text-yellow underline underline-offset-4"
          >
            Cancel reply
          </button>
        )}
        <textarea
          id="comment-body"
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
            {busy ? "Posting…" : replyTo ? "Reply" : "Post"}
          </button>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
            Mark as spoiler
          </label>
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
