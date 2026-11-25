"use client";

import { useEffect } from "react";

import { buildThemeTokens, type ColourMode } from "@/lib/theme";

import { applyTheme } from "./applyTheme";

const IVORY = buildThemeTokens();

/** Keep the page's tokens in step with the person's light or dark choice (one theme, Ivory). */
export function useAppliedTheme(mode: ColourMode): void {
  useEffect(() => {
    applyTheme(document.documentElement, IVORY, mode);
  }, [mode]);
}
