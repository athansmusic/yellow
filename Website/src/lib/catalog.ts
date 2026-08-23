/**
 * Normalised storefront catalog.
 * Source of truth is Printful (when PRINTFUL_API_KEY is set); otherwise a fixture
 * snapshot of the old Webflow store so the UI is fully browsable in development.
 * Editorial fields (descriptions, category, ordering) live in store-overrides.json
 * and are keyed by product slug so they survive re-syncs.
 */
import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { listSyncProducts, getSyncProduct, getCatalogProduct, printfulEnabled, throttled, type PFSyncVariant } from "./printful";
import { classify, CATEGORIES as TAX_CATEGORIES, type Category as TaxCategory } from "./storeTaxonomy";
import { slugify } from "./feed";
import { getDoc } from "./content";
import { money, sortSizes } from "./money";
export { money, sortSizes };
import fixture from "@/data/products-fixture.json";
import overridesJson from "@/data/store-overrides.json";

export type Category = TaxCategory;
export const CATEGORIES = TAX_CATEGORIES;

export type Variant = {
  id: number; // Printful sync_variant_id (fixture: synthetic negative ids)
  name: string;
  size?: string;
  color?: string;
  priceCents: number;
  image?: string;
  /** Full mockup set (front, back, left, right, ...) for this variant's colour, from scripts/build-mockups.py. */
  images?: string[];
  available: boolean;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: Category;
  sub?: string; // subcategory id from storeTaxonomy
  catalogProductId?: number; // Printful blank product id (for size guide)
  blank?: string; // e.g. "Bella + Canvas 3001"
  priceCents: number; // min variant price
  priceMaxCents: number;
  image: string;
  images: string[];
  description: string; // HTML-safe plain text with \n paragraphs
  artist?: string;
  artistUrl?: string;
  variants: Variant[];
  sizes: string[];
  colors: string[];
  tags: string[];
  /** Editorial "New" badge (store-overrides `new: true`). */
  isNew?: boolean;
  source: "printful" | "fixture";
};

/** The fields a product card needs; keeps RSC payloads small when a page lists the whole catalog. */
export type CardProduct = Pick<Product, "slug" | "name" | "image" | "images" | "priceCents" | "priceMaxCents" | "colors" | "artist" | "isNew">;
export const toCard = (p: Product): CardProduct => ({ slug: p.slug, name: p.name, image: p.image, images: p.images.slice(0, 2), priceCents: p.priceCents, priceMaxCents: p.priceMaxCents, colors: p.colors, artist: p.artist, isNew: p.isNew });

type Override = {
  slug?: string;
  description?: string;
  category?: Category;
  artist?: string;
  artistUrl?: string;
  tags?: string[];
  order?: number;
  hidden?: boolean;
  new?: boolean;
};
const overrides = overridesJson as { byName: Record<string, Override>; typeDescriptions: Record<string, string>; hiddenIds?: Record<string, string> };

const cents = (s: string | number) => Math.round(Number(s) * 100);

/** Old-store mockup gallery, keyed by the product's current slug: public/products/gallery/<slug>/NN.webp. */
const galleryCache = new Map<string, string[]>();
function galleryImages(slug: string): string[] {
  const cached = galleryCache.get(slug);
  if (cached) return cached;
  let files: string[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "products", "gallery", slug);
    files = fs
      .readdirSync(dir)
      .filter((f) => /\.(webp|jpe?g|png)$/i.test(f))
      .sort()
      .map((f) => `/products/gallery/${slug}/${f}`);
  } catch {
    files = [];
  }
  if (files.length) galleryCache.set(slug, files);
  return files;
}

