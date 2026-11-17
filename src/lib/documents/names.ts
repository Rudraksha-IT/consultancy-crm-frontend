/** The longest name a document picker adds (spec 63c); the server checks it again. */
export const PICKED_NAME_MAX_LENGTH = 80;

/** A typed document name without spaces at either end or runs of spaces inside. */
export function tidyDocumentName(typed: string): string {
  return typed.trim().replace(/\s+/g, " ");
}
