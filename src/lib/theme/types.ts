export const PAGE_NAMES = ["ice", "stone", "white", "fog", "mist", "sage", "lilac", "sky"] as const;
export type PageName = (typeof PAGE_NAMES)[number];

export const DARK_BASE_NAMES = [
  "pure",
  "black",
  "charcoal",
  "graphite",
  "soft",
  "warm",
  "pine",
  "teal",
] as const;
export type DarkBaseName = (typeof DARK_BASE_NAMES)[number];

export const DARK_SIDEBAR_MODES = ["darker", "same", "lighter", "black", "brand"] as const;
export type DarkSidebarMode = (typeof DARK_SIDEBAR_MODES)[number];

export const AUTO_ACCENT = "auto";

/** Dark-mode choices: a named near-black background, a sidebar mode, and an accent (hex or auto). */
export type DarkThemeConfig = {
  base: DarkBaseName;
  sidebar: DarkSidebarMode;
  accent: string;
};

/** A Consultancy's Theme as stored: a named page, hex sidebar and accent, and dark settings. */
export type ThemeConfig = {
  page: PageName;
  sidebar: string;
  accent: string;
  dark: DarkThemeConfig;
};

/** The themed colour tokens, written onto `<html>` as `--<name>`. */
export const THEME_TOKEN_NAMES = [
  "paper",
  "canvas",
  "fill",
  "fill-2",
  "rule",
  "rule-2",
  "ink",
  "ink-2",
  "ink-3",
  "accent",
  "accent-hover",
  "accent-ink",
  "tint",
  "side-bg",
  "side-ink",
  "side-muted",
  "side-hover",
  "side-active",
  "side-active-ink",
  "side-rule",
] as const;
export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

export type ThemeTokens = Record<ThemeTokenName, string>;

export type BuiltTheme = {
  light: ThemeTokens;
  dark: ThemeTokens;
  /** Whether the light-mode sidebar takes dark text (the logo mark then uses the accent). */
  isSidebarLight: boolean;
  /** Whether the chosen accent had to be darkened so white text on it stays readable. */
  isAccentAdjusted: boolean;
};

/** Light or dark, as one Staff member sees the app. */
export const ColourMode = { Light: "light", Dark: "dark" } as const;
export type ColourMode = (typeof ColourMode)[keyof typeof ColourMode];
