"use client";

import { useLayoutEffect } from "react";

import { buildThemeTokens, type ColourMode } from "@/lib/theme";

import { applyTheme } from "./applyTheme";

const IVORY = buildThemeTokens();

/**
 * Keep the page's tokens in step with the person's light or dark choice (one theme, Ivory). Done
 * before the screen is drawn, so the switch's cross-fade sees the new colours (Movement).
 */
export function useAppliedTheme(mode: ColourMode): void {
  useLayoutEffect(() => {
    applyTheme(document.documentElement, IVORY, mode);
  }, [mode]);
}
