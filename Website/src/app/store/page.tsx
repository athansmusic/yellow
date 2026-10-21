import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getProducts, sortSizes, toCard, type Product } from "@/lib/catalog";
import { getDoc } from "@/lib/content";
import { COLLECTIONS, TAXONOMY, subLabel, type Category } from "@/lib/storeTaxonomy";
import { ProductCard } from "@/components/ProductCard";
import { StoreHero, type HeroItem } from "@/components/StoreHero";
import { ShowMore } from "@/components/ShowMore";
import { StoreNav } from "@/components/StoreNav";
import { StoreMobileNav } from "@/components/StoreMobileNav";
import { Container } from "@/components/ui";
import { Arrow } from "@/components/Icons";
import { assertVisible } from "@/lib/visibility";

export const metadata: Metadata = { title: "Store", description: "Official REDACTED merch: shirts, hoodies, hats, stickers, patches, flags, prints, and more. Printed to order. Free US shipping on orders $40+, flat rate worldwide.", alternates: { canonical: "/store" } };
export const revalidate = 900;

const TRUST: [string, string][] = [
  ["Printed to order", "Made after you order it"],
  ["Ships in 3 to 7 days", "Tracking emailed when it leaves"],
  ["Free US shipping over $40", "Flat rate everywhere else"],
  ["Stripe checkout", "Cards, Apple Pay, Google Pay"],
];

