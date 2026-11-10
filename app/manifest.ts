import type { MetadataRoute } from "next";

/** Installable PWA (PRD §17): opens straight into Play from the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Offbook",
    short_name: "Offbook",
    description: "Real-world skills for classes 6 to 12: money, communication, AI, entrepreneurship and leadership.",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F0FF",
    theme_color: "#7B14FF",
    categories: ["education", "kids"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
