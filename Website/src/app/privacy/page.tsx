import type { Metadata } from "next";
import Link from "next/link";
import { POLICY_UPDATED, SITE } from "@/lib/site";
import { Container } from "@/components/ui";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What [REDACTED] collects (email alerts, store orders, analytics), who processes it, what stays in your browser, and how to unsubscribe or have your data deleted.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS: [string, string][] = [
  ["collect", "What we collect"],
  ["use", "How we use it"],
  ["email", "Email alerts"],
  ["store", "Store orders"],
  ["analytics", "Analytics and embeds"],
  ["storage", "Cookies and local storage"],
  ["processors", "Who processes your data"],
  ["retention", "How long we keep it"],
  ["rights", "Your choices and rights"],
  ["children", "Children"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact"],
];

const PROCESSORS: [string, string, string][] = [
  ["Resend", "Sends our emails", "Your email address and the alert content"],
  ["Supabase", "Stores the email list", "Email address, consent date, where you signed up"],
  ["Stripe", "Takes payment", "Name, email, shipping address, card details (we never see the card)"],
  ["Printful", "Prints and ships orders", "Name, shipping address, email, the items ordered"],
  ["Google Analytics", "Page view statistics", "Anonymised usage data and a first-party cookie"],
  ["Google (YouTube)", "Trailer embeds", "Standard YouTube embed data when you play a video (privacy-enhanced mode)"],
  ["Twitch", "Live status and embeds", "Nothing from you unless you open the Twitch player"],
  ["Vercel", "Hosts the site", "Server logs (IP address, request, time) for security and performance"],
];

const STORAGE: [string, string][] = [
  ["Cart", "What's in your cart, so it survives a reload"],
  ["Shipping country", "The country you picked in the cart"],
  ["Player position", "Where you left off in an episode and the last one you played, so Resume works"],
  ["Recent searches", "Your last few site searches, shown when you open search"],
  ["Alerts popup", "That you dismissed or completed the signup, so it doesn't nag you for 30 days"],
  ["Analytics cookie", "Google Analytics' _ga cookie, which tells repeat visits apart"],
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="display text-3xl mt-10 mb-3 scroll-mt-24">
      {children}
    </h2>
  );
}

