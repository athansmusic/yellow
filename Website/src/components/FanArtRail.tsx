import Image from "next/image";
import Link from "next/link";
import type { FanArt } from "@/lib/content";
import { Container } from "./ui";

/** Home page rail: a handful of approved Tumblr pieces, credited, linking to the gallery. */
export function FanArtRail({ items }: { items: FanArt[] }) {
  if (items.length < 3) return null;
  return (
    <section className="border-b border-line">
      <Container className="py-12 sm:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">From the listeners</p>
            <h2 className="display text-4xl sm:text-5xl mt-1">Fan art</h2>
          </div>
          <Link href="/fan-art" className="text-sm text-yellow underline underline-offset-4 whitespace-nowrap">
            See all {items.length}
          </Link>
        </div>
        <ul className="mt-6 flex gap-3 overflow-x-auto [scrollbar-width:none] -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
          {items.slice(0, 6).map((i) => (
            <li key={i.id} className="shrink-0 w-44 sm:w-auto">
              <a href={i.postUrl || i.image} target="_blank" rel="noreferrer" className="group block border border-line bg-ink-2 hover:border-yellow">
                <span className="relative block aspect-[4/5] overflow-hidden">
                  <Image src={i.image} alt={i.title ? `${i.title}, by ${i.artist}` : `Fan art by ${i.artist}`} fill sizes="(min-width:1024px) 16vw, (min-width:640px) 33vw, 176px" className="object-cover" />
                </span>
                <span className="block px-2.5 py-2 text-xs text-muted truncate group-hover:text-yellow">by {i.artist || "unknown"}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">Tag #the redacted unit on Tumblr to be featured. #keep redacted to opt out.</p>
      </Container>
    </section>
  );
}
