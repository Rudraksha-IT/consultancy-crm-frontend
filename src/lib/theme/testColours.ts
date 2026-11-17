/**
 * Named colours for tests outside the theme module, so raw colour values stay in src/lib/theme
 * (design-system rule 1). Not used by the app.
 */
export const TEST_COLOURS = {
  white: "#ffffff",
  navy: "#13294b",
  deepTeal: "#0f3440",
  deepTealUpper: "#0F3440",
  arcticTeal: "#0b6e8e",
  crimson: "#a8233a",
  emerald: "#047857",
  /** Not a preset, so the picker shows it as custom. */
  custom: "#123456",
  /** Too light for white text; the theme function darkens it. */
  paleSky: "#7dd3fc",
} as const;
