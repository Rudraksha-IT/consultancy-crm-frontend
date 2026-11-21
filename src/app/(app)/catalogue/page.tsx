import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

/** The Catalogue moved into Configuration → Universities (ticket 10); old links still work. */
export default function CatalogueRoute(): never {
  redirect(ROUTES.universities);
}
