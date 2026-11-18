import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { DATE_DISPLAYS, type DateDisplay } from "@/constants/dates";

import { patchJson, postForm, putJson, sendWithoutBody } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import {
  LogoSchema,
  OfficeDetailsSchema,
  type OfficeDetails,
  type OfficeLogo,
} from "../core/types";

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

const OfficeDetailsAnswerSchema = z
  .object({ office_details: OfficeDetailsSchema, has_contact_email: z.boolean() })
  .transform(({ office_details, has_contact_email }) => ({
    officeDetails: office_details,
    hasContactEmail: has_contact_email,
  }));

export type SavedOfficeDetails = z.infer<typeof OfficeDetailsAnswerSchema>;

/** The API's field names for each Office detail. */
const OFFICE_DETAILS_FIELDS = {
  contactEmail: "contact_email",
  phone: "phone",
  addressLine1: "address_line1",
  addressLine2: "address_line2",
  website: "website",
} as const satisfies Record<keyof OfficeDetails, string>;

/**
 * Save the office's contact email, phone, address and website (Admins only; empty clears one).
 * Rejects with `InvalidFieldsError` naming each refused field.
 */
export async function saveOfficeDetails(
  details: OfficeDetails,
  fetchFn: typeof fetch = fetch,
): Promise<SavedOfficeDetails> {
  const body = {
    contact_email: details.contactEmail,
    phone: details.phone,
    address_line1: details.addressLine1,
    address_line2: details.addressLine2,
    website: details.website,
  };
  try {
    return await putJson(
      API_PATHS.configurationOfficeDetails,
      body,
      OfficeDetailsAnswerSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, OFFICE_DETAILS_FIELDS) ?? error;
  }
}