export default function Privacy() {
  const mail = (
    <a href={`mailto:${SITE.email}?subject=Privacy`} className="text-yellow underline underline-offset-2">
      {SITE.email}
    </a>
  );
  return (
    <Container className="py-12 sm:py-16 max-w-5xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Privacy policy", url: `${SITE.url}/privacy` }])} />
      <p className="eyebrow">Last updated {POLICY_UPDATED}</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted">Operated by {SITE.studio.name}, Texas, USA</p>

      <section aria-labelledby="in-short" className="mt-8 border border-yellow/60 bg-yellow/5 p-5 sm:p-6">
        <h2 id="in-short" className="eyebrow text-yellow">
          In short
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-paper/90">
          {[
            "We collect your email only if you sign up for alerts, and your name and address only if you buy something.",
            "Alert emails cover new episodes, show news, and the occasional sponsor message from us. One consent covers all of it; one click unsubscribes.",
            "We never sell or hand your list to anyone. Sponsors never see it.",
            "Google Analytics counts visits. You can block it with Google's opt-out add-on or your browser.",
            "Your cart and where you left off in an episode live in your browser, not on our servers.",
            "Email us and we delete what we hold on you.",
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

        <div className="prose-site text-paper/90 max-w-prose">
          <p>This policy covers {SITE.url.replace(/^https?:\/\//, "")} and the official [REDACTED] store. It explains what we collect, why, who handles it, and what you can do about it. We don't build profiles and we don't sell data.</p>

          <H2 id="collect">What we collect</H2>
          <ul className="list-disc pl-5 my-3 grid gap-1">
            <li>
              <strong>Email address</strong>, if you sign up for alerts, plus when and where on the site you signed up.
            </li>
            <li>
              <strong>Order details</strong>, if you buy from the store: name, shipping address, email, phone number if Stripe asks for one, and what you ordered. Payment is handled by Stripe; we never see or store your card number.
            </li>
            <li>
              <strong>Usage data</strong> from Google Analytics: pages viewed, rough location (city level), device and browser type. IP addresses are anonymised by Google before we see anything.
            </li>
            <li>
              <strong>Anything you email us</strong>, which stays in our inbox.
            </li>
          </ul>
          <p>We do not collect phone numbers for text alerts. If we ever add texts, this policy will say so first.</p>

          <H2 id="use">How we use it</H2>
          <ul className="list-disc pl-5 my-3 grid gap-1">
            <li>To send the alert emails you asked for</li>
            <li>To print, ship, and support your store order</li>
            <li>To see which pages and episodes people use, so we can make the site better</li>
            <li>To answer you when you write to us</li>
          </ul>

          <H2 id="email">Email alerts</H2>
          <p>When you sign up, one checkbox covers everything we send: new episode alerts, show news and livestreams, store offers, and now and then a message from a sponsor. Sponsor messages are written and sent by us; sponsors never receive your address or the list. Every email has an unsubscribe link, and unsubscribing stops all of it at once. We never use misleading subject lines and we always identify ourselves.</p>

          <H2 id="store">Store orders</H2>
          <p>
            Checkout runs on Stripe. Your name, address, email, and the items you ordered go to Printful so they can print and ship it, and to the carrier so they can deliver it. We keep the order record to handle replacements, refunds, and tax. The full terms of sale are in the{" "}
            <Link href="/store-terms" className="text-yellow underline underline-offset-2">
              store terms
            </Link>
            .
          </p>

          <H2 id="analytics">Analytics and embeds</H2>
          <p>
            We use Google Analytics 4 to count visits and see which pages get used. It sets a first-party cookie and sends anonymised usage data to Google. To opt out, install{" "}
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer" className="text-yellow underline underline-offset-2">
              Google&apos;s opt-out browser add-on
            </a>
            , block third-party scripts, or use your browser&apos;s tracking protection; the site works the same either way.
          </p>
          <p>Trailers are YouTube embeds in privacy-enhanced mode (youtube-nocookie.com), so YouTube only sets cookies if you play the video. The live dock checks Twitch from our server, not your browser; opening the Twitch player loads Twitch&apos;s own embed under Twitch&apos;s policy.</p>

          <H2 id="storage">Cookies and local storage</H2>
          <p>Most of what the site remembers stays in your browser and never reaches us:</p>
          <ul className="list-disc pl-5 my-3 grid gap-1">
            {STORAGE.map(([k, v]) => (
              <li key={k}>
                <strong>{k}:</strong> {v}
              </li>
            ))}
          </ul>
          <p>Clear your browser&apos;s site data for {SITE.url.replace(/^https?:\/\//, "")} to remove all of it. Signing in to the admin area sets a session cookie for staff only.</p>

          <H2 id="processors">Who processes your data</H2>
          <p>We don&apos;t share your data with anyone except the services that run the site and deliver what you asked for. Each one may only use it for that job.</p>
          <div className="overflow-x-auto my-4 border border-line bg-ink-2/70 not-prose">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5 font-semibold">Service</th>
                  <th className="px-4 py-2.5 font-semibold">Does</th>
                  <th className="px-4 py-2.5 font-semibold">Gets</th>
                </tr>
              </thead>
              <tbody>
                {PROCESSORS.map(([s, d, g]) => (
                  <tr key={s} className="border-t border-line align-top">
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{s}</td>
                    <td className="px-4 py-2.5">{d}</td>
                    <td className="px-4 py-2.5 text-paper/80">{g}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>We will never give or sell your email or address to anyone for their marketing. If the law requires us to hand over data, we&apos;ll only hand over what&apos;s required.</p>

          <H2 id="retention">How long we keep it</H2>
          <ul className="list-disc pl-5 my-3 grid gap-1">
            <li>Email list: until you unsubscribe or ask us to delete you; unsubscribed addresses are kept on a suppression list so we don&apos;t email you again.</li>
            <li>Orders: seven years, for tax and support.</li>
            <li>Analytics: Google&apos;s default of 14 months, then deleted.</li>
            <li>Emails you send us: as long as the conversation is useful.</li>
          </ul>

          <H2 id="rights">Your choices and rights</H2>
          <ul className="list-disc pl-5 my-3 grid gap-1">
            <li>Unsubscribe from emails with the link at the bottom of any email.</li>
            <li>Ask what we hold on you, correct it, or have it deleted: email {mail} and we&apos;ll do it within 30 days.</li>
            <li>Opt out of analytics as described above.</li>
          </ul>
          <p>If you&apos;re in the EU or UK, you also have the rights under GDPR to access, correct, delete, restrict, port, or object to processing of your data, and to withdraw consent at any time. If you&apos;re in California, you have the CCPA rights to know what we collect, request deletion, opt out of any sale (we don&apos;t sell), and not be discriminated against for asking. Same address for all of it: {mail}.</p>

          <H2 id="children">Children</H2>
          <p>The site isn&apos;t directed at children under 13 and we don&apos;t knowingly collect their data. If you think a child has given us an email or placed an order, tell us and we&apos;ll delete it.</p>

          <H2 id="changes">Changes to this policy</H2>
          <p>If we change this policy we&apos;ll update the date at the top and post the new version here. If the change is significant, we&apos;ll say so in the next alert email.</p>

          <H2 id="contact">Contact</H2>
          <p>Questions, or want your data gone? {mail}.</p>

          <div className="mt-12 border-t border-line pt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm not-prose">
            <Link href="/store-terms" className="text-yellow underline underline-offset-2">
              Store terms
            </Link>
            <Link href="/faq" className="text-yellow underline underline-offset-2">
              FAQ
            </Link>
            <a href={`mailto:${SITE.email}`} className="text-yellow underline underline-offset-2">
              {SITE.email}
            </a>
          </div>
        </div>
      </div>
    </Container>
  );
}
