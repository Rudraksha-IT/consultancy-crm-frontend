import { z } from "zod";

import appLogo from "@/assets/brand/app-logo.svg";

// The build gives an imported image as `{ src, … }`; the test runner gives its address alone.
const ImportedImageSchema = z.union([
  z.string(),
  z.object({ src: z.string() }).transform(({ src }) => src),
]);

/**
 * The app's own logo (first live fixes, ticket 07): `src/assets/brand/app-logo.svg`, kept in the
 * app's code. The build serves it at an address of this server that changes with the file, so a
 * new file shows after the next deploy. The browser tab shows it while no uploaded product logo
 * is in use; the login screens show the initials then.
 */
export const APP_LOGO_URL: string = ImportedImageSchema.parse(appLogo);
