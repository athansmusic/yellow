import type { Metadata } from "next";
import Link from "next/link";
import { FREE_US_THRESHOLD_CENTS, PRODUCTION_DAYS, REGIONS, US_UNDER_RATE_CENTS, WORLDWIDE, arrivalDays } from "@/lib/shipping";
import { money } from "@/lib/money";
import { getDoc } from "@/lib/content";
import { SITE } from "@/lib/site";
import { Container, Crumbs } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Store FAQ & Shipping",
  description: "How the [REDACTED] store works: printed to order, production and delivery times by region, shipping costs, tracking, cancellations, customs, sizing, and what to do if something arrives damaged.",
  alternates: { canonical: "/store-faq" },
};
export const revalidate = 300;

const free = money(FREE_US_THRESHOLD_CENTS);
const under = money(US_UNDER_RATE_CENTS);
const prod = `${PRODUCTION_DAYS[0]} to ${PRODUCTION_DAYS[1]} business days`;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default async function StoreFaq() {
  const settings = await getDoc("settings").catch(() => null);
  const promo = settings?.promoEnabled && settings.promoCode ? settings : null;
  const rows = [...REGIONS, WORLDWIDE].map((r) => {
    const [a, b] = arrivalDays(r.id);
    return { id: r.id, label: r.label, cost: r.id === "us" ? `Free on ${free}+, ${under} under` : money(r.rateCents), arrives: `${a} to ${b} business days` };
  });

  const QA: { q: string; a: React.ReactNode; text: string; open?: boolean }[] = [
    {
      q: "How are your products made?",
      text: `We use a high quality print-on-demand service, and all of our items are made to order: each product is printed, assembled, and packaged after you place your order. We do this to ensure quality, deliverability, and durability.`,
      a: <p>We use a high quality print-on-demand service, and all of our items are made to order: each product is printed, assembled, and packaged after you place your order. We do this to ensure quality, deliverability, and durability.</p>,
      open: true,
    },
    {
      q: "How long will it take to receive my order?",
      text: `Production takes ${prod} before your order ships, then delivery depends on where you are. The table above shows the door-to-door estimate for each region. Delivery times are estimates and can vary with local carriers or customs.`,
      a: (
        <p>
          Production takes {prod} before your order ships, then delivery depends on where you are. The table above shows the door-to-door estimate for each region. Delivery times are estimates and can vary with local carriers or customs.
        </p>
      ),
      open: true,
    },
    {
      q: "How much does shipping cost?",
      text: `Flat rate by region, so you always know the cost upfront. US orders of ${free} or more ship free; under that it is ${under}. Everywhere else is the flat rate in the table above.`,
      a: (
        <p>
          Flat rate by region, so you always know the cost upfront. US orders of {free} or more ship free; under that it is {under}. Everywhere else is the flat rate in the table above.
        </p>
      ),
      open: true,
    },
    {
      q: "Can I track my order?",
      text: "Yes! Once your order ships, you'll receive a tracking number via email so you can follow your package until it arrives.",
      a: <p>Yes! Once your order ships, you&apos;ll receive a tracking number via email so you can follow your package until it arrives.</p>,
    },
    {
      q: "Can I cancel or change my order?",
      text: "Email us as soon as possible after ordering. If production hasn't started we'll cancel or change it for a full refund. Once an item is in production it can't be cancelled or changed, because it's being made just for you.",
      a: (
        <p>
          Email us as soon as possible after ordering. If production hasn&apos;t started we&apos;ll cancel or change it for a full refund. Once an item is in production it can&apos;t be cancelled or changed, because it&apos;s being made just for you.
        </p>
      ),
    },
    {
      q: "What if something arrives damaged or misprinted?",
      text: "We replace it, free. Email us within 30 days of delivery with your order number and a photo and we'll send a new one or refund you in full. Because everything is made to order, we can't take returns for size or change of mind, so check the size guide on each product page.",
      a: (
        <p>
          We replace it, free. Email{" "}
          <a href={`mailto:${SITE.email}?subject=Store%20order`} className="text-yellow underline underline-offset-2">
            {SITE.email}
          </a>{" "}
          within 30 days of delivery with your order number and a photo and we&apos;ll send a new one or refund you in full. Because everything is made to order, we can&apos;t take returns for size or change of mind, so check the size guide on each product page. Full policy:{" "}
          <Link href="/store-terms" className="text-yellow underline underline-offset-2">
            terms &amp; returns
          </Link>
          .
        </p>
      ),
    },
    {
      q: "Will I have to pay customs or import fees?",
      text: "Orders ship from the print partner's nearest facility (US orders print in the US; many European orders print in Europe). If your country charges import duties or VAT on delivery, that's paid by you to the carrier; we don't collect it and can't predict it.",
      a: (
        <p>
          Orders ship from the print partner&apos;s nearest facility (US orders print in the US; many European orders print in Europe). If your country charges import duties or VAT on delivery, that&apos;s paid by you to the carrier; we don&apos;t collect it and can&apos;t predict it.
        </p>
      ),
    },
    {
      q: "How do the sizes run?",
      text: "Every apparel page has a size guide measured from the actual garment. The premium hoodies run small, so go one size up. The Bella + Canvas tees are a retail fit and true to size.",
      a: <p>Every apparel page has a size guide measured from the actual garment. The premium hoodies run small, so go one size up. The Bella + Canvas tees are a retail fit and true to size.</p>,
    },
    {
      q: "Is there a discount code?",
      text: promo ? `Yes. ${promo.promoText}` : "Sign up for episode alerts on the site and we'll send you a code when we run one.",
      a: promo ? (
        <p>
          Yes. {promo.promoText}{" "}
          <Link href="/?alerts=1" className="text-yellow underline underline-offset-2">
            Sign up here
          </Link>
          , then enter <strong className="text-paper">{promo.promoCode}</strong> under the order summary at checkout.
        </p>
      ) : (
        <p>
          Sign up for episode alerts on the site and we&apos;ll send you a code when we run one. Codes go in under the order summary at checkout.
        </p>
      ),
    },
    {
      q: "Who made the art?",
      text: "Every print and design credits its artist on the product page. The Forest Fire series is by Darhak and the Plaster Pigs pieces are by Trevor Henderson. Artists are paid for their work on the store.",
      a: <p>Every print and design credits its artist on the product page. The Forest Fire series is by Darhak and the Plaster Pigs pieces are by Trevor Henderson. Artists are paid for their work on the store.</p>,
    },
  ];

  return (
    <Container className="py-10 sm:py-16 max-w-3xl">
      <JsonLd data={faqJsonLd(QA.map((x) => ({ q: x.q, a: x.text })))} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Store", url: `${SITE.url}/store` }, { name: "Store FAQ", url: `${SITE.url}/store-faq` }])} />
      <Crumbs items={[{ label: "Store", href: "/store" }, { label: "FAQ & shipping" }]} />
      <h1 className="display text-5xl sm:text-7xl mt-4">Store FAQ</h1>
      <p className="mt-4 text-paper/85">
        Here&apos;s a quick guide on how our store works: production, shipping, and all of that. If you have any further questions, email{" "}
        <a href={`mailto:${SITE.email}`} className="text-yellow underline underline-offset-2">
          {SITE.email}
        </a>
        . The fine print is in the{" "}
        <Link href="/store-terms" className="text-yellow underline underline-offset-2">
          store terms
        </Link>
        .
      </p>

      {/* Shipping and delivery, always visible */}
      <section id="shipping" className="mt-10 scroll-mt-24">
        <h2 className="display text-3xl">Shipping &amp; delivery</h2>
        <p className="mt-1 text-sm text-muted">Production {prod}, then transit. Same numbers you see at checkout.</p>
        <div className="mt-4 overflow-x-auto border border-line bg-ink-2/70">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-2.5 font-semibold">Region</th>
                <th className="px-4 py-2.5 font-semibold">Shipping</th>
                <th className="px-4 py-2.5 font-semibold">Arrives in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-semibold">{r.label}</td>
                  <td className="px-4 py-2.5 tabular">{r.cost}</td>
                  <td className="px-4 py-2.5 tabular text-paper/85">{r.arrives}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="display text-3xl mb-3">Questions</h2>
        <div className="grid gap-3">
          {QA.map((x) => (
            <Faq key={x.q} id={slug(x.q)} q={x.q} open={x.open}>
              {x.a}
            </Faq>
          ))}
        </div>
      </section>

      <section className="mt-12 border border-line bg-ink-2/70 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="display text-2xl">Still stuck?</p>
          <p className="text-sm text-paper/80 mt-1">Email us with your order number, or ask in the Discord.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`mailto:${SITE.email}?subject=Store%20order`} className="btn btn-yellow">
            {SITE.email}
          </a>
          <a href="/discord" target="_blank" rel="noreferrer" className="btn btn-ghost">
            Discord
          </a>
        </div>
      </section>

      <Link href="/store" className="inline-block mt-8 text-sm text-yellow underline underline-offset-4">
        Back to the store
      </Link>
    </Container>
  );
}

function Faq({ id, q, children, open = false }: { id: string; q: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details id={id} open={open} className="group bg-ink-2 border border-line open:border-yellow scroll-mt-24">
      <summary className="cursor-pointer list-none p-4 sm:p-5 flex justify-between items-center gap-4 display text-2xl">
        {q}
        <span aria-hidden className="text-yellow transition-transform group-open:rotate-45 text-3xl leading-none">
          +
        </span>
      </summary>
      <div className="px-4 sm:px-5 pb-5 text-paper/85 text-[15px]">{children}</div>
    </details>
  );
}
