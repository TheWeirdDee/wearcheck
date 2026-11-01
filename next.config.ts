import type { NextConfig } from "next";

// Deployed commit, passed at build time (`vercel deploy --build-env WEARCHECK_COMMIT=$(git rev-parse HEAD)`),
// so the live site can be checked against the pushed branch. Not secret.
const commitHeader = { key: "X-WearCheck-Commit", value: process.env.WEARCHECK_COMMIT || "unknown" };

const securityHeaders = [
  commitHeader,
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Every workflow page is per-session and dynamic; Cache Components adds no value here.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["sharp"],
  // Reference images and card fonts are read from disk by server routes.
  outputFileTracingIncludes: {
    "/api/**": ["./public/reference/**", "./node_modules/@fontsource/inter-tight/files/inter-tight-latin-{500,600,700}-normal.woff", "./node_modules/@fontsource/inter/files/inter-latin-{400,500,600}-normal.woff"],
    "/check/**": ["./node_modules/@fontsource/inter-tight/files/*.woff", "./node_modules/@fontsource/inter/files/*.woff"],
    "/opengraph-image": ["./public/editorial/hero-brick-wall.jpg", "./node_modules/@fontsource/inter-tight/files/inter-tight-latin-700-normal.woff", "./node_modules/@fontsource/inter/files/inter-latin-400-normal.woff"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/check/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
