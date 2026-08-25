import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerBar, PlayerSpacer } from "@/components/PlayerBar";
import { LiveDock } from "@/components/LiveDock";
import { AlertsPopup } from "@/components/AlertsPopup";
import { SearchOverlay } from "@/components/SiteSearch";
import { getDoc } from "@/lib/content";
import { CartProvider } from "@/lib/cart";
import { PlayerProvider } from "@/lib/player";
import { SITE, LISTEN } from "@/lib/site";
import { JsonLd, siteJsonLd } from "@/lib/schema";
import { Analytics, CookieConsent } from "@/components/CookieConsent";
import { ReviewNudge } from "@/components/ReviewNudge";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap", weight: ["400", "500", "600", "700"] });
const nk57 = localFont({ src: "../fonts/NK57MonospaceCdEb.otf", variable: "--font-nk57", display: "swap", weight: "800" });
const nk57wide = localFont({ src: "../fonts/NK57MonospaceExBk.otf", variable: "--font-nk57-wide", display: "swap", weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · REDACTED` },
  // Under 160 characters: search results and social cards truncate past that.
  description: "A horror comedy podcast on the Rusty Quill network. A failing actor steals his dead twin's identity and lands in a secret paranormal agency.",
  keywords: ["REDACTED podcast", "horror comedy audio drama", "fiction podcast", "monster of the week podcast", "Rusty Quill", "Hush Studios", "Jacob Kane", "audio drama 2026"],
  // Declaring openGraph on a page REPLACES this whole object, images included: a page that
  // wants a different title must either re-declare images or ship its own opengraph-image file,
  // or it will share with no card at all.
  openGraph: { type: "website", siteName: "REDACTED", locale: "en_US", images: [{ url: "/brand/share.jpg", width: 1200, height: 630, alt: "REDACTED: a horror comedy audio drama" }] },
  twitter: { card: "summary_large_image", site: "@TheRedactedUnit" },
  alternates: { types: { "application/rss+xml": LISTEN.rss } },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const viewport: Viewport = { themeColor: "#090909", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getDoc("settings").catch(() => null);
  const hidden = settings?.hiddenPages ?? [];
  const promoText = settings?.promoEnabled && settings.promoCode ? settings.promoText : undefined;
  return (
    <html lang="en" className={`${montserrat.variable} ${nk57.variable} ${nk57wide.variable}`}>
      <body className="min-h-dvh flex flex-col">
        {/* RSS autodiscovery. A raw tag because per-page alternates.canonical replaces the whole
            metadata alternates object, silently dropping the rss type on every page. React hoists this. */}
        <link rel="alternate" type="application/rss+xml" title="REDACTED" href={LISTEN.rss} />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <JsonLd data={siteJsonLd()} />
        {process.env.NEXT_PUBLIC_GA_ID && <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
        {process.env.NEXT_PUBLIC_GA_ID && <CookieConsent />}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-[url('/home/site-bg.avif')] bg-cover bg-center opacity-[0.13]" />
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-[url('/home/static.gif')] bg-[length:300px] opacity-[0.04] mix-blend-screen" />
        <PlayerProvider>
          <CartProvider>
            <Header hidden={hidden} />
            <main id="main" className="relative z-10 flex-1">
              {children}
            </main>
            <Footer hidden={hidden} />
            <PlayerSpacer />
            <LiveDock />
            <AlertsPopup promoText={promoText} />
            <SearchOverlay />
            <PlayerBar />
            <ReviewNudge />
          </CartProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}
