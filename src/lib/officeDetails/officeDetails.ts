import {
  OFFICE_DETAILS_LIMITS as LIMITS,
  OFFICE_DETAILS_TEXT as TEXT,
} from "@/constants/officeDetails";
import type { OfficeDetails } from "@/lib/api";

/** The same checks the server makes, so mistakes show before sending; the server checks again. */
const EMAIL =
  /^[^\s@<>",;()[\]\\]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,63}$/i;
const PHONE = /^[0-9+() -]+$/;
const PHONE_MIN_DIGITS = 6;
const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const WEBSITE = new RegExp(
  `^https?://${LABEL}(?:\\.${LABEL})*\\.[a-z]{2,63}(?::[0-9]{1,5})?(?:[/?#][^\\s<>"'\`\\\\]*)?$`,
  "i",
);
const SPACES = / {2,}/g;

export type OfficeDetailsErrors = Partial<Record<keyof OfficeDetails, string[]>>;

/** The details as they will be saved: trimmed, with runs of spaces in the address made one. */
export function tidyOfficeDetails(details: OfficeDetails): OfficeDetails {
  return {
    contactEmail: details.contactEmail.trim(),
    phone: details.phone.trim(),
    addressLine1: details.addressLine1.trim().replace(SPACES, " "),
    addressLine2: details.addressLine2.trim().replace(SPACES, " "),
    website: details.website.trim(),
  };
}

/** Each field's check (an empty field is always fine) and the words for a refusal. */
const CHECKS: Record<keyof OfficeDetails, { isFine: (value: string) => boolean; refusal: string }> =
  {
    contactEmail: {
      isFine: (value) => value.length <= LIMITS.contactEmail && EMAIL.test(value),
      refusal: TEXT.emailRefused,
    },
    phone: { isFine: isPhone, refusal: TEXT.phoneRefused },
    addressLine1: { isFine: fitsAddressLine, refusal: TEXT.addressTooLong },
    addressLine2: { isFine: fitsAddressLine, refusal: TEXT.addressTooLong },
    website: {
      isFine: (value) => value.length <= LIMITS.website && WEBSITE.test(value),
      refusal: TEXT.websiteRefused,
    },
  };
const FIELDS: readonly (keyof OfficeDetails)[] = [
  "contactEmail",
  "phone",
  "addressLine1",
  "addressLine2",
  "website",
];

/**
 * Why each tidied field can't be saved. The contact email is required (spec 120: replies must
 * always reach the office); the other fields may be empty.
 */
export function refusedOfficeDetails(details: OfficeDetails): OfficeDetailsErrors {
  const errors: OfficeDetailsErrors = {};
  for (const field of FIELDS) {
    const found =
      field === "contactEmail"
        ? contactEmailRefusal(details[field])
        : optionalRefusal(field, details[field]);
    if (found !== null) errors[field] = [found];
  }
  return errors;
}

/** Why a tidied contact email can't be used (empty, or not one real address); null when fine. */
export function contactEmailRefusal(email: string): string | null {
  if (email === "") return TEXT.contactEmailMissing;
  return CHECKS.contactEmail.isFine(email) ? null : CHECKS.contactEmail.refusal;
}

/** Why an optional field can't be saved; empty is always fine. */
function optionalRefusal(field: keyof OfficeDetails, value: string): string | null {
  return value === "" || CHECKS[field].isFine(value) ? null : CHECKS[field].refusal;
}

function fitsAddressLine(line: string): boolean {
  return line.length <= LIMITS.addressLine;
}

function isPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, "").length;
  return phone.length <= LIMITS.phone && PHONE.test(phone) && digits >= PHONE_MIN_DIGITS;
}

export type FooterLine = { part: keyof OfficeDetails; text: string };

/** The footer's lines under the office name, as every office email shows them; empty ones left out. */
export function footerLines(details: OfficeDetails): FooterLine[] {
  const lines: FooterLine[] = [
    { part: "addressLine1", text: details.addressLine1 },
    { part: "addressLine2", text: details.addressLine2 },
    { part: "phone", text: details.phone === "" ? "" : TEXT.phoneLine(details.phone) },
    { part: "website", text: details.website },
    { part: "contactEmail", text: details.contactEmail },
  ];
  return lines.filter((line) => line.text !== "");
}
