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
};

/** Light or dark, as one Staff member sees the app. */
export const ColourMode = { Light: "light", Dark: "dark" } as const;
export type ColourMode = (typeof ColourMode)[keyof typeof ColourMode];
