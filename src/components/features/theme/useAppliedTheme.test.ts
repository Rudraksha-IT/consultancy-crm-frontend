import { renderHook } from "@testing-library/react";

import { buildThemeTokens, DEFAULT_THEME, type ColourMode, type ThemeConfig } from "@/lib/theme";
import { CONTRASTING_THEME, resetTheme } from "@/test/themes";

import { useAppliedTheme } from "./useAppliedTheme";

afterEach(resetTheme);

const INITIAL: { config: ThemeConfig; mode: ColourMode } = { config: DEFAULT_THEME, mode: "light" };

describe("useAppliedTheme", () => {
  it("writes the Theme's tokens for the mode onto the page, and again when either changes", () => {
    const root = document.documentElement;
    const { rerender } = renderHook(
      ({ config, mode }) => {
        useAppliedTheme(config, mode);
      },
      { initialProps: INITIAL },
    );

    expect(root.style.getPropertyValue("--accent")).toBe(
      buildThemeTokens(DEFAULT_THEME).light.accent,
    );

    rerender({ config: CONTRASTING_THEME, mode: "dark" });

    expect(root.dataset.theme).toBe("dark");
    expect(root.style.getPropertyValue("--accent")).toBe(
      buildThemeTokens(CONTRASTING_THEME).dark.accent,
    );
  });
});
