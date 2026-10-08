"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { priceRange } from "./ProductCard";
import { useDiscountedRangeText } from "@/lib/discount";

export type HeroItem = {
  slug: string;
  name: string;
  image: string;
  alt?: string;
  blurb: string;
  priceCents: number;
  priceMaxCents: number;
  artist?: string;
  isNew?: boolean;
  collection?: { id: string; label: string; count: number };
};

const INTERVAL = 6000;

/** Rotates through the admin-picked featured products (same picks as the home page rail). */
export function StoreHero({ items }: { items: HeroItem[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), INTERVAL);
    return () => clearInterval(t);
  }, [paused, items.length]);
  const hero = items[i];
  const heroPrice = useDiscountedRangeText(hero?.priceCents ?? 0, hero?.priceMaxCents ?? 0);
  if (!hero) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.1fr)] items-center" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="order-2 lg:order-1">
        <p className="eyebrow">{hero.isNew ? "New this week" : "Featured"}</p>
        <h2 className="display text-4xl sm:text-6xl leading-[1] mt-2">{hero.name}</h2>
        {hero.artist && <p className="mt-2 text-sm uppercase tracking-wider text-muted">Art by {hero.artist}</p>}
        <p className="mt-4 text-paper/85 max-w-prose line-clamp-3">{hero.blurb}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href={`/store/${hero.slug}`} className="btn btn-yellow">
            Shop {heroPrice}
          </Link>
          {hero.collection && (
            <Link href={`/store?col=${hero.collection.id}`} className="text-sm text-paper/80 underline underline-offset-4 hover:text-yellow">
              All {hero.collection.label} ({hero.collection.count})
            </Link>
          )}
        </div>
        {items.length > 1 && (
          <ol className="mt-8 flex items-center gap-2" aria-label="Featured products">
            {items.map((it, n) => (
              <li key={it.slug}>
                <button type="button" onClick={() => setI(n)} aria-label={it.name} aria-current={n === i ? "true" : undefined} className={`block h-1.5 w-8 transition-colors ${n === i ? "bg-yellow" : "bg-line hover:bg-paper/50"}`} />
              </li>
            ))}
          </ol>
        )}
      </div>
      <Link href={`/store/${hero.slug}`} className="order-1 lg:order-2 block border border-line bg-ink-2 p-2 sm:p-3 hover:border-yellow transition-colors">
        <div className="relative aspect-[4/3] sm:aspect-[5/4] bg-[#f3f3f3] overflow-hidden">
          {items.map((it, n) => (
            <Image key={it.slug} src={it.image} alt={it.name} fill sizes="(min-width:1024px) 55vw, 100vw" priority={n === 0} className={`object-cover transition-opacity duration-300 ${n === i ? "opacity-100" : "opacity-0"}`} />
          ))}
          {hero.alt && (
            <div className="absolute right-3 bottom-3 size-20 sm:size-28 border-2 border-ink bg-[#f3f3f3] overflow-hidden">
              <Image src={hero.alt} alt="" fill sizes="112px" className="object-cover" />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
