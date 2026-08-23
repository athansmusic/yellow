import type { Metadata } from "next";
import Image from "next/image";
import { getDoc } from "@/lib/content";
import { SITE } from "@/lib/site";
import { Container } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Fan Art",
  description: "Fan art of [REDACTED] from Tumblr, credited to the artists. Tag your own #the redacted unit to be featured.",
  alternates: { canonical: "/fan-art" },
};
export const revalidate = 300;

export default async function FanArtPage() {
  const items = await getDoc("fanart").catch(() => []);
  return (
    <Container className="py-10 sm:py-16 max-w-6xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Fan art", url: `${SITE.url}/fan-art` }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: "[REDACTED] fan art",
          url: `${SITE.url}/fan-art`,
          image: items.slice(0, 50).map((i) => ({ "@type": "ImageObject", contentUrl: i.image, name: i.title || `Fan art by ${i.artist}`, creator: { "@type": "Person", name: i.artist }, url: i.postUrl })),
        }}
      />
      <p className="eyebrow">From the listeners</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">Fan art</h1>
      <p className="mt-4 text-lg text-paper/90 max-w-prose">
        Everything here was posted to Tumblr with the tag <strong className="text-paper">#the redacted unit</strong>. Tap a piece to see the original post and the artist. Want yours here? Tag it. Don&apos;t want it shown? Add <strong className="text-paper">#keep redacted</strong> and it stays off the stream and the site.
      </p>

      {items.length === 0 ? (
        <p className="mt-12 text-muted">Nothing approved yet. Check back after the next stream.</p>
      ) : (
        <ul className="mt-10 columns-2 md:columns-3 lg:columns-4 gap-4 [&>li]:break-inside-avoid [&>li]:mb-4">
          {items.map((i) => (
            <li key={i.id}>
              <a href={i.postUrl || i.image} target="_blank" rel="noreferrer" className="group block border border-line bg-ink-2 hover:border-yellow">
                <Image src={i.image} alt={i.title ? `${i.title}, by ${i.artist}` : `Fan art by ${i.artist}`} width={i.width || 800} height={i.height || 800} sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw" className="w-full h-auto" />
                <span className="block p-3">
                  {i.title && <span className="block text-sm text-paper/90 line-clamp-2">{i.title}</span>}
                  <span className="block text-xs text-muted mt-1 group-hover:text-yellow">by {i.artist || "unknown"} on Tumblr</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        Art belongs to its artists. If a piece is yours and you want it removed or credited differently, email{" "}
        <a href={`mailto:${SITE.email}?subject=Fan%20art`} className="underline underline-offset-4 hover:text-yellow">
          {SITE.email}
        </a>
        .
      </p>
    </Container>
  );
}