export default async function StorePage({ searchParams }: { searchParams: Promise<{ c?: string; t?: string; col?: string; sort?: string; artist?: string }> }) {
  await assertVisible("/store");
  const sp = await searchParams;
  const [all, featured] = await Promise.all([getProducts(), getDoc("featured").catch(() => ({ slugs: [] as string[] }))]);

  const category = TAXONOMY.find((c) => c.id === sp.c)?.id as Category | undefined;
  const sub = category ? TAXONOMY.find((c) => c.id === category)!.subs.find((s) => s.id === sp.t)?.id : undefined;
  const collection = COLLECTIONS.find((c) => c.id === sp.col);
  const artists = [...new Set(all.map((p) => p.artist).filter((a): a is string => !!a))].sort();
  const artist = artists.find((a) => a === sp.artist);
  const sort = sp.sort === "low" || sp.sort === "high" || sp.sort === "az" || sp.sort === "new" ? sp.sort : "featured";

  const counts: Record<string, number> = { all: all.length };
  for (const p of all) {
    counts[p.category] = (counts[p.category] ?? 0) + 1;
    if (p.sub) counts[`${p.category}/${p.sub}`] = (counts[`${p.category}/${p.sub}`] ?? 0) + 1;
  }

  let list = all;
  if (artist) list = list.filter((p) => p.artist === artist);
  else if (collection) list = list.filter((p) => collection.match.test(p.name));
  else if (category) list = list.filter((p) => p.category === category && (!sub || p.sub === sub));
  if (sort === "low") list = [...list].sort((a, b) => a.priceCents - b.priceCents);
  if (sort === "high") list = [...list].sort((a, b) => b.priceCents - a.priceCents);
  if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "new") list = [...list].sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew) || b.id - a.id);

  const title = artist ? `Art by ${artist}` : collection ? collection.label : sub ? subLabel(category!, sub) : category ? TAXONOMY.find((c) => c.id === category)!.label : "Everything";
  const isFront = !category && !collection && !artist;
  const collections = COLLECTIONS.map((c) => ({ ...c, items: all.filter((p) => c.match.test(p.name)) })).filter((c) => c.items.length >= 2);

  // Hero: admin-picked products (the same picks drive the home page rail), else the first four.
  const picked = featured.slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is Product => !!p);
  const heroItems: HeroItem[] = (picked.length ? picked : all.slice(0, 4)).map((p) => {
    const col = collections.find((c) => c.match.test(p.name));
    const facts = [
      p.colors.filter((c) => c && !/glossy|matte/i.test(c)).length > 1 ? `${p.colors.length} colors` : "",
      p.sizes.length > 1 ? `Sizes ${sortSizes(p.sizes)[0]} to ${sortSizes(p.sizes).at(-1)}` : "",
      p.blank ?? "",
    ].filter(Boolean);
    return { slug: p.slug, name: p.name, image: p.image, alt: p.images.find((i) => i && i !== p.image), blurb: facts.join(" · "), priceCents: p.priceCents, priceMaxCents: p.priceMaxCents, artist: p.artist, isNew: p.isNew, collection: col && { id: col.id, label: col.label, count: col.items.length } };
  });

  const href = (o: { sort?: string }) => {
    const q = new URLSearchParams();
    if (collection) q.set("col", collection.id);
    if (category) q.set("c", category);
    if (sub) q.set("t", sub);
    const s = o.sort ?? sort;
    if (s !== "featured") q.set("sort", s);
    const str = q.toString();
    return `/store${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <div className="border-b border-line bg-ink/60">
        <Container className="pt-10 sm:pt-14">
          <div className="flex flex-wrap items-end justify-between gap-6 pb-6">
            <div>
              <p className="eyebrow">Official merch</p>
              <h1 className="display text-5xl sm:text-7xl leading-[1] mt-1">Store</h1>
            </div>
            <p className="inline-block bg-yellow text-ink display text-lg px-3 py-1">Free US shipping on $40+ · flat rate worldwide</p>
          </div>
          <div className="hidden sm:block">
            <StoreNav counts={counts} active={{ category, sub }} />
          </div>
          <StoreMobileNav counts={counts} value={collection ? `/store?col=${collection.id}` : category ? `/store?c=${category}${sub ? `&t=${sub}` : ""}` : "/store"} collectionCounts={Object.fromEntries(collections.map((c) => [c.id, c.items.length]))} />
        </Container>
      </div>

      {/* Trust strip */}
      <div className="border-b border-line bg-ink-2/40">
        <Container>
          <ul className="flex flex-wrap gap-x-8 gap-y-1 py-3 text-sm">
            {TRUST.map(([h, t]) => (
              <li key={h} className="shrink-0 flex items-baseline gap-2">
                <span className="display text-lg text-paper">{h}</span>
                <span className="text-muted hidden sm:inline">{t}</span>
              </li>
            ))}
            <li className="sm:ml-auto">
              <Link href="/store-faq" className="inline-flex items-center gap-1 text-yellow underline underline-offset-4">
                Shipping &amp; returns <Arrow width={12} height={12} />
              </Link>
            </li>
          </ul>
        </Container>
      </div>

      {/* Hero: rotates through the admin-picked products (same picks as the home page rail) */}
      {isFront && heroItems.length > 0 && (
        <section className="border-b border-line">
          <Container className="py-8 sm:py-12">
            <StoreHero items={heroItems} />
          </Container>
        </section>
      )}

      {/* Collections strip */}
      {isFront && collections.length > 0 && (
        <section className="border-b border-line bg-ink-2/60">
          <Container className="py-5">
            <ul className="flex gap-3 overflow-x-auto [scrollbar-width:none] -mx-4 px-4">
              {collections.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link href={`/store?col=${c.id}`} className="group flex items-center gap-3 border border-line bg-ink hover:border-yellow pr-4">
                    <span className="relative block size-14 bg-[#f3f3f3] overflow-hidden">
                      <Image src={c.items[0].image} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span>
                      <span className="display text-lg leading-none block group-hover:text-yellow">{c.label}</span>
                      <span className="text-xs text-muted tabular">{c.items.length} items</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* Shop by Artist */}
      {isFront && artists.length > 0 && (
        <section className="border-b border-line">
          <Container className="py-5">
            <p className="eyebrow mb-3">Shop by Artist</p>
            <ul className="flex flex-wrap gap-2">
              {artists.map((a) => (
                <li key={a}>
                  <Link href={`/store?artist=${encodeURIComponent(a)}`} className="inline-flex items-center gap-2 border border-line bg-ink px-3 py-1.5 text-sm hover:border-yellow hover:text-yellow">
                    {a}
                    <span className="text-xs text-muted tabular">{all.filter((x) => x.artist === a).length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <Container className="py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="display text-3xl">{title}</h2>
            <p className="text-sm text-muted tabular">
              {list.length} item{list.length === 1 ? "" : "s"}
              {collection && (
                <>
                  {" · "}
                  <Link href="/store" className="underline underline-offset-4 hover:text-yellow">
                    Clear
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm" role="group" aria-label="Sort">
            {[
              ["featured", "Featured"],
              ["new", "Newest"],
              ["low", "Price ↑"],
              ["high", "Price ↓"],
              ["az", "A to Z"],
            ].map(([v, l]) => (
              <Link key={v} href={href({ sort: v })} aria-current={sort === v ? "true" : undefined} className={`px-3 py-1.5 border ${sort === v ? "border-yellow text-yellow" : "border-line text-muted hover:text-paper"}`}>
                {l}
              </Link>
            ))}
          </div>
        </div>

        {all[0]?.source === "fixture" && (
          <p className="mt-4 text-xs text-muted border border-line bg-ink-2 p-3">
            Catalog preview: showing a snapshot of the previous store. Add <code>PRINTFUL_API_KEY</code> to load live products from Printful.
          </p>
        )}

        <div className="mt-6">
          <ShowMore total={list.length}>
            {list.map((p, i) => (
              <ProductCard key={p.slug} p={toCard(p)} priority={i < 4} />
            ))}
          </ShowMore>
        </div>
        {list.length === 0 && <p className="py-16 text-center text-muted">Nothing here yet.</p>}

        <div className="mt-12 grid gap-4 sm:grid-cols-3 text-sm">
          {[
            ["Printed to order", "Each item is made after you order it, so nothing sits in a warehouse."],
            ["Ships in 3 to 7 business days", "Then 3 to 7 days in the US, 7 to 25 international. Tracking emailed when it ships."],
            ["Free US shipping over $40", "$5 under that, flat rate everywhere else. Questions? Read the Store FAQ."],
          ].map(([h, t]) => (
            <div key={h} className="border border-line bg-ink-2/60 p-4">
              <p className="display text-xl">{h}</p>
              <p className="text-muted mt-1">{t}</p>
            </div>
          ))}
        </div>
        <Link href="/store-faq" className="inline-flex items-center gap-2 mt-4 text-sm text-yellow underline underline-offset-4">
          Store FAQ &amp; shipping <Arrow width={14} height={14} />
        </Link>
      </Container>
    </>
  );
}
