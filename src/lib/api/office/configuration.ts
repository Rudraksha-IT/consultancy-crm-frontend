import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { DATE_DISPLAYS, type DateDisplay } from "@/constants/dates";

import { patchJson, postForm, putJson, sendWithoutBody } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import { LogoSchema, type OfficeLogo } from "../core/types";

const DateDisplayAnswerSchema = z
  .object({ date_display: z.enum(DATE_DISPLAYS) })
  .transform(({ date_display }) => date_display);

/** Show this Consultancy's dates in AD or BS from now on (Admins only); returns the stored choice. */
export function updateDateDisplay(
  dateDisplay: DateDisplay,
  fetchFn: typeof fetch = fetch,
): Promise<DateDisplay> {
  return putJson(
    API_PATHS.configurationDates,
    { date_display: dateDisplay },
    DateDisplayAnswerSchema,
    fetchFn,
  );
}

const LogoAnswerSchema = z.object({ logo: LogoSchema }).transform(({ logo }) => logo);
const LOGO_FIELDS = { file: "file" } as const;

/**
 * Upload or change the office logo (Admins only; spec 99c). The server checks it from its bytes
 * and sanitises an SVG. Rejects with `InvalidFieldsError` on `file` when it is refused.
 */
export async function uploadLogo(file: File, fetchFn: typeof fetch = fetch): Promise<OfficeLogo> {
  const form = new FormData();
  form.append(LOGO_FIELDS.file, file);
  try {
    return await postForm(API_PATHS.configurationLogo, form, LogoAnswerSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, LOGO_FIELDS) ?? error;
  }
}

/** Choose whether the office name shows beside its logo; returns the logo as shown now. */
export function setShowNameBesideLogo(
  showName: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<OfficeLogo> {
  return patchJson(API_PATHS.configurationLogo, { show_name: showName }, LogoAnswerSchema, fetchFn);
}

/** Remove the office logo; the initials show again. */
export function removeLogo(fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.configurationLogo, fetchFn);
}
