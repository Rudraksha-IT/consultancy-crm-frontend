import { TEST_COLOURS } from "@/lib/theme/testColours";
import { buildThemeTokens, deriveOfficeTokens, DEFAULT_THEME } from "@/lib/theme";

import { applyTheme } from "./applyTheme";

const NAVY_SIDEBAR = { ...DEFAULT_THEME, sidebar: TEST_COLOURS.navy, accent: TEST_COLOURS.crimson };

describe("applyTheme", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-side");
  });

  it("writes the light tokens, the mode and the sidebar kind onto the element", () => {
    const root = document.documentElement;
    const built = buildThemeTokens();

    applyTheme(root, built, "light");

    expect(root.style.getPropertyValue("--accent")).toBe(built.light.accent);
    expect(root.style.getPropertyValue("--side-bg")).toBe(built.light["side-bg"]);
    expect(root.dataset.theme).toBe("light");
    expect(root.dataset.side).toBe("plain");
  });

  it("writes the dark tokens in dark mode, where the sidebar is never a colour", () => {
    const root = document.documentElement;
    const built = buildThemeTokens();

    applyTheme(root, built, "dark");

    expect(root.style.getPropertyValue("--canvas")).toBe(built.dark.canvas);
    expect(root.dataset.theme).toBe("dark");
    expect(root.dataset.side).toBe("plain");
  });

  it("marks a coloured light-mode sidebar (the colour editor's preview, until ticket 04)", () => {
    const root = document.documentElement;

    applyTheme(root, deriveOfficeTokens(NAVY_SIDEBAR), "light");

    expect(root.dataset.side).toBe("coloured");
  });
});
