import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/parent", "/play", "/hq", "/api", "/auth"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
