/** The browser tab's icon (first live fixes, ticket 05): the product logo, on every address. */

import { MAX_LOGO_BYTES } from "./logo";

export const TAB_ICON = {
  /** What every page links to; it says which version of the logo to show. */
  path: "/tab-icon",
  /** One version of the logo: a new upload has a new version, so this never changes. */
  versionPath: (version: string) => `/tab-icon/${version}`,
  /** Django's public answers, asked on the Platform's address (they need no login). */
  brandBackendPath: "/api/platform/brand/",
  logoBackendPath: (version: string) => `/api/platform/brand/logo/${version}/`,
  /** Where the brand answer says the logo is; the number is its version. */
  logoUrlPattern: /^\/api\/platform\/brand\/logo\/([0-9]{1,10})\/$/,
  versionPattern: /^[0-9]{1,10}$/,
  /** A new upload shows within 5 minutes, without a deploy. */
  lookupCache: "public, max-age=300",
  /** A version's file never changes, so browsers keep it for a year. */
  versionCache: "public, max-age=31536000, immutable",
  maxBytes: MAX_LOGO_BYTES,
  timeoutMs: 3_000,
} as const;
