import { contrastRatio, isHexColour, mixHex, readableOn } from "./colour";
import { IVORY_DARK, IVORY_LIGHT } from "./ivory";
import {
  BLACK,
  DARK_BASES,
  DEFAULT_DARK_THEME,
  DEFAULT_THEME,
  NEAR_BLACK,
  PAGE_BACKGROUNDS,
  WHITE,
} from "./options";
import {
  AUTO_ACCENT,
  DARK_BASE_NAMES,
  DARK_SIDEBAR_MODES,
  PAGE_NAMES,
  type BuiltTheme,
  type DarkSidebarMode,
  type DarkThemeConfig,
  type ThemeConfig,
  type ThemeTokens,
} from "./types";

// The mixing amounts from docs/design-system.md ("How it becomes tokens").
const LIGHT_MIX = {
  fill: 0.025,
  fill2: 0.07,
  rule: 0.075,
  rule2: 0.18,
  ink3: 0.57,
  ink2: 0.68,
  ink: 0.9,
  accentHover: 0.18,
  tint: 0.9,
} as const;
const DARK_MIX = {
  panel: 0.055,
  fill: 0.085,
  fill2: 0.12,
  rule: 0.13,
  rule2: 0.2,
  ink3: 0.55,
  ink2: 0.7,
  ink: 0.92,
  autoAccent: 0.45,
  accentHover: 0.2,
  tint: 0.84,
  sidebarDarker: 0.4,
  brandSidebar: 0.45,
} as const;
const DARK_SIDEBAR_MIX = { muted: 0.62, hover: 0.05, active: 0.1, rule: 0.07 } as const;
const COLOURED_SIDEBAR_MIX = { muted: 0.66, hover: 0.07, active: 0.14, rule: 0.08 } as const;
const STRONG_LINE_MIX = 0.55;
const AA_TEXT = 4.5;
const DARK_ACCENT_RATIO = 5;
const DARK_INK_2_RATIO = 7;

/**
 * The light and dark token maps written onto `<html>`: the Ivory theme, the same for every office
 * (UI revamp, ticket 03). Each Staff member still picks light or dark.
 */
export function buildThemeTokens(): BuiltTheme {
  return { light: IVORY_LIGHT, dark: IVORY_DARK, isSidebarLight: true, isAccentAdjusted: false };
}

/**
 * An office's own colours turned into tokens. Only the Platform's colour editor still previews
 * them; it and this function go with the office colour feature (ticket 04).
 */
export function deriveOfficeTokens(input: ThemeConfig): BuiltTheme {
  const config = normaliseThemeConfig(input);
  const accent = readableOn(config.accent, WHITE, BLACK, AA_TEXT);
  const isSidebarLight = takesDarkText(config.sidebar);
  return {
    light: lightTokens(config, accent, isSidebarLight),
    dark: darkTokens(config, isSidebarLight),
    isSidebarLight,
    isAccentAdjusted: accent !== config.accent,
  };
}

/** A sidebar takes dark text when black on it reads better than white. */
function takesDarkText(background: string): boolean {
  return contrastRatio(BLACK, background) >= contrastRatio(WHITE, background);
}

function pageHex(config: ThemeConfig): string {
  return PAGE_BACKGROUNDS.find((page) => page.name === config.page)?.hex ?? WHITE;
}

function lightTokens(config: ThemeConfig, accent: string, isSidebarLight: boolean): ThemeTokens {
  const page = pageHex(config);
  const towardsBlack = (amount: number): string => mixHex(page, BLACK, amount);
  const neutrals = {
    paper: WHITE,
    canvas: page,
    fill: towardsBlack(LIGHT_MIX.fill),
    "fill-2": towardsBlack(LIGHT_MIX.fill2),
    rule: towardsBlack(LIGHT_MIX.rule),
    "rule-2": towardsBlack(LIGHT_MIX.rule2),
    "rule-strong": mixHex(WHITE, towardsBlack(LIGHT_MIX.ink), STRONG_LINE_MIX),
    ink: towardsBlack(LIGHT_MIX.ink),
    "ink-2": towardsBlack(LIGHT_MIX.ink2),
    "ink-3": towardsBlack(LIGHT_MIX.ink3),
  };
  const accents = {
    accent,
    "accent-hover": mixHex(accent, BLACK, LIGHT_MIX.accentHover),
    "accent-ink": WHITE,
    tint: mixHex(accent, WHITE, LIGHT_MIX.tint),
  };
  const sidebar = isSidebarLight
    ? lightSidebar(config.sidebar, { ...neutrals, ...accents })
    : colouredSidebar(config.sidebar);
  return { ...neutrals, ...accents, ...sidebar };
}

type SidebarTokens = Pick<
  ThemeTokens,
  | "side-bg"
  | "side-ink"
  | "side-muted"
  | "side-hover"
  | "side-active"
  | "side-active-ink"
  | "side-rule"
>;

function lightSidebar(
  background: string,
  page: Omit<ThemeTokens, keyof SidebarTokens>,
): SidebarTokens {
  return {
    "side-bg": background,
    "side-ink": readableOn(page.ink, background, BLACK, AA_TEXT),
    "side-muted": readableOn(page["ink-2"], background, BLACK, AA_TEXT),
    "side-hover": page.fill,
    "side-active": page.tint,
    "side-active-ink": readableOn(page.accent, background, BLACK, AA_TEXT),
    "side-rule": page.rule,
  };
}

