import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/checkout", "/cart", "/search"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
