import { mixHex, readableOn } from "./colour";
import type { ThemeTokens } from "./types";

/*
 * The Ivory theme (UI revamp, tickets 03 and 21): cream pages, white sheets and burgundy actions, the colours of a
 * rudraksha bead, in light and dark. One look for every office. Values from the approved prototype
 * (docs/prototype/v2.0.0/engine/looks.js, `ivory`, and polish.css).
 */

const AA_TEXT = 4.5;
// Lines are ink mixed into the panel colour (owner, 2026-11-25), so rows read apart at a glance.
// The strong line under a section title went with the sheets (ticket 21).
const LINE_MIX = {
  light: { rule: 0.15, rule2: 0.26 },
  dark: { rule: 0.17, rule2: 0.27 },
} as const;

type IvorySet = {
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

const LIGHT: IvorySet = {
  // a little deeper than the prototype's first cream, so white sheets stand off it (ticket 21)
  canvas: "#f6f3ed",
  paper: "#ffffff",
  fill: "#f4f1eb",
  fill2: "#ece7df",
  ink: "#1f1916",
  ink2: "#625750",
  ink3: "#8f847c",
  accent: "#6e1a26",
  accentHover: "#57141e",
  accentInk: "#ffffff",
  tint: "#f3e6e3",
};

const DARK: IvorySet = {
  canvas: "#121110",
  paper: "#1a1817",
  fill: "#211f1d",
  fill2: "#292624",
  ink: "#f1e8dd",
  ink2: "#bcae9f",
  ink3: "#8f8174",
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
function readableCaption(set: IvorySet): string {
  return readableOn(
    readableOn(set.ink3, set.canvas, set.ink, AA_TEXT),
    set.paper,
    set.ink,
    AA_TEXT,
  );
}

function ivoryTokens(set: IvorySet, lines: { rule: number; rule2: number }): ThemeTokens {
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

export const IVORY_LIGHT: ThemeTokens = ivoryTokens(LIGHT, LINE_MIX.light);
export const IVORY_DARK: ThemeTokens = ivoryTokens(DARK, LINE_MIX.dark);
