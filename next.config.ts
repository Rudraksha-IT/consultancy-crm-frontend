import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // The only image is the office logo, served as-is by our own API (issue 39). Without the
  // optimiser, the server bundle leaves out sharp and its image library (about 18 MB).
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    "*": [
      "node_modules/sharp/**",
      "node_modules/@img/**",
      "node_modules/.pnpm/@img+*/**",
      "node_modules/.pnpm/sharp@*/**",
    ],
  },
  cacheComponents: true,
  // Django's URLs end with "/"; keep `/api/.../` as the browser sent it instead of redirecting to
  // drop the slash (src/app/api/[...path]/route.ts forwards the path unchanged).
  skipTrailingSlashRedirect: true,
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
