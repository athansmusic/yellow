"use client";

import Script from "next/script";

/**
 * GA4, loaded lazily (after the page is idle) so the 180 KB tag never competes with the hero.
 * Same gtag setup as @next/third-parties, minus the afterInteractive timing.
 */
export function Analytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script id="ga-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaId}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />
    </>
  );
}
