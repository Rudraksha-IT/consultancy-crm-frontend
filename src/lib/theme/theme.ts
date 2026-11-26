import { IVORY_DARK, IVORY_LIGHT } from "./ivory";
import type { BuiltTheme } from "./types";

/**
 * The light and dark token maps written onto `<html>`: the Ivory theme, the same for every office
 * (UI revamp, tickets 03 and 04). It takes nothing; each Staff member only picks light or dark.
 */
export function buildThemeTokens(): BuiltTheme {
  return { light: IVORY_LIGHT, dark: IVORY_DARK };
}
