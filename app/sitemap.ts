import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { getZones } from "@/lib/public-data";

const PAGES = [
  "",
  "/how-it-works",
  "/tracks",
  "/parents",
  "/schools",
  "/pricing",
  "/safety",
  "/privacy",
  "/terms",
  "/refunds",
  "/faq",
  "/showcase",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const zones = await getZones();
  return [
    ...PAGES.map((p) => ({ url: `${siteUrl}${p}`, changeFrequency: "weekly" as const })),
    ...zones.map((z) => ({ url: `${siteUrl}/tracks/${z.slug}`, changeFrequency: "monthly" as const })),
  ];
}
