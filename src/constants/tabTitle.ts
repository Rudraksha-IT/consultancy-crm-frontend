/** The browser tab's title on an office's address (first live fixes, ticket 08). */

import { ROUTES } from "./routes";

/** Pages not in the sidebar, by where they start; the longest match wins. */
export const OTHER_PAGE_NAMES: Readonly<Record<string, string>> = {
  [ROUTES.feesByType]: "Fees by type",
  [ROUTES.clock]: "My working hours",
  [ROUTES.mySettings]: "My settings",
  [ROUTES.myProgress]: "My progress",
  [ROUTES.login]: "Log in",
  [ROUTES.forgotPassword]: "Forgot password",
  [ROUTES.join]: "Join",
};

export const TAB_TITLE = {
  /** Home reads like every other page, "Home | <office>" (list tidy-ups 07). */
  homeName: "Home",
  page: (page: string, office: string) => `${page} | ${office}`,
} as const;
