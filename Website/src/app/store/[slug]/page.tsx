import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts, money, sortSizes } from "@/lib/catalog";
import { getSizeGuide } from "@/lib/printful";
import { COLLECTIONS, TAXONOMY, subLabel } from "@/lib/storeTaxonomy";
import { SITE } from "@/lib/site";
import { PRODUCTION_DAYS, US_UNDER_RATE_CENTS } from "@/lib/shipping";
import { ProductBuy } from "@/components/ProductBuy";
import { ProductCard } from "@/components/ProductCard";
import { SizeGuide } from "@/components/SizeGuide";
import { Container, Crumbs } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

export const revalidate = 900;

export async function generateStaticParams() {
  try {
    return (await getProducts()).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  return { title: p.name, description: clip(p.description.split("\n")[0] || `${p.name}, ${money(p.priceCents)}`), alternates: { canonical: `/store/${p.slug}` }, openGraph: { siteName: "REDACTED", images: [{ url: p.image }] } };
}

/** Search snippets cut off around 160 characters. */
function clip(s: string, n = 158) {
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

/** Printful descriptions are plain text with "•" bullet lines. Split into paragraphs + bullet list. */
function parseDescription(d: string) {
  const lines = d.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const paras: string[] = [];
  const bullets: string[] = [];
  let disclaimer: string | undefined;
  for (const l of lines) {
    if (/^[•\-*]\s*/.test(l)) bullets.push(l.replace(/^[•\-*]\s*/, ""));
    else if (/^disclaimer:/i.test(l)) disclaimer = l.replace(/^disclaimer:\s*/i, "");
    else paras.push(l);
  }
  return { paras, bullets, disclaimer };
}

/** Pulls a "runs small / order one size up / true to size" sentence out of the description, if there is one. */
function parseFitNote(d: string): string | undefined {
  const FIT_RE = /runs (small|large)|order (one )?size (up|larger|down|smaller)|true to size/i;
  for (const rawLine of d.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[•\-*]\s*/, "").replace(/^disclaimer:\s*/i, "");
    if (!line) continue;
    const sentence = line.split(/(?<=[.!?])\s+/).find((s) => FIT_RE.test(s));
    if (sentence) return sentence.trim();
  }
  return undefined;
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  await assertVisible("/store");
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();
  const [all, guide] = await Promise.all([getProducts(), p.catalogProductId && p.sizes.length ? getSizeGuide(p.catalogProductId) : Promise.resolve(null)]);

  // Related: same subcategory first (title stays on that subcategory unless there's fewer than 2), else same category.
  const sameSub = p.sub ? all.filter((x) => x.slug !== p.slug && x.sub === p.sub) : [];
  const useSub = sameSub.length >= 2;
  const related = (useSub ? sameSub : all.filter((x) => x.slug !== p.slug && x.category === p.category)).slice(0, 4);
  const catLabel = TAXONOMY.find((c) => c.id === p.category)?.label ?? "Store";
  const subL = subLabel(p.category, p.sub);
  const relatedLabel = useSub && subL ? subL.toLowerCase() : catLabel.toLowerCase();
  const relatedHref = useSub ? `/store?c=${p.category}&t=${p.sub}` : `/store?c=${p.category}`;

  // Collection strip in the buy box: only worth showing with 2+ siblings.
  const prodCollection = COLLECTIONS.find((c) => c.match.test(p.name));
  const collectionItems = prodCollection ? all.filter((x) => prodCollection.match.test(x.name)) : [];
  const collectionSiblings = collectionItems.filter((x) => x.slug !== p.slug);
  const siblings = collectionSiblings.length >= 2 ? collectionSiblings.slice(0, 4).map((x) => ({ slug: x.slug, name: x.name, image: x.image, priceCents: x.priceCents, priceMaxCents: x.priceMaxCents })) : [];
  const collection = prodCollection && collectionSiblings.length >= 2 ? { id: prodCollection.id, label: prodCollection.label, count: collectionItems.length } : undefined;

  const desc = parseDescription(p.description);
  const fitNote = parseFitNote(p.description);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images.map((i) => (i.startsWith("http") ? i : `${SITE.url}${i}`)),
    description: desc.paras.join(" "),
    brand: { "@type": "Brand", name: "REDACTED" },
    ...(p.blank ? { material: p.blank } : {}),
    ...(p.artist ? { creator: { "@type": "Person", name: p.artist } } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: (p.priceCents / 100).toFixed(2),
      highPrice: (p.priceMaxCents / 100).toFixed(2),
      offerCount: p.variants.length,
      availability: "https://schema.org/InStock",
      url: `${SITE.url}/store/${p.slug}`,
      // Google requires shipping + returns on Product markup for merchant rich results.
      // Facts mirror /store-terms: $5 US under $40, free at $40+; printed to order, so no
      // change-of-mind returns (damaged/misprinted replacements are warranty, not returns).
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: (US_UNDER_RATE_CENTS / 100).toFixed(2), currency: "USD" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: PRODUCTION_DAYS[0], maxValue: PRODUCTION_DAYS[1], unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 7, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy", applicableCountry: "US", returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted" },
    },
  };

  return (
    <Container className="py-6 sm:py-10">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Store", url: `${SITE.url}/store` }, { name: catLabel, url: `${SITE.url}/store?c=${p.category}` }, { name: p.name, url: `${SITE.url}/store/${p.slug}` }])} />
      <Crumbs items={[{ label: "Store", href: "/store" }, { label: catLabel, href: `/store?c=${p.category}` }, ...(subL ? [{ label: subL, href: `/store?c=${p.category}&t=${p.sub}` }] : []), { label: p.name }]} />

      <div className="mt-6">
        <ProductBuy product={{ ...p, description: "" }} siblings={siblings} collection={collection} fitNote={fitNote} />
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_minmax(0,28rem)]">
        <section>
          <h2 className="display text-3xl mb-4">About this item</h2>
          {desc.paras.map((t, i) => (
            <p key={i} className="text-paper/85 max-w-prose mb-3">
              {t}
            </p>
          ))}
          {desc.bullets.length > 0 && (
            <ul className="mt-2 grid gap-1.5 text-sm text-paper/85 max-w-prose">
              {desc.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-yellow">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {desc.disclaimer && <p className="mt-4 text-xs text-muted max-w-prose">{desc.disclaimer}</p>}
          {p.blank && <p className="mt-4 text-xs text-muted">Blank: {p.blank}</p>}
        </section>
        <aside className="grid gap-3 content-start">
          {guide?.size_tables?.length ? <SizeGuide tables={guide.size_tables} sizes={sortSizes(p.sizes)} /> : null}
          <div className="border border-line bg-ink-2/70 p-4 text-sm">
            <p className="display text-2xl">Shipping &amp; returns</p>
            <p className="text-muted mt-2">Printed to order, ships in 3 to 7 business days. Free US shipping on orders $40+, flat rate worldwide. Damaged or misprinted? Email us within 30 days and we replace it.</p>
            <Link href="/store-faq" className="inline-block mt-2 text-yellow underline underline-offset-4">
              Store FAQ
            </Link>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display text-3xl sm:text-4xl">More {relatedLabel}</h2>
            <Link href={relatedHref} className="text-sm text-yellow underline underline-offset-4">
              See all
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.slug} p={r} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
