import {
  DARK_SIDEBAR_MODES,
  type DarkBaseName,
  type DarkSidebarMode,
  type PageName,
  type ThemeConfig,
} from "./types";

export { DARK_SIDEBAR_MODES };

type NamedColour<Name extends string> = { name: Name; label: string; hex: string };
type Preset = { label: string; hex: string };

/** Page backgrounds: a fixed list, because page greys must keep text contrast. */
export const PAGE_BACKGROUNDS: readonly NamedColour<PageName>[] = [
  { name: "ice", label: "Ice grey", hex: "#f3f6f8" },
  { name: "stone", label: "Stone grey", hex: "#f1f2ef" },
  { name: "white", label: "Plain white", hex: "#fafbfb" },
  { name: "fog", label: "Fog", hex: "#f2f2f4" },
  { name: "mist", label: "Mist blue", hex: "#edf1f6" },
  { name: "sage", label: "Sage grey", hex: "#eef2ec" },
  { name: "lilac", label: "Lilac grey", hex: "#f5f4f7" },
  { name: "sky", label: "Sky", hex: "#eff6fa" },
];

/** Dark backgrounds: near-black only, never a saturated dark blue or brown. */
export const DARK_BASES: readonly NamedColour<DarkBaseName>[] = [
  { name: "pure", label: "Pure black", hex: "#000000" },
  { name: "black", label: "Black", hex: "#0c0c0d" },
  { name: "charcoal", label: "Charcoal", hex: "#141416" },
  { name: "graphite", label: "Graphite", hex: "#191a1c" },
  { name: "soft", label: "Soft dark", hex: "#1f1f21" },
  { name: "warm", label: "Warm black", hex: "#100f0d" },
  { name: "pine", label: "Pine black", hex: "#0c100e" },
  { name: "teal", label: "Teal black", hex: "#0b0f10" },
];

export const DARK_SIDEBAR_LABELS: Record<DarkSidebarMode, string> = {
  darker: "Darker than the page",
  same: "Same as the page",
  lighter: "Lighter than the page",
  black: "Pure black",
  brand: "Deep version of the light sidebar",
};

export const SIDEBAR_PRESETS: readonly Preset[] = [
  { label: "White", hex: "#ffffff" },
  { label: "Graphite", hex: "#1f2523" },
  { label: "Black", hex: "#111214" },
  { label: "Slate", hex: "#2b3440" },
  { label: "Deep teal", hex: "#0f3440" },
  { label: "Petrol", hex: "#123a4a" },
  { label: "Deep pine", hex: "#17322a" },
  { label: "Forest", hex: "#1d2b22" },
  { label: "Navy", hex: "#13294b" },
  { label: "Aubergine", hex: "#2b1f38" },
];

export const ACCENT_PRESETS: readonly Preset[] = [
  { label: "Arctic teal", hex: "#0b6e8e" },
  { label: "Lagoon", hex: "#0e7490" },
  { label: "Spruce", hex: "#136b6b" },
  { label: "Pine green", hex: "#1f6b52" },
  { label: "Emerald", hex: "#047857" },
  { label: "Sky blue", hex: "#0369a1" },
  { label: "Cobalt", hex: "#2546c4" },
  { label: "Indigo", hex: "#4338ca" },
  { label: "Plum", hex: "#5b3a8c" },
  { label: "Crimson", hex: "#a8233a" },
  { label: "Amber", hex: "#b45309" },
  { label: "Graphite", hex: "#18181b" },
];

/** "Stone and emerald", chosen on 2026-10-28 as the look of every new Consultancy. */
export const DEFAULT_THEME: ThemeConfig = {
  page: "stone",
  sidebar: "#ffffff",
  accent: "#047857",
  dark: { base: "soft", sidebar: "darker", accent: "#047857" },
};

/** Used when a stored Theme has no dark settings. */
export const DEFAULT_DARK_THEME: ThemeConfig["dark"] = {
  base: "soft",
  sidebar: "darker",
  accent: "auto",
};

const withDefaultDark = (light: Omit<ThemeConfig, "dark">): ThemeConfig => ({
  ...light,
  dark: DEFAULT_DARK_THEME,
});

/** Ready-made Themes offered in the picker. */
export const THEME_PRESETS: readonly { name: string; config: ThemeConfig }[] = [
  { name: "Stone and emerald", config: DEFAULT_THEME },
  {
    name: "Glacier",
    config: withDefaultDark({ page: "ice", sidebar: "#ffffff", accent: "#0b6e8e" }),
  },
  {
    name: "Pine and stone",
    config: withDefaultDark({ page: "stone", sidebar: "#1f2523", accent: "#1f6b52" }),
  },
  {
    name: "Deep glacier",
    config: withDefaultDark({ page: "ice", sidebar: "#0f3440", accent: "#0b6e8e" }),
  },
  {
    name: "Evergreen",
    config: withDefaultDark({ page: "stone", sidebar: "#17322a", accent: "#136b6b" }),
  },
  {
    name: "Spruce and graphite",
    config: withDefaultDark({ page: "white", sidebar: "#1f2523", accent: "#136b6b" }),
  },
];

export const WHITE = "#ffffff";
export const BLACK = "#000000";
export const NEAR_BLACK = "#0c0c0d";
