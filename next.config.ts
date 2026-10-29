import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Home Base renders per-request, session-scoped data on every page. The
  // classic dynamic rendering model is simpler and safer for that than
  // Cache Components, so the feature stays off for v1.
  cacheComponents: false,
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // The embedded PGlite database and the dev-only Vault key are development
  // conveniences; keep them (and their WASM) out of production bundles.
  outputFileTracingExcludes: {
    "*": ["./.data/**", "./node_modules/@electric-sql/pglite/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Everything except served files (which must be frameable by the app's own document viewer).
        source: "/:path((?!api/files).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // The service worker must always be revalidated so fixes reach devices.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        // Private files and vault responses must never land in shared caches.
        source: "/api/files/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
