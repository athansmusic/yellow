import type { Metadata } from "next";
import Link from "next/link";
import { getDoc } from "@/lib/content";
import { Container } from "@/components/ui";
import { Arrow } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Podcasts and Shows Like REDACTED",
  description: "Came here from another show? What [REDACTED] shares with the podcasts and TV you already like, what's different, and where to start.",
  alternates: { canonical: "/like" },
};

export const revalidate = 60;

const KIND_LABEL: Record<string, string> = { podcast: "Podcast", tv: "TV show", film: "Film", game: "Game", book: "Book" };

export default async function LikeIndex() {
  const like = await getDoc("like");
  return (
    <Container className="py-10 sm:py-16 max-w-4xl">
      <p className="eyebrow">If you like…</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">Podcasts and shows like [REDACTED]</h1>
      <p className="mt-5 text-lg text-paper/90 max-w-prose">Honest comparisons, one at a time: what [REDACTED] shares with something you already love, what it doesn&apos;t, and where to start if that&apos;s where you&apos;re coming from.</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {like.map((l) => (
          <li key={l.slug}>
            <Link href={`/like/${l.slug}`} className="group flex flex-col h-full border border-line bg-ink-2/70 p-5 hover:border-yellow">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow">{KIND_LABEL[l.kind ?? "podcast"]}</span>
              <span className="display text-3xl mt-1 group-hover:text-yellow">{l.name}</span>
              <span className="mt-3 text-sm text-paper/80 line-clamp-3">{l.description}</span>
              <span className="mt-auto pt-4 flex items-center justify-between gap-3 text-xs text-muted">
                <span>Start with {l.startEpisode ?? "S1 E1"}</span>
                <Arrow className="text-muted group-hover:text-yellow shrink-0" width={16} height={16} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
