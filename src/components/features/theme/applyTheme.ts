import { THEME_TOKEN_NAMES, type BuiltTheme, type ColourMode } from "@/lib/theme";

/**
 * Write the theme's tokens for `mode` onto `root` (normally `<html>`), with `data-theme` for the
 * mode.
 */
export function applyTheme(root: HTMLElement, built: BuiltTheme, mode: ColourMode): void {
  const tokens = mode === "dark" ? built.dark : built.light;
  for (const name of THEME_TOKEN_NAMES) {
    root.style.setProperty(`--${name}`, tokens[name]);
  }
  root.dataset.theme = mode;
}
