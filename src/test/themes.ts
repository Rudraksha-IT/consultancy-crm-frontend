import { applyTheme } from "@/components/features/theme/applyTheme";
import { buildThemeTokens, type ColourMode, type ThemeConfig } from "@/lib/theme";
import { TEST_COLOURS } from "@/lib/theme/testColours";

/** Office colours for the Theme API tests, until the office colour feature goes (ticket 04). */
export const CONTRASTING_THEME: ThemeConfig = {
  page: "ice",
  sidebar: TEST_COLOURS.navy,
  accent: TEST_COLOURS.crimson,
  dark: { base: "pure", sidebar: "brand", accent: "auto" },
};

/** Ivory in light and in dark: every component is checked in both (design-system Enforcement). */
export const THEME_CASES: readonly { name: string; mode: ColourMode }[] = [
  { name: "Ivory, light", mode: "light" },
  { name: "Ivory, dark", mode: "dark" },
];

/** Put `<html>` into light or dark before rendering a component. */
export function applyThemeCase(mode: ColourMode): void {
  applyTheme(document.documentElement, buildThemeTokens(), mode);
}

export function resetTheme(): void {
  const root = document.documentElement;
  root.removeAttribute("style");
  root.removeAttribute("data-theme");
  root.removeAttribute("data-side");
}
