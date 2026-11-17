import { TEST_COLOURS } from "@/lib/theme/testColours";
import { applyTheme } from "@/components/features/theme/applyTheme";
import { buildThemeTokens, DEFAULT_THEME, type ColourMode, type ThemeConfig } from "@/lib/theme";

/** A Theme that contrasts with the default: navy sidebar, crimson accent, ice page, black dark. */
export const CONTRASTING_THEME: ThemeConfig = {
  page: "ice",
  sidebar: TEST_COLOURS.navy,
  accent: TEST_COLOURS.crimson,
  dark: { base: "pure", sidebar: "brand", accent: "auto" },
};

/** Light and dark, each with the default Theme and a contrasting one (design-system Enforcement). */
export const THEME_CASES: readonly { name: string; config: ThemeConfig; mode: ColourMode }[] = [
  { name: "default, light", config: DEFAULT_THEME, mode: "light" },
  { name: "default, dark", config: DEFAULT_THEME, mode: "dark" },
  { name: "contrasting, light", config: CONTRASTING_THEME, mode: "light" },
  { name: "contrasting, dark", config: CONTRASTING_THEME, mode: "dark" },
];

/** Put `<html>` into a Theme case before rendering a component. */
export function applyThemeCase(config: ThemeConfig, mode: ColourMode): void {
  applyTheme(document.documentElement, buildThemeTokens(config), mode);
}

export function resetTheme(): void {
  const root = document.documentElement;
  root.removeAttribute("style");
  root.removeAttribute("data-theme");
  root.removeAttribute("data-side");
}
