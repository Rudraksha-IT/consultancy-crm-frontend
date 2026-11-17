import { THEME_TOKEN_NAMES, type BuiltTheme, type ColourMode } from "@/lib/theme";

/**
 * Write a built Theme's tokens for `mode` onto `root` (normally `<html>`), with `data-theme` for
 * the mode and `data-side="coloured"` when the light-mode sidebar is a colour that takes white text
 * (its logo mark then uses the sidebar's colours instead of the accent).
 */
export function applyTheme(root: HTMLElement, built: BuiltTheme, mode: ColourMode): void {
  const tokens = mode === "dark" ? built.dark : built.light;
  for (const name of THEME_TOKEN_NAMES) {
    root.style.setProperty(`--${name}`, tokens[name]);
  }
  root.dataset.theme = mode;
  root.dataset.side = mode === "light" && !built.isSidebarLight ? "coloured" : "plain";
}
