"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { liveToken } from "@/lib/member";
import { PlayButton } from "@/components/AudioPlayer";

type Unlocked = { title: string; summary: string; notesHtml: string; contentWarnings: string; starring: string[] };

/**
 * What sits where the synopsis and cast would be, on an episode that members can hear and nobody
 * else can yet.
 *
 * Signed out, this is the pitch. Signed in, it is the synopsis — fetched rather than hidden, since
 * markup that ships the text and covers it with CSS is not withheld from anyone who can open view
 * source. /api/early hands it over only after Supporting Cast confirms the caller's own token.
 *
 * Starts in the locked state on the server and stays there until the token check has run, so the
 * first client render matches the HTML. A member sees the pitch for a moment; the alternative is a
 * hydration mismatch, which on this site once killed every handler on every page.
 */
export function EarlyGate({
  slug,
  guid,
  title,
  image,
}: {
  slug: string;
  guid: string;
  title: string;
  image?: string;
}) {
  const [unlocked, setUnlocked] = useState<Unlocked | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = liveToken();
    if (!token) {
      setChecking(false);
      return;
    }
    let dead = false;
    fetch(`/api/early?slug=${encodeURIComponent(slug)}`, { headers: { "x-sc-token": token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Unlocked | null) => {
        if (dead) return;
        if (j?.title) setUnlocked(j);
        setChecking(false);
      })
      .catch(() => !dead && setChecking(false));
    return () => {
      dead = true;
    };
  }, [slug]);

  if (unlocked) {
    // src is deliberately empty. There is no public file for this episode yet, and the player
    // knows not to write a source onto an element it did not create — MemberAudio has already
    // handed it Supporting Cast's, entitled and ad free. The id matches what MemberAudio adopted
    // for, which is how the bar knows this track is the one that element is carrying.
    const track = { id: guid, title, subtitle: "REDACTED", src: "", image, href: `/episodes/${slug}` };
    return (
      <div className="mt-8">
        <div className="flex items-center gap-4">
          <PlayButton track={track} size="lg" />
          <div>
            <p className="display text-sm tracking-wide text-yellow">EARLY ACCESS · MEMBERS</p>
            <p className="text-muted text-sm">Ad free, straight from Supporting Cast.</p>
          </div>
        </div>
        {unlocked.summary && <p className="mt-6 text-lg text-paper/85 max-w-prose">{unlocked.summary}</p>}
        {unlocked.notesHtml && (
          <div
            className="prose-site mt-6 max-w-prose text-paper/90 [overflow-wrap:anywhere] [&_a]:break-all [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
            dangerouslySetInnerHTML={{ __html: unlocked.notesHtml }}
          />
        )}
        {unlocked.starring.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow text-yellow">Starring</p>
            <ul className="mt-2 grid gap-1 text-paper/85">
              {unlocked.starring.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {unlocked.contentWarnings && (
          <div className="mt-6">
            <p className="eyebrow text-yellow">Content warnings</p>
            <p className="mt-2 text-paper/85 max-w-prose">{unlocked.contentWarnings}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 border border-yellow/40 bg-ink-2 p-6 sm:p-8" aria-busy={checking}>
      <h2 className="display text-3xl sm:text-4xl leading-[0.95] text-yellow">
        JOIN THE REDACTED UNIT FOR EARLY ACCESS
      </h2>
      <p className="mt-3 max-w-prose text-muted">
        This one is out for members already. Join and it plays here the moment you sign in — along
        with every other episode, ad free, in whatever app you listen in.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/join"
          className="inline-flex items-center gap-2 display text-xl px-4 py-2 bg-yellow text-ink border border-yellow hover:bg-transparent hover:text-yellow transition-colors"
        >
          Join the Unit
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 display text-xl px-4 py-2 border border-yellow/70 text-yellow hover:bg-yellow hover:text-ink transition-colors"
        >
          Already a member? Sign in
        </Link>
      </div>
    </div>
  );
}
