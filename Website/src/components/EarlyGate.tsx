"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { liveToken } from "@/lib/member";
import { PlayButton } from "@/components/AudioPlayer";

type Star = { actor: string; role?: string; member?: { slug: string } | null; guestLink?: string };
type Unlocked = { title: string; summary: string; notesHtml: string; contentWarnings: string; starring: Star[] };

/**
 * An early episode's withheld half, put back where the episode page keeps it: the play control and
 * synopsis in the header band, the cast and content warnings down in the lower grid. Rendering both
 * from one place is what put the whole lot in the hero.
 *
 * Both halves read a single fetch through this context, so the page can never show a member their
 * cast list while still offering them the join pitch.
 *
 * Signed out, the header half is the pitch and the lower half renders nothing. Signed in, both fill
 * in — fetched rather than hidden, since markup that ships the text and covers it with CSS is not
 * withheld from anyone who can open view source. /api/early hands it over only once Supporting Cast
 * has confirmed the caller's own token.
 *
 * Everything starts locked on the server and stays locked until that check has run, so the first
 * client render matches the HTML. A member sees the pitch for a moment; the alternative is a
 * hydration mismatch, which on this site once killed every handler on every page.
 */
const Ctx = createContext<Unlocked | null>(null);

export function EarlyProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [unlocked, setUnlocked] = useState<Unlocked | null>(null);

  useEffect(() => {
    const token = liveToken();
    if (!token) return;
    let dead = false;
    fetch(`/api/early?slug=${encodeURIComponent(slug)}`, { headers: { "x-sc-token": token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Unlocked | null) => {
        if (!dead && j?.title) setUnlocked(j);
      })
      .catch(() => {
        /* not a member, or their API is down: the pitch stands */
      });
    return () => {
      dead = true;
    };
  }, [slug]);

  return <Ctx.Provider value={unlocked}>{children}</Ctx.Provider>;
}

/** Header band: the play control and synopsis for a member, the pitch for everyone else. */
export function EarlyTop({ slug, guid, title, image }: { slug: string; guid: string; title: string; image?: string }) {
  const unlocked = useContext(Ctx);

  if (unlocked) {
    // src is deliberately empty. There is no public file for this episode, and the player knows not
    // to write a source onto an element it did not create — MemberAudioBridge has already handed
    // it Supporting Cast's, entitled and ad free. The id matches what the bridge adopted for.
    const track = { id: guid, title, subtitle: "REDACTED", src: "", image, href: `/episodes/${slug}` };
    return (
      <>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <PlayButton track={track} size="lg" />
          <div>
            <p className="display text-sm tracking-wide text-yellow">EARLY ACCESS · MEMBERS</p>
            <p className="text-sm text-paper/70">Ad free, straight from Supporting Cast.</p>
          </div>
        </div>
        {unlocked.summary && <p className="mt-4 text-lg text-paper/85 max-w-prose">{unlocked.summary}</p>}
      </>
    );
  }

  return (
    <div className="mt-6 border border-yellow/40 bg-ink-2/70 p-6 sm:p-8 max-w-prose">
      <h2 className="display text-3xl sm:text-4xl leading-[0.95] text-yellow">
        JOIN THE REDACTED UNIT FOR EARLY ACCESS
      </h2>
      <p className="mt-3 text-paper/85">
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

/**
 * Lower grid: the same notes, Starring and content-warnings sections the episode page renders, in
 * the same order and the same place, so a member reads the page everyone else reads next week.
 */
export function EarlyBelow() {
  const unlocked = useContext(Ctx);
  if (!unlocked) return null;

  return (
    <>
      {unlocked.notesHtml && (
        <section>
          <div
            className="prose-site max-w-prose text-paper/90 [overflow-wrap:anywhere] [&_a]:break-all [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
            dangerouslySetInnerHTML={{ __html: unlocked.notesHtml }}
          />
        </section>
      )}

      {unlocked.starring.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Starring</h2>
          <ul className="grid sm:grid-cols-2 gap-x-8 border-t border-line">
            {unlocked.starring.map((s) => (
              <li
                key={s.actor + (s.role ?? "")}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2.5"
              >
                <span className="display text-xl">
                  {s.role ??
                    (s.member ? (
                      <Link href={`/cast/${s.member.slug}`} className="hover:text-yellow">
                        {s.actor}
                      </Link>
                    ) : (
                      s.actor
                    ))}
                </span>
                {s.role &&
                  (s.member ? (
                    <Link
                      href={`/cast/${s.member.slug}`}
                      className="text-sm text-yellow text-right hover:underline underline-offset-4 shrink-0"
                    >
                      {s.actor}
                    </Link>
                  ) : s.guestLink ? (
                    <a
                      href={s.guestLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-yellow text-right hover:underline underline-offset-4 shrink-0"
                    >
                      {s.actor}
                    </a>
                  ) : (
                    <span className="text-sm text-muted text-right shrink-0">{s.actor}</span>
                  ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {unlocked.contentWarnings && (
        <section id="warnings" className="scroll-mt-24">
          <details className="group border border-line bg-ink-2/70">
            <summary className="cursor-pointer list-none p-4 flex items-center justify-between display text-2xl">
              Content warnings
              <span aria-hidden className="text-yellow text-3xl leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="px-4 pb-4 text-paper/85">{unlocked.contentWarnings}</p>
          </details>
        </section>
      )}
    </>
  );
}
