import type { NextConfig } from "next";

// Cache Components is off: nearly every route reads the session cookie, and
// the Suspense-everywhere model adds risk without benefit at this stage.
// See docs/DECISIONS.md (D-011).
const nextConfig: NextConfig = {
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
