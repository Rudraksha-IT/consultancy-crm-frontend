import { DEFAULT_THEME } from "./options";

/**
 * The tab icon until a Platform Admin uploads the product logo (first live fixes, ticket 05): an
 * emerald square, the default accent, with a white open ring. No text, so it reads at 16 px, and
 * the square shows on light and dark browser tabs alike.
 */
export const DEFAULT_TAB_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  `<rect width="32" height="32" rx="7" fill="${DEFAULT_THEME.accent}"/>` +
  '<path d="M21.5 10.5A7.8 7.8 0 1 0 21.5 21.5" fill="none" stroke="#ffffff" ' +
  'stroke-width="4" stroke-linecap="round"/></svg>';
