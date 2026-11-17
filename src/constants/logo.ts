/** The office logo (Configuration → Office logo, issue 39). */

/** The file types a logo may be; the server checks the bytes again and sanitises an SVG. */
export const LOGO_FILE_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"] as const;
export const LOGO_ACCEPT = LOGO_FILE_TYPES.join(",");
/** At most 1 MB, as the server allows. */
export const MAX_LOGO_BYTES = 1024 * 1024;

export const LOGO_TEXT = {
  title: "Office logo",
  help: "Shown at the top of the menu and on receipts. A square or wide PNG, SVG or JPG works best.",
  upload: "Upload a logo",
  change: "Change logo",
  remove: "Remove",
  showName: "Show the office name next to the logo",
  saved: "Logo saved",
  removeTitle: "Remove the office logo?",
  removeBody: "The office name shows in its place. You can upload a logo again later.",
  removeProductTitle: "Remove the logo?",
  removeProductBody: "The product name shows in its place. You can upload a logo again later.",
  removed: "Logo removed",
  tooBig: "That file is over 1 MB. Pick a smaller logo.",
  wrongKind: "Upload a PNG, SVG, JPG or WebP image.",
  saveFailed: "The logo couldn't be saved. Check your connection and try again.",
  removeFailed: "The logo couldn't be removed. Check your connection and try again.",
  showNameFailed: "The choice couldn't be saved. Check your connection and try again.",
} as const;
