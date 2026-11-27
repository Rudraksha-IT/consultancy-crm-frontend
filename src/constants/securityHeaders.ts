/**
 * Browser protection headers on every answer of this server (security hardening, ticket 02): no
 * framing by other sites, no file-type guessing, a strict referrer, no camera, microphone or
 * location, and a Content-Security-Policy. HSTS is set in Cloudflare (`docs/deployment.md`).
 */

/**
 * The pages' policy. No script rules yet: a nonce per page would make every page dynamic, against
 * `cacheComponents` and partial prefetching; that needs its own decision (spec, Out of scope).
 */
export const PAGE_CONTENT_SECURITY_POLICY =
  "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";

/**
 * Answers relayed from Django (the office logo, an SVG perhaps, can be opened on its own): nothing
 * in it may run, load or be framed. It keeps the pages' directives (`default-src` covers
 * `object-src`).
 */
export const RELAYED_CONTENT_SECURITY_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; sandbox; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

/** The other protection headers, the same on every answer. */
export const PROTECTION_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
} as const;

/**
 * Paths whose answers are relayed from Django, in `next.config.ts` `source` form. Next.js replaces
 * a route's own header with the config's, so these get the relayed policy from the config too.
 */
export const RELAYED_PATH_SOURCES = ["/api/(.*)", "/tab-icon", "/tab-icon/(.*)"] as const;

/** Every path, the root and trailing slashes included (`/:path*` misses both when matched strictly). */
export const EVERY_PATH_SOURCE = "/(.*)";
