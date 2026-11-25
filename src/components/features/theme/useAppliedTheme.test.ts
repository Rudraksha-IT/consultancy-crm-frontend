import { renderHook } from "@testing-library/react";

import { buildThemeTokens, type ColourMode } from "@/lib/theme";
import { resetTheme } from "@/test/themes";

import { useAppliedTheme } from "./useAppliedTheme";

afterEach(resetTheme);

const INITIAL: { mode: ColourMode } = { mode: "light" };

describe("useAppliedTheme", () => {
  it("writes the Ivory tokens for the mode onto the page, and again when the mode changes", () => {
    const root = document.documentElement;
    const { rerender } = renderHook(
      ({ mode }) => {
        useAppliedTheme(mode);
      },
      { initialProps: INITIAL },
    );

    expect(root.style.getPropertyValue("--accent")).toBe(buildThemeTokens().light.accent);

    rerender({ mode: "dark" });

    expect(root.dataset.theme).toBe("dark");
    expect(root.style.getPropertyValue("--accent")).toBe(buildThemeTokens().dark.accent);
  });
});
