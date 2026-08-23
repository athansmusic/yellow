import type { NextConfig } from "next";
import legacyProducts from "./src/data/legacy-products.json";

const nextConfig: NextConfig = {
  // Lets a production build run beside the dev server (NEXT_DIST_DIR=.next-build npx next build)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.pippa.io" },
      { protocol: "https", hostname: "files.cdn.printful.com" },
      { protocol: "https", hostname: "cdn.prod.website-files.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.media.tumblr.com" },
    ],
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
