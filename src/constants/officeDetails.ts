/** Office details (Configuration → General, spec stories 11-16): printed on every office email. */

/** The longest each field may be, as the server allows. */
export const OFFICE_DETAILS_LIMITS = {
  contactEmail: 254,
  phone: 30,
  addressLine: 100,
  website: 200,
} as const;

export const OFFICE_DETAILS_TEXT = {
  title: "Office details",
  help: "Printed at the bottom of every email from the office. A Student who presses Reply reaches the contact email.",
  contactEmail: "Contact email",
  contactEmailHint: "Needed before anyone can email a Student. Replies go here.",
  contactEmailPlaceholder: "info@youroffice.com",
  phone: "Phone",
  phonePlaceholder: "01-4412345",
  website: "Website",
  websiteHint: "Starts with https:// or http://",
  websitePlaceholder: "https://",
  address: "Address",
  addressLine1Placeholder: "Street and city",
  addressLine2: "Address, second line",
  addressLine2Placeholder: "Second line (optional)",
  footerPreview: "At the bottom of every email",
  phoneLine: (phone: string) => `Phone ${phone}`,
  noReply: "This email comes from an address that can't receive replies.",
  writeTo: (email: string) => ` To answer, write to ${email}.`,
  save: "Save office details",
  saved: "Office details saved",
  savedWithoutEmail: "Saved. Emails to Students stay off until you add a contact email.",
  saveFailed: "The office details couldn't be saved. Check your connection and try again.",
  emailRefused: "Enter a real email address, like info@youroffice.com.",
  phoneRefused: "A phone number can have digits, spaces, + ( ) and -.",
  websiteRefused: "The website must start with https:// or http://.",
  addressTooLong: `Use at most ${String(OFFICE_DETAILS_LIMITS.addressLine)} characters.`,
} as const;
