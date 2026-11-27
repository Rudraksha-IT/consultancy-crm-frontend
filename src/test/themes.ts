import { applyTheme } from "@/components/features/theme/applyTheme";
import { buildThemeTokens, type ColourMode } from "@/lib/theme";

/** Porcelain in light and in dark: every component is checked in both (design-system Enforcement). */
export const THEME_CASES: readonly { name: string; mode: ColourMode }[] = [
  { name: "Porcelain, light", mode: "light" },
  { name: "Porcelain, dark", mode: "dark" },
];

/** Put `<html>` into light or dark before rendering a component. */
export function applyThemeCase(mode: ColourMode): void {
  applyTheme(document.documentElement, buildThemeTokens(), mode);
}

export function resetTheme(): void {
  const root = document.documentElement;
  root.removeAttribute("style");
  root.removeAttribute("data-theme");
}
