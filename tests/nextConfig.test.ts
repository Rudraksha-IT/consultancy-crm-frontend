import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";

import nextConfig from "../next.config";

/** Browser protection headers (work 2026-11-24 ticket 02, spec: security hardening). */
const PAGE_POLICY =
  "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";
/**
 * Answers relayed from Django (`/api`, and the office logo as the tab icon) keep the stricter
 * policy the relay sets: Next.js replaces a route's own header with the config's, so the config
 * must send the stricter one there, still refusing framing.
 */
const RELAYED_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; sandbox; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
const OTHER_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const PAGE_PATHS = [
  "/",
  "/login",
  "/students",
  "/students/0b9c5e1a-7a39-4f0e-9a64-1d1f3d0c2b44",
  "/platform/consultancies",
  "/_next/static/chunks/main.js",
  "/apis",
];

const RELAYED_PATHS = [
  "/api/auth/login/",
  "/api/platform/auth/login/",
  "/api/consultancy/logo/1/",
  "/tab-icon",
  "/tab-icon/3",
];

/** The header values Next.js would send for one path, matched as Next.js matches `source`. */
async function headersFor(path: string): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const matching = rules.filter(
    (rule) =>
      getPathMatch(rule.source, { strict: true, removeUnnamedParams: true })(path) !== false,
  );
  // A later rule's header replaces an earlier one's, as in Next.js.
  return Object.fromEntries(matching.flatMap((rule) => rule.headers.map((h) => [h.key, h.value])));
}

describe("next.config headers", () => {
  it.each(PAGE_PATHS)("sends every protection header on the page %s", async (path) => {
    expect(await headersFor(path)).toEqual({
      "Content-Security-Policy": PAGE_POLICY,
      ...OTHER_HEADERS,
    });
  });

  it.each(RELAYED_PATHS)("sends the stricter policy on the relayed %s", async (path) => {
    expect(await headersFor(path)).toEqual({
      "Content-Security-Policy": RELAYED_POLICY,
      ...OTHER_HEADERS,
    });
  });

  it("has no script rules in the pages' policy yet (spec: Out of scope)", async () => {
    const policy = (await headersFor("/"))["Content-Security-Policy"];
    expect(policy).not.toMatch(/script-src|default-src/);
  });
});
