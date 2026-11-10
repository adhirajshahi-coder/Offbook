import type { NextConfig } from "next";

// Cache Components is off: nearly every route reads the session cookie, and
// the Suspense-everywhere model adds risk without benefit at this stage.
// See docs/DECISIONS.md (D-011).
const nextConfig: NextConfig = {
  // Browser console forwarding writes to .next/dev/logs on every page load,
  // which the dev watcher picked up as a change: an endless reload loop on
  // this Windows machine. Browser errors stay visible in the browser console.
  // See docs/DECISIONS.md (D-037).
  logging: {
    browserToTerminal: false,
  },
  // Browsers still ask for /favicon.ico even with app/icon.svg; serve the PNG icon there.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icons/icon-192.png" }];
  },
  // Security headers for every response (PRD §13; Lighthouse best practices).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
