import { mixHex, readableOn } from "./colour";
import type { ThemeTokens } from "./types";

/*
 * The Porcelain theme (owner, 2026-11-27; it replaced Ivory): cool blue-white pages, white sheets,
 * blue-grey text and burgundy actions, so the burgundy stands out the most. In light and dark, one
 * look for every office. Values from the prototype (docs/prototype/v2.0.0/engine/looks.js,
 * `porcelain`); the dark text is the prototype's cool menu text.
 */

const AA_TEXT = 4.5;
// Lines are ink mixed into the panel colour (owner, 2026-11-25), so rows read apart at a glance.
// The strong line under a section title went with the sheets (ticket 21).
const LINE_MIX = {
  light: { rule: 0.15, rule2: 0.26 },
  dark: { rule: 0.17, rule2: 0.27 },
} as const;

type PorcelainSet = {
  canvas: string;
  paper: string;
  fill: string;
  fill2: string;
  ink: string;
  ink2: string;
  ink3: string;
  accent: string;
  accentHover: string;
  accentInk: string;
  tint: string;
};

const LIGHT: PorcelainSet = {
  canvas: "#f3f6f9",
  paper: "#ffffff",
  fill: "#eaeff4",
  fill2: "#dde4ec",
  ink: "#16202b",
  ink2: "#4d5b6a",
  ink3: "#7a8797",
  accent: "#6e1a26",
  accentHover: "#57141e",
  accentInk: "#ffffff",
  tint: "#f3e6e3",
};

const DARK: PorcelainSet = {
  canvas: "#0d1115",
  paper: "#141a20",
  fill: "#1a2128",
  fill2: "#212a32",
  ink: "#e3eaf1",
  ink2: "#9aa9b8",
  ink3: "#7a8797",
  accent: "#d98a8f",
  accentHover: "#e7a2a6",
  accentInk: "#1d1012",
  tint: "#3a1d1f",
};

/**
 * Captions also sit straight on the page (a page's sub-line, a count under a sheet), so the
 * quietest text is made readable on the page colour, the darker of the two backgrounds in light
 * mode (design system rule 4).
 */
function readableCaption(set: PorcelainSet): string {
  return readableOn(
    readableOn(set.ink3, set.canvas, set.ink, AA_TEXT),
    set.paper,
    set.ink,
    AA_TEXT,
  );
}

function porcelainTokens(set: PorcelainSet, lines: { rule: number; rule2: number }): ThemeTokens {
  const line = (amount: number): string => mixHex(set.paper, set.ink, amount);
  return {
    paper: set.paper,
    canvas: set.canvas,
    fill: set.fill,
    "fill-2": set.fill2,
    rule: line(lines.rule),
    "rule-2": line(lines.rule2),
    ink: set.ink,
    "ink-2": set.ink2,
    "ink-3": readableCaption(set),
    accent: set.accent,
    "accent-hover": set.accentHover,
    "accent-ink": set.accentInk,
    tint: set.tint,
    // The menu is part of the page: the page colour, page text, and no line beside it.
    "side-bg": set.canvas,
    "side-ink": set.ink,
    "side-muted": set.ink2,
    "side-hover": set.fill,
    "side-active": set.fill2,
    "side-active-ink": set.ink,
    "side-rule": set.canvas,
  };
}

export const PORCELAIN_LIGHT: ThemeTokens = porcelainTokens(LIGHT, LINE_MIX.light);
export const PORCELAIN_DARK: ThemeTokens = porcelainTokens(DARK, LINE_MIX.dark);
