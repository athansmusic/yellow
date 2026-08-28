import Image from "next/image";
import Link from "next/link";
import { Container, Crumbs } from "@/components/ui";
import { EarlyGate } from "@/components/EarlyGate";
import { MemberAudio } from "@/components/MemberAudio";
import type { EarlyEpisode as Early } from "@/lib/early";
import { formatDuration } from "@/lib/feed";

/**
 * An episode that members already have and the public feed has not reached yet.
 *
 * A deliberately thin page: art, title, and the join pitch. No synopsis, no cast, no content
 * warnings — the ask was that an early link land somewhere real without spoiling what is in it.
 * EarlyGate swaps the pitch for the synopsis once Supporting Cast confirms the reader's own token,
 * and MemberAudio gives that same member the audio through the player bar.
 *
 * Their image host is not guaranteed to be one next/image is configured for, so anything other
 * than the feed's usual CDN falls back to the show art rather than failing to render.
 */
export function EarlyEpisode({ early }: { early: Early }) {
  const art =
    early.image && early.image.startsWith("https://assets.pippa.io/") ? early.image : "/brand/showart.jpeg";

  return (
    <article>
      <MemberAudio episodeGuid={early.guid} />

      <div className="relative overflow-hidden border-b border-line">
        <Image src={art} alt="" fill sizes="100vw" className="object-cover scale-110 blur-2xl opacity-40" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/40" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" aria-hidden />
        <Container className="relative py-10 sm:py-14">
          <Crumbs items={[{ label: "Episodes", href: "/episodes?show=redacted" }, { label: early.title }]} />
          <div className="mt-6 flex flex-col sm:flex-row gap-6 sm:gap-8 sm:items-end">
            <Image
              src={art}
              alt=""
              width={200}
              height={200}
              className="w-32 sm:w-48 h-auto border border-line shadow-[0_10px_30px_rgba(0,0,0,.6)]"
            />
            <div>
              <p className="display text-sm tracking-wide text-yellow">OUT NOW FOR MEMBERS</p>
              <h1 className="display text-4xl sm:text-6xl leading-[0.95] mt-2">{early.title}</h1>
              {early.duration ? (
                <p className="mt-3 text-muted">{formatDuration(String(early.duration))}</p>
              ) : null}
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-14">
        <EarlyGate slug={early.slug} />

        <div className="mt-10 border-t border-line pt-6">
          <Link href="/episodes?show=redacted" className="text-muted hover:text-yellow">
            ← All episodes
          </Link>
        </div>
      </Container>
    </article>
  );
}
