"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { liveToken, useMember } from "@/lib/member";

type Album = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  year: number | null;
  description: string;
  cover_url: string | null;
  zip_url: string | null;
  zip_bytes: number | null;
};

type Track = {
  id: string;
  position: number;
  title: string;
  filename: string;
  size_bytes: number | null;
  duration: number | null;
  url: string;
};

function size(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function clock(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = String(Math.round(sec % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Albums members can download.
 *
 * Every link here is a signed URL that was minted for this member after their token was checked,
 * and expires in hours. There is no permanent address for any of these files — the bucket is
 * private — so a link pasted somewhere public stops working rather than becoming a free download.
 */
export function AlbumsFeed({ slug }: { slug?: string }) {
  const member = useMember();
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  const load = useCallback(async () => {
    const token = liveToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/albums${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`, {
        headers: { "x-sc-token": token },
      });
      const j = (await r.json()) as { albums?: Album[]; tracks?: Track[] };
      setAlbums(j.albums ?? []);
      setTracks(j.tracks ?? []);
    } catch {
      setAlbums([]);
    }
  }, [slug]);

  useEffect(() => {
    if (member?.signedIn) void load();
  }, [member?.signedIn, load]);

  if (member === undefined) return null;

  if (!member.signedIn) {
    return (
      <p className="text-muted max-w-prose">
        Album downloads are for members.{" "}
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

  if (albums === null) return <p className="text-muted text-sm">Loading…</p>;

  if (slug) {
    const a = albums[0];
    if (!a) return <p className="text-muted">That album is not here.</p>;
    return (
      <article>
        <div className="grid gap-8 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-start">
          {a.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed, expiring, private-bucket URL
            <img src={a.cover_url} alt="" className="w-full border border-line" />
          ) : (
            <div aria-hidden className="aspect-square w-full border border-line bg-ink-2" />
          )}
          <div>
            <h1 className="display text-4xl sm:text-5xl leading-[0.95]">{a.title}</h1>
            <p className="mt-2 text-muted">
              {[a.artist, a.year].filter(Boolean).join(" · ")}
            </p>
            {a.description && (
              <p className="mt-4 max-w-prose text-paper/85 whitespace-pre-wrap">{a.description}</p>
            )}
            {a.zip_url && (
              <a
                href={a.zip_url}
                download
                className="mt-6 inline-flex items-center gap-2 display text-xl px-4 py-2 bg-yellow text-ink border border-yellow hover:bg-transparent hover:text-yellow transition-colors"
              >
                Download album {a.zip_bytes ? `(${size(a.zip_bytes)})` : ""}
              </a>
            )}
          </div>
        </div>

        {tracks.length > 0 && (
          <ul className="mt-10 border-t border-line">
            {tracks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-3">
                <span className="w-6 text-right text-sm text-muted tabular">{t.position + 1}</span>
                <span className="display text-lg min-w-0 flex-1 truncate">{t.title}</span>
                {t.duration ? <span className="text-xs text-muted tabular">{clock(t.duration)}</span> : null}
                <span className="text-xs text-muted tabular">{size(t.size_bytes)}</span>
                <audio src={t.url} controls preload="none" className="order-last w-full sm:order-none sm:w-64" />
                <a
                  href={t.url}
                  download={t.filename}
                  className="border border-line px-2 py-1 text-xs text-muted hover:border-yellow hover:text-yellow"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 border-t border-line pt-6">
          <Link href="/albums" className="text-muted hover:text-yellow">
            ← All albums
          </Link>
        </div>
      </article>
    );
  }

  if (albums.length === 0) return <p className="text-muted max-w-prose">Nothing here yet.</p>;

  return (
    <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((a) => (
        <li key={a.id}>
          <Link href={`/albums/${a.slug}`} className="group block">
            {a.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed, expiring, private URL
              <img src={a.cover_url} alt="" className="w-full border border-line group-hover:border-yellow transition-colors" />
            ) : (
              <div aria-hidden className="aspect-square w-full border border-line bg-ink-2 group-hover:border-yellow transition-colors" />
            )}
            <p className="display text-xl mt-3 group-hover:text-yellow">{a.title}</p>
            <p className="text-sm text-muted">{[a.artist, a.year].filter(Boolean).join(" · ")}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
