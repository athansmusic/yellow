"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { liveToken, useMember } from "@/lib/member";
import { LinkOut } from "@/components/LinkOut";
import { Comments } from "@/components/Comments";
import { markPostsSeen } from "@/components/BellMenu";

export type Update = {
  id: string;
  slug: string;
  title: string;
  body: string;
  tags: string[];
  published_at: string;
};

export type Attachment = {
  id: string;
  kind: "image" | "video" | "audio" | "file";
  filename: string;
  size_bytes: number | null;
  url: string;
};

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function size(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Blank lines separate paragraphs; URLs inside them still warn before leaving. */
function Prose({ text }: { text: string }) {
  return (
    <div className="mt-5 grid gap-4 max-w-prose text-paper/85">
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-wrap [overflow-wrap:anywhere]">
            {p.split(/(https?:\/\/[^\s<>"']+)/g).map((part, j) =>
              /^https?:\/\//i.test(part) ? (
                <LinkOut key={j} href={part}>
                  {part}
                </LinkOut>
              ) : (
                part
              ),
            )}
          </p>
        ))}
    </div>
  );
}

/**
 * Attached media.
 *
 * Every URL here is a short-lived signed link minted after the member's token was checked, so it
 * can be used directly in a src — and stops working once it expires rather than becoming a
 * permanent way around the gate.
 */
function Files({ files }: { files: Attachment[] }) {
  if (!files.length) return null;
  return (
    <div className="mt-8 grid gap-6">
      {files.map((f) =>
        f.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed, expiring, private-bucket URL
          <img key={f.id} src={f.url} alt={f.filename} className="max-w-full border border-line" loading="lazy" />
        ) : f.kind === "video" ? (
          <video key={f.id} src={f.url} controls playsInline className="w-full border border-line" />
        ) : f.kind === "audio" ? (
          <div key={f.id}>
            <p className="text-sm text-muted">{f.filename}</p>
            <audio src={f.url} controls className="mt-1 w-full" />
          </div>
        ) : (
          <a
            key={f.id}
            href={f.url}
            download={f.filename}
            className="inline-flex items-center gap-2 border border-line px-3 py-2 text-sm hover:border-yellow hover:text-yellow"
          >
            {f.filename} <span className="text-muted">{size(f.size_bytes)}</span>
          </a>
        ),
      )}
    </div>
  );
}

/**
 * Updates — posts for members only.
 *
 * A signed-out visitor is never sent them: the fetch needs a token and the endpoint behind it
 * refuses without one, so the posts are absent from the page rather than hidden in it.
 *
 * With a slug this is one post and its comments; without, the list.
 */
export function UpdatesFeed({ slug }: { slug?: string }) {
  const member = useMember();
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]);

  const load = useCallback(async () => {
    const token = liveToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/updates${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`, {
        headers: { "x-sc-token": token },
      });
      const j = (await r.json()) as { updates?: Update[]; files?: Attachment[] };
      setUpdates(j.updates ?? []);
      setFiles(j.files ?? []);
      // Seeing the list counts as seeing what is on it; opening one post marks only that one.
      const ids = (j.updates ?? []).map((u) => u.id);
      if (ids.length) markPostsSeen(slug ? ids.slice(0, 1) : ids);
    } catch {
      setUpdates([]);
    }
  }, [slug]);

  useEffect(() => {
    if (member?.signedIn) void load();
  }, [member?.signedIn, load]);

  if (member === undefined) return null;

  if (!member.signedIn) {
    return (
      <p className="text-muted max-w-prose">
        Updates are for members.{" "}
        <Link href="/join" className="text-yellow hover:underline underline-offset-4">
          Join the Unit
        </Link>{" "}
        or{" "}
        <Link href="/login" className="text-yellow hover:underline underline-offset-4">
          sign in
        </Link>
        .
      </p>
    );
  }

  if (updates === null) return <p className="text-muted text-sm">Loading…</p>;

  if (slug) {
    const post = updates[0];
    if (!post) return <p className="text-muted">That post is not here.</p>;
    return (
      <article>
        <p className="eyebrow text-yellow">{when(post.published_at)}</p>
        <h1 className="display text-4xl sm:text-6xl leading-[0.95] mt-2">{post.title}</h1>
        {post.tags.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/updates?tag=${encodeURIComponent(t)}`}
                className="border border-line px-2 py-0.5 text-xs uppercase tracking-[0.14em] text-muted hover:border-yellow hover:text-yellow"
              >
                {t}
              </Link>
            ))}
          </p>
        )}
        <Prose text={post.body} />
        <Files files={files} />
        <div className="mt-12 border-t border-line pt-8">
          {/* Comments key off an arbitrary slug, which is why episode_comments.episode_slug was
              never a foreign key — an update carries a thread with no schema change. */}
          <Comments slug={`update-${post.slug}`} />
        </div>
        <div className="mt-10 border-t border-line pt-6">
          <Link href="/updates" className="text-muted hover:text-yellow">
            ← All updates
          </Link>
        </div>
      </article>
    );
  }

  if (updates.length === 0) {
    return <p className="text-muted max-w-prose">Nothing posted yet.</p>;
  }

  return (
    <ul className="grid gap-8 border-t border-line pt-6">
      {updates.map((u) => (
        <li key={u.id}>
          <p className="eyebrow text-yellow">{when(u.published_at)}</p>
          <h2 className="display text-2xl sm:text-3xl leading-tight mt-1">
            <Link href={`/updates/${u.slug}`} className="hover:text-yellow">
              {u.title}
            </Link>
          </h2>
          {u.body && (
            <p className="mt-2 text-paper/80 max-w-prose line-clamp-3 [overflow-wrap:anywhere]">
              {u.body.split(/\n{2,}/)[0]}
            </p>
          )}
          {u.tags.length > 0 && (
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">{u.tags.join(" · ")}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
