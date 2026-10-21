import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served as a zone under mylineuppro.com/awards (see rewrites in LineupPro).
  basePath: "/awards",
  cacheComponents: true,
  partialPrefetching: true,
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