/** Matches scripts/build-mockups.py's color_slug(): lowercase, spaces/slashes to hyphens. */
function colorSlug(color: string): string {
  return color
    .toLowerCase()
    .trim()
    .replace(/[\s/]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Per-colour mockup set (front, back, left, right, ...): public/products/gallery/<slug>/<color-slug>/NN.webp. */
const colorGalleryCache = new Map<string, string[]>();
function colorGalleryImages(slug: string, color: string): string[] {
  const key = `${slug}/${colorSlug(color)}`;
  const cached = colorGalleryCache.get(key);
  if (cached) return cached;
  let files: string[] = [];
  try {
    const dir = path.join(process.cwd(), "public", "products", "gallery", slug, colorSlug(color));
    files = fs
      .readdirSync(dir)
      .filter((f) => /\.(webp|jpe?g|png)$/i.test(f))
      .sort()
      .map((f) => `/products/gallery/${slug}/${colorSlug(color)}/${f}`);
  } catch {
    files = [];
  }
  if (files.length) colorGalleryCache.set(key, files);
  return files;
}

export function guessCategory(name: string, productTypeName = ""): Category {
  const n = `${name} ${productTypeName}`.toLowerCase();
  if (/(t-shirt|tee|hoodie|bomber|shorts|joggers|beanie|hat|cap|slip-on|shoe|sweat|jacket|crew neck|sock)/.test(n)) return "apparel";
  if (/(mug|desk mat|mouse pad|puzzle|journal|post-it|note|coaster|tumbler|bowl|poster|print|flag|pillow|blanket|candle)/.test(n)) return "home";
  return "accessories";
}

function typeDescription(name: string, productTypeName: string) {
  const key = Object.keys(overrides.typeDescriptions).find((k) => new RegExp(k, "i").test(`${name} ${productTypeName}`));
  return key ? overrides.typeDescriptions[key] : "";
}

function variantSizeColor(v: PFSyncVariant, productName: string) {
  // Printful's explicit size/color fields are authoritative: color is `null` (not just falsy-ish) when a
  // product genuinely has no colour axis (posters, mugs sized only), so treat "field present" as final,
  // and only parse the variant name for whichever field Printful didn't send at all.
  const sizeKnown = v.size !== undefined;
  const colorKnown = v.color !== undefined;
  let size = v.size ?? undefined;
  let color = v.color ?? undefined;
  if (sizeKnown && colorKnown) return { size, color };

  // Printful names variants "Product / Color / Size" (order varies).
  // Variant names keep the name the product had when it was created; after a rename the first segment is the OLD name.
  const prefixed = v.name.startsWith(productName);
  const rest = prefixed ? v.name.slice(productName.length) : v.name;
  let parts = rest.split("/").map((s) => s.trim()).filter(Boolean);
  if (!prefixed && parts.length > 1) parts = parts.slice(1);
  const SIZE_RE = /^(2xs|3xs|xs|s|m|l|xl|2xl|3xl|4xl|5xl|6xl|one size|\d+(\.\d+)?(\s?(oz|in|"|cm|x\s?\d+))?|[0-9]+x[0-9]+.*|a[0-9]|[0-9]+″.*)$/i;
  // Classify each leftover part by shape first, so a size-shaped segment can never be mislabeled as a
  // colour (or vice versa) just because the "other" slot happened to already be filled.
  for (const p of parts) {
    if (SIZE_RE.test(p)) {
      if (!sizeKnown && !size) size = p;
    } else if (!colorKnown && !color) {
      color = p;
    }
  }
  return { size, color };
}

async function fromPrintful(): Promise<Product[]> {
  const summaries = await listSyncProducts();
  const details = await throttled(summaries, (s) => getSyncProduct(s.id));
  // One catalog lookup per distinct blank product (description, type) — cached a day
  const catalogIds = Array.from(new Set(details.flatMap((d) => d.sync_variants.map((v) => v.product?.product_id).filter(Boolean) as number[])));
  const catalog = new Map<number, Awaited<ReturnType<typeof getCatalogProduct>>>();
  await throttled(catalogIds, async (id) => { try { catalog.set(id, await getCatalogProduct(id)); } catch {} });
  const products: Product[] = [];
  for (const d of details) {
    const sp = d.sync_product;
    if (overrides.hiddenIds?.[String(sp.id)]) continue;
    const vars = d.sync_variants.filter((v) => v.synced && !v.is_ignored);
    if (!vars.length) continue;
    const ov = overrides.byName[sp.name] ?? {};
    if (ov.hidden) continue;
    const typeName = vars[0].product?.name ?? "";
    const cp = catalog.get(vars[0].product?.product_id);
    const cls = classify(sp.name, `${cp?.type ?? ""} ${cp?.title ?? ""} ${typeName}`);
    const variants: Variant[] = vars.map((v) => {
      const { size, color } = variantSizeColor(v, sp.name);
      const preview = v.files.find((f) => f.type === "preview")?.preview_url;
      return {
        id: v.id,
        name: v.name,
        size,
        color,
        priceCents: cents(v.retail_price),
        image: preview ?? v.product?.image,
        available: !v.availability_status || v.availability_status === "active",
      };
    });
    const images = Array.from(new Set([sp.thumbnail_url, ...variants.map((v) => v.image).filter(Boolean) as string[]]));
    const prices = variants.map((v) => v.priceCents);
    products.push({
      id: sp.id,
      slug: ov.slug ?? slugify(sp.name),
      name: sp.name,
      category: ov.category ?? cls.category,
      sub: cls.sub,
      catalogProductId: vars[0].product?.product_id,
      blank: cp?.type_name?.split("|")[0].trim() || cp?.title,
      priceCents: Math.min(...prices),
      priceMaxCents: Math.max(...prices),
      image: sp.thumbnail_url,
      images,
      description: ov.description ?? cp?.description ?? typeDescription(sp.name, typeName),
      artist: ov.artist,
      artistUrl: ov.artistUrl,
      variants,
      sizes: uniq(variants.map((v) => v.size)),
      colors: uniq(variants.map((v) => v.color)),
      tags: ov.tags ?? [],
      isNew: ov.new,
      source: "printful",
    });
  }
  // Guarantee unique slugs (Printful allows duplicate product names)
  const seen = new Map<string, number>();
  for (const p of products) {
    const n = seen.get(p.slug) ?? 0;
    seen.set(p.slug, n + 1);
    if (n > 0) p.slug = `${p.slug}-${p.id}`;
  }
  // Old-store mockup galleries, keyed by the now-final slug; falls back to the Printful thumbnail + variant images.
  for (const p of products) {
    const gallery = galleryImages(p.slug);
    if (gallery.length) p.images = Array.from(new Set([p.image, ...gallery]));
  }
  // Per-colour mockup sets (scripts/build-mockups.py): every variant of a colour shares that colour's list.
  for (const p of products) {
    const byColor = new Map<string, string[]>();
    for (const v of p.variants) {
      if (!v.color) continue;
      if (!byColor.has(v.color)) byColor.set(v.color, colorGalleryImages(p.slug, v.color));
      const imgs = byColor.get(v.color)!;
      if (imgs.length) v.images = imgs;
    }
  }
  return sortProducts(products);
}

function uniq(xs: (string | undefined)[]) {
  return Array.from(new Set(xs.filter(Boolean) as string[]));
}


function sortProducts(ps: Product[]) {
  return ps.sort((a, b) => {
    const oa = overrides.byName[a.name]?.order ?? 500;
    const ob = overrides.byName[b.name]?.order ?? 500;
    // Editorial order first; within a tier, newest (highest Printful id) first
    return oa - ob || b.id - a.id;
  });
}

function fromFixture(): Product[] {
  type F = { slug: string; name: string; price: string; img: string };
  const products = (fixture as F[]).map((f, i): Product => {
    const ov = overrides.byName[f.name] ?? {};
    const fcls = classify(f.name, "");
    const cat = ov.category ?? fcls.category;
    const price = cents(f.price);
    const image = `/products/${f.slug}.${f.img.split(".").pop()}`;
    const gallery = galleryImages(f.slug);
    // Synthetic variants so the UI is exercised; replaced by real Printful variants once the key is set.
    const apparelSizes = /(t-shirt|tee|hoodie|bomber|joggers|shorts|crew neck)/i.test(f.name) ? ["S", "M", "L", "XL", "2XL", "3XL"] : [];
    const variants: Variant[] = apparelSizes.length
      ? apparelSizes.map((s, j) => ({ id: -(i * 100 + j + 1), name: `${f.name} / ${s}`, size: s, priceCents: price, image, available: true }))
      : [{ id: -(i * 100 + 1), name: f.name, priceCents: price, image, available: true }];
    return {
      id: -(i + 1),
      slug: f.slug,
      name: f.name,
      category: cat,
      sub: fcls.sub,
      priceCents: price,
      priceMaxCents: price,
      image,
      images: gallery.length ? [image, ...gallery] : [image],
      description: ov.description ?? typeDescription(f.name, ""),
      artist: ov.artist,
      artistUrl: ov.artistUrl,
      variants,
      sizes: apparelSizes,
      colors: [],
      tags: ov.tags ?? [],
      isNew: ov.new,
      source: "fixture",
    };
  });
  return sortProducts(products.filter((p) => !overrides.byName[p.name]?.hidden));
}

const cachedPrintful = unstable_cache(fromPrintful, ["catalog-printful-v7"], { revalidate: 900, tags: ["catalog"] });

// Last successful catalog, so a Printful hiccup serves slightly stale data instead of breaking the store.
let lastGood: Product[] | null = null;
let inflight: Promise<Product[]> | null = null;

// Requests wait this long on a cold start before falling back to the fixture. `next build` waits much longer so the
// prerendered store pages are built from the real catalog, not the snapshot.
const COLD_START_WAIT_MS = process.env.NEXT_PHASE === "phase-production-build" ? 180_000 : 8000;

/**
 * Catalog with stale-while-revalidate: once a copy exists it is served immediately and refreshed in the
 * background (a full Printful pull is ~70 throttled requests and can take a minute). On a cold start we wait
 * a few seconds, then serve the fixture until the real catalog lands, rather than hanging the page.
 */
export async function getProductsBase(): Promise<Product[]> {
  if (!printfulEnabled()) return fromFixture();
  inflight ??= cachedPrintful()
    .then((p) => (lastGood = p))
    .catch((e) => {
      console.error("Printful catalog failed:", (e as Error).message);
      if (lastGood) return lastGood;
      throw e;
    })
    .finally(() => (inflight = null));
  if (lastGood) return lastGood;
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), COLD_START_WAIT_MS));
  const p = await Promise.race([inflight, timeout]);
  if (p) return p;
  console.warn("Printful catalog still loading; serving fixture for now");
  inflight.catch(() => {});
  return fromFixture();
}

/** Owner-written copy (src/data/store-copy.json, admin/store-copy) overlaid on top of the catalog, keyed by slug. */
function applyStoreCopy(products: Product[], copy: Record<string, { description?: string; artist?: string; artistUrl?: string }>): Product[] {
  return products.map((p) => {
    const c = copy?.[p.slug];
    if (!c) return p;
    return { ...p, description: c.description ?? p.description, artist: c.artist ?? p.artist, artistUrl: c.artistUrl ?? p.artistUrl };
  });
}

export async function getProducts(): Promise<Product[]> {
  const [products, copy] = await Promise.all([getProductsBase(), getDoc("storeCopy")]);
  return applyStoreCopy(products, copy);
}

export async function getProduct(slug: string) {
  return (await getProducts()).find((p) => p.slug === slug);
}

export async function findVariant(variantId: number) {
  for (const p of await getProducts()) {
    const v = p.variants.find((x) => x.id === variantId);
    if (v) return { product: p, variant: v };
  }
  return undefined;
}