function colouredSidebar(background: string): SidebarTokens {
  const towardsWhite = (amount: number): string => mixHex(background, WHITE, amount);
  return {
    "side-bg": background,
    "side-ink": WHITE,
    "side-muted": readableOn(towardsWhite(COLOURED_SIDEBAR_MIX.muted), background, WHITE, AA_TEXT),
    "side-hover": towardsWhite(COLOURED_SIDEBAR_MIX.hover),
    "side-active": towardsWhite(COLOURED_SIDEBAR_MIX.active),
    "side-active-ink": WHITE,
    "side-rule": towardsWhite(COLOURED_SIDEBAR_MIX.rule),
  };
}

function darkBaseHex(config: ThemeConfig): string {
  return DARK_BASES.find((base) => base.name === config.dark.base)?.hex ?? NEAR_BLACK;
}

function darkTokens(config: ThemeConfig, isSidebarLight: boolean): ThemeTokens {
  const base = darkBaseHex(config);
  const towardsWhite = (amount: number): string => mixHex(base, WHITE, amount);
  const panel = towardsWhite(DARK_MIX.panel);
  const accent = darkAccent(config, panel);
  const sidebar = darkSidebarHex(config, base, panel, isSidebarLight);
  return {
    paper: panel,
    canvas: base,
    fill: towardsWhite(DARK_MIX.fill),
    "fill-2": towardsWhite(DARK_MIX.fill2),
    rule: towardsWhite(DARK_MIX.rule),
    "rule-2": towardsWhite(DARK_MIX.rule2),
    "rule-strong": mixHex(panel, towardsWhite(DARK_MIX.ink), STRONG_LINE_MIX),
    ink: towardsWhite(DARK_MIX.ink),
    "ink-2": readableOn(towardsWhite(DARK_MIX.ink2), panel, WHITE, DARK_INK_2_RATIO),
    "ink-3": readableOn(towardsWhite(DARK_MIX.ink3), panel, WHITE, AA_TEXT),
    accent,
    "accent-hover": mixHex(accent, WHITE, DARK_MIX.accentHover),
    "accent-ink": contrastRatio(NEAR_BLACK, accent) >= AA_TEXT ? NEAR_BLACK : WHITE,
    tint: mixHex(accent, panel, DARK_MIX.tint),
    ...darkSidebar(sidebar, towardsWhite(DARK_MIX.ink), accent),
  };
}

/** The chosen dark accent, or with `auto` the light accent lightened, made readable on the panel. */
function darkAccent(config: ThemeConfig, panel: string): string {
  const chosen =
    config.dark.accent === AUTO_ACCENT
      ? mixHex(config.accent, WHITE, DARK_MIX.autoAccent)
      : config.dark.accent;
  return readableOn(chosen, panel, WHITE, DARK_ACCENT_RATIO);
}

function darkSidebarHex(
  config: ThemeConfig,
  base: string,
  panel: string,
  isSidebarLight: boolean,
): string {
  const darker = mixHex(base, BLACK, DARK_MIX.sidebarDarker);
  const brand = isSidebarLight ? darker : mixHex(config.sidebar, BLACK, DARK_MIX.brandSidebar);
  const byMode: Record<DarkSidebarMode, string> = {
    darker,
    same: base,
    lighter: panel,
    black: BLACK,
    brand,
  };
  return byMode[config.dark.sidebar];
}

function darkSidebar(background: string, ink: string, accent: string): SidebarTokens {
  const towardsWhite = (amount: number): string => mixHex(background, WHITE, amount);
  return {
    "side-bg": background,
    "side-ink": readableOn(ink, background, WHITE, AA_TEXT),
    "side-muted": readableOn(towardsWhite(DARK_SIDEBAR_MIX.muted), background, WHITE, AA_TEXT),
    "side-hover": towardsWhite(DARK_SIDEBAR_MIX.hover),
    "side-active": towardsWhite(DARK_SIDEBAR_MIX.active),
    "side-active-ink": readableOn(accent, background, WHITE, AA_TEXT),
    "side-rule": towardsWhite(DARK_SIDEBAR_MIX.rule),
  };
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return options.some((option) => option === value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return Object.fromEntries(Object.entries(value));
}

function hexOr(value: unknown, fallback: string): string {
  return isHexColour(value) ? value.toLowerCase() : fallback;
}

function normaliseDark(value: unknown): DarkThemeConfig {
  const dark = asRecord(value);
  if (dark === null) return DEFAULT_DARK_THEME;
  return {
    base: isOneOf(DARK_BASE_NAMES, dark.base) ? dark.base : DEFAULT_DARK_THEME.base,
    sidebar: isOneOf(DARK_SIDEBAR_MODES, dark.sidebar) ? dark.sidebar : DEFAULT_DARK_THEME.sidebar,
    accent: dark.accent === AUTO_ACCENT ? AUTO_ACCENT : hexOr(dark.accent, AUTO_ACCENT),
  };
}

/**
 * A usable Theme from anything: each missing or invalid value is replaced by its default, so a bad
 * colour can never break the page. Missing dark settings get the documented fallback.
 */
export function normaliseThemeConfig(value: unknown): ThemeConfig {
  const config = asRecord(value);
  if (config === null) return DEFAULT_THEME;
  return {
    page: isOneOf(PAGE_NAMES, config.page) ? config.page : DEFAULT_THEME.page,
    sidebar: hexOr(config.sidebar, DEFAULT_THEME.sidebar),
    accent: hexOr(config.accent, DEFAULT_THEME.accent),
    dark: normaliseDark(config.dark),
  };
}
