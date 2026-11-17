import { API_PATHS } from "@/constants/api";

import { getJson } from "../core/client";
import { ConsultancySchema, type Consultancy } from "../core/types";

/** The Consultancy that owns the subdomain this page was loaded from. */
export function fetchCurrentConsultancy(fetchFn: typeof fetch = fetch): Promise<Consultancy> {
  return getJson(API_PATHS.currentConsultancy, ConsultancySchema, fetchFn);
}
