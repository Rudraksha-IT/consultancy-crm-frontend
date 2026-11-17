"use client";

import { useEffect, useMemo } from "react";

import { buildThemeTokens, type ColourMode, type ThemeConfig } from "@/lib/theme";

import { applyTheme } from "./applyTheme";

/** Keep the page's tokens in step with a Theme and a light/dark mode. */
export function useAppliedTheme(config: ThemeConfig, mode: ColourMode): void {
  const built = useMemo(() => buildThemeTokens(config), [config]);

  useEffect(() => {
    applyTheme(document.documentElement, built, mode);
  }, [built, mode]);
}
