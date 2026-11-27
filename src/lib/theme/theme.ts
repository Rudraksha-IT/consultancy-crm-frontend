import { PORCELAIN_DARK, PORCELAIN_LIGHT } from "./porcelain";
import type { BuiltTheme } from "./types";

/**
 * The light and dark token maps written onto `<html>`: the Porcelain theme, the same for every office
 * (UI revamp, tickets 03 and 04). It takes nothing; each Staff member only picks light or dark.
 */
export function buildThemeTokens(): BuiltTheme {
  return { light: PORCELAIN_LIGHT, dark: PORCELAIN_DARK };
}
