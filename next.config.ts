import type { NextConfig } from "next";

import {
  EVERY_PATH_SOURCE,
  PAGE_CONTENT_SECURITY_POLICY,
  PROTECTION_HEADERS,
  RELAYED_CONTENT_SECURITY_POLICY,
  RELAYED_PATH_SOURCES,
} from "./src/constants/securityHeaders";

/** Every answer gets the protection headers; relayed Django answers the stricter policy. */
function protectionHeaders(policy: string): { key: string; value: string }[] {
  return Object.entries({ "Content-Security-Policy": policy, ...PROTECTION_HEADERS }).map(
    ([key, value]) => ({ key, value }),
  );
}

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
  // Security hardening, ticket 02. When two rules set one header, the later one wins.
  headers: () =>
    Promise.resolve([
      { source: EVERY_PATH_SOURCE, headers: protectionHeaders(PAGE_CONTENT_SECURITY_POLICY) },
      ...RELAYED_PATH_SOURCES.map((source) => ({
        source,
        headers: protectionHeaders(RELAYED_CONTENT_SECURITY_POLICY),
      })),
    ]),
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
