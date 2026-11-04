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
