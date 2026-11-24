import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** The Account page is now part of Settings (list tidy-ups 04); old links land there. */
export default function PlatformAccountRoute(): never {
  redirect(ROUTES.platformSettings);
}
