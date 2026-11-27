/** The browser tab's title on an office's address (first live fixes, ticket 08). */

import { ROUTES } from "./routes";

/** Pages not in the sidebar, by where they start; the longest match wins. */
export const OTHER_PAGE_NAMES: Readonly<Record<string, string>> = {
  [ROUTES.feesByType]: "Fees by type",
  [ROUTES.clock]: "Working hours",
  [ROUTES.mySettings]: "My settings",
  [ROUTES.myProgress]: "My progress",
  [ROUTES.login]: "Log in",
  [ROUTES.forgotPassword]: "Forgot password",
  [ROUTES.join]: "Join",
};

/** The Platform's pages by where they start (list tidy-ups 08); the longest match wins. */
export const PLATFORM_PAGE_NAMES: Readonly<Record<string, string>> = {
  [ROUTES.platformHome]: "Consultancies",
  [ROUTES.platformAdmins]: "Platform Admins",
  [ROUTES.platformSettings]: "Settings",
};

export const TAB_TITLE = {
  /** Home reads like every other page, "Home | <office>" (list tidy-ups 07). */
  homeName: "Home",
  page: (page: string, office: string) => `${page} | ${office}`,
} as const;
