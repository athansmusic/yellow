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
import { GoogleAnalytics } from "@next/third-parties/google";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap", weight: ["400", "500", "600", "700"] });
const nk57 = localFont({ src: "../fonts/NK57MonospaceCdEb.otf", variable: "--font-nk57", display: "swap", weight: "800" });
const nk57wide = localFont({ src: "../fonts/NK57MonospaceExBk.otf", variable: "--font-nk57-wide", display: "swap", weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s · [REDACTED]` },
  description:
    "REDACTED is a horror comedy audio drama from Hush Studios on the Rusty Quill network. A failed actor assumes his dead twin's identity and lands in a secret agency that handles the paranormal. New episodes Fridays 9/8c.",
  keywords: ["REDACTED podcast", "horror comedy audio drama", "fiction podcast", "monster of the week podcast", "Rusty Quill", "Hush Studios", "Jacob Kane", "audio drama 2026"],
  openGraph: { type: "website", siteName: "[REDACTED]", locale: "en_US", images: [{ url: "/brand/share.png", width: 1200, height: 630, alt: "[REDACTED]: a horror comedy audio drama" }] },
  twitter: { card: "summary_large_image", site: "@TheRedactedUnit" },
  alternates: { types: { "application/rss+xml": LISTEN.rss } },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const viewport: Viewport = { themeColor: "#090909", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getDoc("settings").catch(() => null);
  const hidden = settings?.hiddenPages ?? [];
  const promo = settings?.promoEnabled && settings.promoCode ? { code: settings.promoCode, text: settings.promoText } : undefined;
  return (
    <html lang="en" className={`${montserrat.variable} ${nk57.variable} ${nk57wide.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <JsonLd data={siteJsonLd()} />
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
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
            <AlertsPopup promo={promo} />
            <SearchOverlay />
            <PlayerBar />
          </CartProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}
