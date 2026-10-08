import Image from "next/image";
import Link from "next/link";
import { formatDate, formatDuration, type Episode } from "@/lib/feed";
import { Arrow } from "./Icons";

const ART: Record<Episode["kind"], string> = {
  episode: "/brand/share.png",
  postmortem: "/spinoffs/postmortem-banner.png",
  minisode: "/brand/share.png",
  bonus: "/brand/share.png",
  trailer: "/brand/share.png",
};

export function EpisodeCard({ ep, priority = false }: { ep: Episode; priority?: boolean }) {
  const href = `/episodes/${ep.slug}`;
  const art = ep.image || ART[ep.kind];
  const label = ep.kind === "episode" ? ep.code : ep.kind === "postmortem" ? "Postmortem" : ep.kind === "minisode" ? "Minisode" : ep.kind === "bonus" ? "We Recommend" : "Trailer";
  return (
    <article className="group relative bg-ink-2 border border-line hover:border-yellow transition-colors flex flex-col">
      <Link href={href} className="block aspect-square relative overflow-hidden bg-ink" aria-hidden tabIndex={-1}>
        <Image src={art} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover group-hover:scale-[1.03] transition-transform" priority={priority} />
      </Link>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="eyebrow text-yellow">{label}</p>
        <h3 className="display text-2xl leading-none">
          <Link href={href} className="hover:text-yellow after:absolute after:inset-0">
            {ep.shortTitle}
          </Link>
        </h3>
        {ep.summary && <p className="text-sm text-muted line-clamp-2">{ep.summary}</p>}
        <p className="mt-auto pt-2 text-xs text-muted flex justify-between tabular">
          <time dateTime={ep.date}>{formatDate(ep.date)}</time>
          <span>{formatDuration(ep.duration)}</span>
        </p>
      </div>
    </article>
  );
}

export function EpisodeRow({ ep }: { ep: Episode }) {
  const href = `/episodes/${ep.slug}`;
  return (
    <li className="relative border-b border-line last:border-b-0">
      <Link href={href} className="group flex items-center gap-4 py-4 hover:text-yellow">
        <span className="display text-yellow text-xl w-16 shrink-0 tabular">{ep.code ?? ""}</span>
        <span className="flex-1 min-w-0">
          <span className="display text-2xl block">{ep.shortTitle}</span>
          {ep.summary && <span className="text-sm text-muted block truncate">{ep.summary}</span>}
        </span>
        <span className="hidden sm:block text-xs text-muted tabular w-28 text-right">{formatDate(ep.date)}</span>
        <Arrow className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    </li>
  );
}
