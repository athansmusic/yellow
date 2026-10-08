"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { liveToken, useMember } from "@/lib/member";
import { LinkOut } from "@/components/LinkOut";
import { Comments } from "@/components/Comments";
import { markPostsSeen } from "@/components/BellMenu";

export type PostType = "text" | "image" | "video" | "audio";

export type Update = {
  id: string;
  slug: string;
  title: string;
  body: string;
  tags: string[];
  post_type?: PostType;
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

const TYPE_LABEL: Record<PostType, string> = {
  text: "Writing",
  image: "Photos",
  video: "Video",
  audio: "Audio",
};

/**
 * Filters, built from what is actually here.
 *
 * The options come from the loaded posts rather than the full vocabulary, so the page never offers
 * a door into an empty room — a tag with nothing under it is a dead end that reads as a bug. They
 * disappear entirely when there is only one kind of thing to look at, which is most of the time
 * early on.
 */
function Filters({
  updates,
  type,
  tag,
  setType,
  setTag,
}: {
  updates: Update[];
  type: PostType | null;
  tag: string | null;
  setType: (t: PostType | null) => void;
  setTag: (t: string | null) => void;
}) {
  const types = useMemo(() => {
    const seen = new Set<PostType>();
    for (const u of updates) seen.add(u.post_type ?? "text");
    return (["text", "image", "video", "audio"] as PostType[]).filter((t) => seen.has(t));
  }, [updates]);

  const tags = useMemo(() => {
    const seen = new Set<string>();
    for (const u of updates) for (const t of u.tags) seen.add(t);
    return [...seen].sort();
  }, [updates]);

  if (types.length < 2 && tags.length === 0) return null;

  const chip = (on: boolean) =>
    `border px-3 py-1 text-xs uppercase tracking-[0.14em] transition-colors ${
      on ? "border-yellow bg-yellow text-ink" : "border-line text-muted hover:border-yellow hover:text-yellow"
    }`;

  return (
    <div className="mb-8 grid gap-3">
      {types.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setType(null)} className={chip(type === null)}>
            All
          </button>
          {types.map((t) => (
            <button key={t} type="button" onClick={() => setType(type === t ? null : t)} className={chip(type === t)}>
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} className={chip(tag === t)}>
              {t}
            </button>
          ))}
        </div>
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
export function UpdatesFeed({ slug, initialTag }: { slug?: string; initialTag?: string }) {
  const member = useMember();
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  // A tag arriving in the URL — from a chip on a post — starts the list filtered to it.
  const [type, setType] = useState<PostType | null>(null);
  const [tag, setTag] = useState<string | null>(initialTag ?? null);

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

  const shown = updates.filter(
    (u) => (!type || (u.post_type ?? "text") === type) && (!tag || u.tags.includes(tag)),
  );

  return (
    <>
      <Filters updates={updates} type={type} tag={tag} setType={setType} setTag={setTag} />
      {shown.length === 0 ? (
        <p className="text-muted max-w-prose border-t border-line pt-6">
          Nothing under that filter.{" "}
          <button
            type="button"
            onClick={() => {
              setType(null);
              setTag(null);
            }}
            className="text-yellow hover:underline underline-offset-4"
          >
            Show everything
          </button>
          .
        </p>
      ) : (
        <ul className="grid gap-8 border-t border-line pt-6">
          {shown.map((u) => (
            <li key={u.id}>
              <p className="eyebrow text-yellow">
                {when(u.published_at)}
                {u.post_type && u.post_type !== "text" && (
                  <span className="ml-2 text-muted">{TYPE_LABEL[u.post_type]}</span>
                )}
              </p>
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
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
                  {u.tags.join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
