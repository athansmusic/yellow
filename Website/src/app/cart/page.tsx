import type { Metadata } from "next";
import Link from "next/link";
import { getProducts, toCard } from "@/lib/catalog";
import { getDoc } from "@/lib/content";
import { COLLECTIONS } from "@/lib/storeTaxonomy";
import { CartView } from "@/components/CartView";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };
export const revalidate = 900;

export default async function CartPage() {
  const [products, settings] = await Promise.all([getProducts().catch(() => []), getDoc("settings").catch(() => null)]);
  const suggestions = products.map((p) => ({ p: toCard(p), collection: COLLECTIONS.find((c) => c.match.test(p.name))?.id }));
  const promo = settings?.promoEnabled && settings.promoCode ? { code: settings.promoCode, text: settings.promoText } : null;
  return (
    <Container className="py-10 sm:py-16 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-5xl sm:text-7xl">Cart</h1>
        <Link href="/store" className="text-sm text-muted hover:text-yellow underline underline-offset-4">
          ← Continue shopping
        </Link>
      </div>
      <CartView suggestions={suggestions} promo={promo} />
    </Container>
  );
}
