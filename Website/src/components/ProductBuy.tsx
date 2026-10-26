"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { money, sortSizes } from "@/lib/money";
import type { Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { swatch } from "@/lib/swatches";
import { priceRange } from "./ProductCard";
import { Price, PriceRange } from "@/lib/discount";

type Sibling = { slug: string; name: string; image: string; priceCents: number; priceMaxCents: number };

export function ProductBuy({
  product: p,
  siblings = [],
  collection,
  fitNote,
}: {
  product: Product;
  siblings?: Sibling[];
  collection?: { id: string; label: string; count: number };
  fitNote?: string;
}) {
  const { add } = useCart();
  const sizes = sortSizes(p.sizes);
  const colors = p.colors;
  const [size, setSize] = useState<string | undefined>(sizes.length === 1 ? sizes[0] : undefined);
  const [color, setColor] = useState<string | undefined>(colors.length === 1 ? colors[0] : undefined);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);

  const variant = useMemo(() => {
    return p.variants.find((v) => (sizes.length ? v.size === size : true) && (colors.length ? v.color === color : true));
  }, [p.variants, size, color, sizes.length, colors.length]);

  const needs = [sizes.length && !size ? "size" : null, colors.length && !color ? "color" : null].filter(Boolean) as string[];
  // A chosen variant has one price to discount; before that it may be a range, which stays plain.
  const priceNode = variant ? (
    <Price cents={variant.priceCents} />
  ) : (
    <PriceRange min={p.priceCents} max={p.priceMaxCents} />
  );
  // A selected colour with a generated mockup set (front, back, left, right, ...) takes over the whole
  // strip, so every colour shows the same set of angles instead of just one photo for non-default colours.
  const colorImages = useMemo(() => {
    if (!color) return null;
    const v = p.variants.find((v) => v.color === color && v.images?.length);
    return v?.images ?? null;
  }, [p.variants, color]);
  // Every per-colour variant preview belongs in the thumbnail strip, not just the gallery photos, so
  // picking any colour always has a matching thumbnail to highlight instead of leaving the strip looking
  // disconnected from the selection.
  const images = useMemo(() => {
    if (colorImages) return colorImages;
    const base = p.images.length ? p.images : [p.image];
    const variantImages = Array.from(new Set(p.variants.map((v) => v.image).filter(Boolean))) as string[];
    const extra = variantImages.filter((src) => !base.includes(src));
    return extra.length ? [...base, ...extra] : base;
  }, [colorImages, p.images, p.image, p.variants]);
  // Preview follows whatever has been chosen so far (color alone is enough), like Printful's own pages.
  // Skipped once a colour has its own mockup set, which already leads with the front angle.
  const preview = useMemo(
    () => (colorImages ? undefined : p.variants.find((v) => (!color || v.color === color) && (!size || v.size === size))?.image),
    [colorImages, p.variants, color, size],
  );
  const [manual, setManual] = useState<string | null>(null);
  const shown = manual ?? preview ?? images[img] ?? p.image;

  // Which sizes are available for the chosen color (and vice versa)
  const sizeOk = (s: string) => p.variants.some((v) => v.size === s && (!color || v.color === color) && v.available);
  const colorOk = (c: string) => p.variants.some((v) => v.color === c && (!size || v.size === size) && v.available);


  // Phone-only sticky bar once the buy box itself scrolls out of view, like StickyStart.
  const boxRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function onAdd() {
    if (!variant) return;
    add(
      {
        variantId: variant.id,
        slug: p.slug,
        name: p.name,
        variantLabel: [variant.color, variant.size].filter(Boolean).join(" · ") || undefined,
        priceCents: variant.priceCents,
        image: variant.image ?? p.image,
      },
      qty,
    );
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Gallery */}
        <div className="min-w-0">
          <div className="relative aspect-square bg-[#f3f3f3] border border-line overflow-hidden">
            <Image key={shown} src={shown} alt={p.name} fill priority sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
          </div>
          {images.length > 1 && (
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="Product images">
              {images.map((src, i) => (
                <li key={src}>
                  <button type="button" onClick={() => { setImg(i); setManual(src); }} aria-label={`Image ${i + 1}`} aria-pressed={shown === src} className={`relative size-16 sm:size-20 shrink-0 border-2 ${shown === src ? "border-yellow" : "border-line"} bg-[#f3f3f3]`}>
                    <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Buy box */}
        <div ref={boxRef} className="lg:sticky lg:top-24 self-start min-w-0">
          <h1 className="display text-4xl sm:text-5xl">{p.name}</h1>
          <p className="mt-2 display text-3xl text-yellow tabular">{priceNode}</p>
          {p.artist && (
            <p className="mt-1 text-sm text-muted">
              Art by{" "}
              <Link href={`/store?artist=${encodeURIComponent(p.artist)}`} className="text-yellow hover:underline underline-offset-2">
                {p.artist}
              </Link>
              {p.artistUrl && (
                <>
                  {" · "}
                  <a href={p.artistUrl} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-yellow underline underline-offset-2">
                    their site
                  </a>
                </>
              )}
            </p>
          )}

          {colors.length > 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold mb-2">
                Color{color ? <span className="text-muted font-normal"> · {color}</span> : null}
              </legend>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setColor(c); setManual(null); setImg(0); }}
                    aria-pressed={color === c}
                    disabled={!colorOk(c)}
                    title={c}
                    aria-label={c}
                    style={{ background: swatch(c) }}
                    className={`size-7 rounded-full border-2 ${color === c ? "border-yellow" : "border-line hover:border-paper"} disabled:opacity-40`}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {sizes.length > 0 && (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold mb-2 flex justify-between w-full">
                <span>
                  Size{size ? <span className="text-muted font-normal"> · {size}</span> : null}
                </span>
                <a href="#size-guide" className="text-xs text-yellow underline underline-offset-2 font-normal">
                  Size guide
                </a>
              </legend>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} type="button" onClick={() => { setSize(s); setManual(null); }} aria-pressed={size === s} disabled={!sizeOk(s)} className={`min-w-12 px-3 py-2 text-sm border ${size === s ? "border-yellow text-yellow" : "border-line hover:border-paper"} disabled:opacity-40 disabled:line-through`}>
                    {s}
                  </button>
                ))}
              </div>
              {fitNote && <p className="mt-2 text-xs text-muted">{fitNote}</p>}
            </fieldset>
          )}

          <div className="mt-6 flex gap-3 items-stretch">
            <label className="grid text-xs text-muted">
              <span className="sr-only">Quantity</span>
              <select value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label="Quantity" className="field !w-20 h-full">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={onAdd} disabled={!variant || !variant.available} className="btn btn-yellow flex-1">
              {needs.length ? `Select ${needs.join(" & ")}` : variant && !variant.available ? "Sold out" : "Add to cart"}
            </button>
          </div>

          <ul className="mt-5 text-sm text-muted grid gap-1">
            <li>Free US shipping on $40+ · flat rate worldwide</li>
            <li>Printed to order in the US, ships in 3 to 7 business days</li>
            <li>
              Damaged or misprinted?{" "}
              <Link href="/store-faq" className="text-yellow underline underline-offset-2">
                Email us within 30 days and we replace it
              </Link>
            </li>
          </ul>

          {collection && siblings.length > 0 && (
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Also in {collection.label}</p>
                <Link href={`/store?col=${collection.id}`} className="text-xs text-yellow underline underline-offset-2">
                  See all {collection.count}
                </Link>
              </div>
              <ul className="mt-3 grid gap-2">
                {siblings.slice(0, 4).map((s) => (
                  <li key={s.slug}>
                    <Link href={`/store/${s.slug}`} className="flex items-center gap-3 group">
                      <span className="relative size-10 shrink-0 overflow-hidden bg-[#f3f3f3] border border-line">
                        <Image src={s.image} alt="" fill sizes="40px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm truncate group-hover:text-yellow">{s.name}</span>
                      <span className="text-xs text-muted tabular">
                        <PriceRange min={s.priceCents} max={s.priceMaxCents} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Phone-only sticky add-to-cart, once the buy box has scrolled out of view */}
      <div className={`sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur px-4 py-2 flex items-center gap-3 transition-transform bottom-bar ${showSticky ? "translate-y-0" : "translate-y-full"}`} aria-hidden={!showSticky}>
        <span className="display text-lg text-yellow tabular flex-1 truncate">{priceNode}</span>
        <button type="button" onClick={onAdd} disabled={!variant || !variant.available} className="btn btn-yellow">
          {needs.length ? `Select ${needs.join(" & ")}` : variant && !variant.available ? "Sold out" : "Add to cart"}
        </button>
      </div>
    </>
  );
}
