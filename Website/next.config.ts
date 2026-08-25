import type { NextConfig } from "next";
import legacyProducts from "./src/data/legacy-products.json";

const nextConfig: NextConfig = {
  // The episode share-card generator reads these off disk; Vercel only ships them
  // into the function if told (public/ normally lives on the CDN, not in the bundle)
  outputFileTracingIncludes: {
    "/episodes/[slug]/opengraph-image": ["./src/fonts/**", "./public/brand/og-tpl-redacted.jpg", "./public/brand/og-tpl-postmortem.jpg"],
    "/cast/[slug]/opengraph-image": ["./src/fonts/**", "./public/brand/logo-nav-hd.png", "./public/cast/**"],
  },
  // Lets a production build run beside the dev server (NEXT_DIST_DIR=.next-build npx next build)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.pippa.io" },
      { protocol: "https", hostname: "files.cdn.printful.com" },
      { protocol: "https", hostname: "cdn.prod.website-files.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.media.tumblr.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  poweredByHeader: false,
  // Server actions cap request bodies at 1 MB by default, which silently kills
  // any real-sized image upload before the handler runs.
  experimental: { serverActions: { bodySizeLimit: "12mb" }, staleTimes: { dynamic: 0 } },
  async headers() {
    return [
      // Preview/production hosts on vercel.app must never be indexed; only the real domain is.
      { source: "/:path*", has: [{ type: "host", value: "(.*)[.]vercel[.]app" }], headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        // Baseline security headers. No CSP yet: Stripe embedded checkout, GA, Google Fonts,
        // Tumblr and Blob images make a correct one a project of its own; add report-only first.
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Legacy Webflow URLs → new structure. Keep these forever; people share links.
      // Old product slugs map to the renamed Printful products; anything unknown lands on the store front.
      ...Object.entries(legacyProducts as Record<string, string>).map(([from, to]) => ({ source: `/product/${from}`, destination: `/store/${to}`, permanent: true })),
      { source: "/product/:slug", destination: "/store", permanent: false },
      { source: "/products", destination: "/store", permanent: true },
      // Postmortem lives on the Episodes page now (its own page duplicated the tab)
      { source: "/postmortem", destination: "/episodes?show=postmortem", permanent: true },
      { source: "/t7p", destination: "/episodes?show=t7p", permanent: true },
      { source: "/utility-pages/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/asset-guide", destination: "/assets", permanent: true },
      { source: "/team", destination: "/cast", permanent: true },
      { source: "/discord", destination: "https://discord.gg/MKtCk4fBXt", permanent: false },
      { source: "/ks", destination: "https://www.kickstarter.com/projects/theredactedunit/redacted-a-procedural-horror-audio-drama", permanent: false },
    ];
  },
};

export default nextConfig;
