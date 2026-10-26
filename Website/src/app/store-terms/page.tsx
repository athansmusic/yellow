import type { Metadata } from "next";
import Link from "next/link";
import { POLICY_UPDATED, SITE } from "@/lib/site";
import { FREE_US_THRESHOLD_CENTS, PRODUCTION_DAYS, US_UNDER_RATE_CENTS } from "@/lib/shipping";
import { money } from "@/lib/money";
import { Container, Crumbs } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Store Terms, Returns & Refunds",
  description: "Terms of sale, returns, refunds, replacements, and promo code rules for the official REDACTED store. Everything is printed to order.",
  alternates: { canonical: "/store-terms" },
};

const free = money(FREE_US_THRESHOLD_CENTS);
const under = money(US_UNDER_RATE_CENTS);
const prod = `${PRODUCTION_DAYS[0]} to ${PRODUCTION_DAYS[1]} business days`;

const SECTIONS: [string, string][] = [
  ["orders", "Orders and payment"],
  ["made-to-order", "Made to order"],
  ["cancellations", "Cancellations and changes"],
  ["returns", "Returns and refunds"],
  ["lost", "Lost or undelivered packages"],
  ["sizing", "Sizing and colors"],
  ["promo", "Promo codes"],
  ["artwork", "Artwork and fan use"],
  ["privacy", "Privacy"],
  ["changes", "Changes to these terms"],
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="display text-3xl mt-10 scroll-mt-24">
      {children}
    </h2>
  );
}

export default function StoreTerms() {
  const host = SITE.url.replace(/^https?:\/\//, "");
  return (
    <Container className="py-10 sm:py-16 max-w-5xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Store", url: `${SITE.url}/store` }, { name: "Store terms", url: `${SITE.url}/store-terms` }])} />
      <Crumbs items={[{ label: "Store", href: "/store" }, { label: "Terms & returns" }]} />
      <h1 className="display text-5xl sm:text-7xl mt-4">Store terms</h1>
      <p className="mt-2 text-sm text-muted">Last updated {POLICY_UPDATED} · Operated by {SITE.studio.name}, Texas, USA</p>

      {/* In short */}
      <section aria-labelledby="in-short" className="mt-8 border border-yellow/60 bg-yellow/5 p-5 sm:p-6">
        <h2 id="in-short" className="eyebrow text-yellow">
          In short
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-paper/90">
          {[
            "Everything is printed to order, so it ships in " + prod + ".",
            "Damaged or misprinted? Free replacement or full refund, within 30 days of delivery.",
            "No returns for size or change of mind, because nothing is pre-made.",
            "Cancel or change an order any time before production starts.",
            `US shipping is free on orders of ${free} or more (${under} under that); flat rate elsewhere.`,
            "One promo code per order, on subtotals of $25 or more.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-yellow">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] items-start">
        <nav aria-label="Sections" className="hidden lg:block sticky top-24">
          <p className="eyebrow mb-2">Contents</p>
          <ol className="grid gap-1 text-sm">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block py-1 text-paper/75 hover:text-yellow">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="prose-site max-w-prose">
          <p className="text-paper/85">
            These terms cover purchases from the official REDACTED store at {host}/store, run by {SITE.studio.name}. Buying something means you agree to them. Questions:{" "}
            <a href={`mailto:${SITE.email}?subject=Store`}>{SITE.email}</a>.
          </p>

          <H2 id="orders">Orders and payment</H2>
          <p>
            Prices are in US dollars. Payment is taken by Stripe at checkout; we never see or store your card details. US shipping is free on orders of {free} or more and {under} under that. Everywhere else is a flat rate by region, shown in the cart before you pay. Any import duties or taxes charged by your country on delivery are your responsibility.
          </p>
          <p>You&apos;ll get an order confirmation by email, and a tracking number when your order ships. If you don&apos;t receive the confirmation, check your spam folder, then email us with the name and address used.</p>

          <H2 id="made-to-order">Made to order</H2>
          <p>
            Everything in the store is printed and assembled after you order it. Production takes {prod} before shipping, and delivery estimates by region are on the <Link href="/store-faq#shipping">Store FAQ</Link>. Because nothing is pre-made, please check the size guide on each product before you buy.
          </p>

          <H2 id="cancellations">Cancellations and changes</H2>
          <p>Email us as soon as possible after ordering. If production hasn&apos;t started we&apos;ll cancel or change the order for a full refund. Once an item is in production it can&apos;t be cancelled or changed.</p>

          <H2 id="returns">Returns and refunds</H2>
          <p>Because every item is made for you, we can&apos;t accept returns or give refunds for change of mind, wrong size ordered, or a shade of color looking slightly different on screen than in print.</p>
          <p>
            If something arrives damaged, misprinted, or different from what you ordered, we&apos;ll replace it at no cost or refund you in full. Email <a href={`mailto:${SITE.email}?subject=Store%20order`}>{SITE.email}</a> within 30 days of delivery with your order number and a photo of the problem. Refunds go back to the original payment method and appear within 5 to 10 business days.
          </p>

          <H2 id="lost">Lost or undelivered packages</H2>
          <p>Email us and we&apos;ll send a replacement or refund you if:</p>
          <ul>
            <li>Tracking says delivered but you don&apos;t have it: check with neighbours and your carrier first, then email us within 14 days.</li>
            <li>Tracking hasn&apos;t moved for 21 days (US orders).</li>
            <li>Tracking hasn&apos;t moved for 30 days (orders outside the US).</li>
          </ul>
          <p>If a package comes back to us because the address was wrong or incomplete, we can reship it once you&apos;ve covered the new postage.</p>

          <H2 id="sizing">Sizing and colors</H2>
          <p>Size guides are measured flat from the actual garments and are on every product page. Print colors can vary slightly between batches and from how your screen shows them; this isn&apos;t a defect.</p>

          <H2 id="promo">Promo codes</H2>
          <p>One promo code per order, entered at checkout. Codes apply to the product subtotal only (not shipping), need a subtotal of $25 or more unless the code says otherwise, can&apos;t be combined with other codes, and can&apos;t be applied after an order is placed. We can end or change a code at any time.</p>

          <H2 id="artwork">Artwork and fan use</H2>
          <p>
            Designs are copyright {SITE.studio.name} and the credited artists and are for personal use. Fan art and non-commercial use of the logo are welcome under the <Link href="/assets">brand assets</Link> guidelines; please don&apos;t resell our artwork on products.
          </p>

          <H2 id="privacy">Privacy</H2>
          <p>
            How we handle your name, address, and email for orders is in the <Link href="/privacy">privacy policy</Link>. In short: we share what&apos;s needed to print and ship your order with our print partner and the carrier, and nothing else.
          </p>

          <H2 id="changes">Changes to these terms</H2>
          <p>We may update these terms. The date at the top shows the current version, and the terms in force when you ordered are the ones that apply to that order.</p>

          <div className="mt-12 border-t border-line pt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/store-faq">Store FAQ &amp; shipping</Link>
            <Link href="/privacy">Privacy policy</Link>
            <a href={`mailto:${SITE.email}?subject=Store`}>Contact {SITE.email}</a>
            <Link href="/store">Back to the store</Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
