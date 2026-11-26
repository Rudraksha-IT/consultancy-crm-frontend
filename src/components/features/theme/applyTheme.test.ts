import { buildThemeTokens } from "@/lib/theme";

import { applyTheme } from "./applyTheme";

describe("applyTheme", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-theme");
  });

  it("writes the light tokens and the mode onto the element", () => {
    const root = document.documentElement;
    const built = buildThemeTokens();

    applyTheme(root, built, "light");

    expect(root.style.getPropertyValue("--accent")).toBe(built.light.accent);
    expect(root.style.getPropertyValue("--side-bg")).toBe(built.light["side-bg"]);
    expect(root.dataset.theme).toBe("light");
  });

  it("writes the dark tokens in dark mode", () => {
    const root = document.documentElement;
    const built = buildThemeTokens();

    applyTheme(root, built, "dark");

    expect(root.style.getPropertyValue("--canvas")).toBe(built.dark.canvas);
    expect(root.dataset.theme).toBe("dark");
  });

  it("no longer marks the sidebar as coloured: there are no office colours", () => {
    const root = document.documentElement;

    applyTheme(root, buildThemeTokens(), "light");

    expect(root.dataset.side).toBeUndefined();
  });
});
