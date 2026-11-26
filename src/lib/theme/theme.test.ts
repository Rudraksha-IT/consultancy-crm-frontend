import { contrastRatio, mixHex } from "./colour";
import * as themeModule from ".";
import { buildThemeTokens } from "./theme";
import type { ThemeTokens } from "./types";

const AA_TEXT = 4.5;

function expectReadable(tokens: ThemeTokens): void {
  expect(contrastRatio(tokens["accent-ink"], tokens.accent)).toBeGreaterThanOrEqual(AA_TEXT);
  expect(contrastRatio(tokens.accent, tokens.paper)).toBeGreaterThanOrEqual(AA_TEXT);
  expect(contrastRatio(tokens.ink, tokens.paper)).toBeGreaterThanOrEqual(AA_TEXT);
  expect(contrastRatio(tokens["ink-2"], tokens.paper)).toBeGreaterThanOrEqual(AA_TEXT);
  expect(contrastRatio(tokens["ink-3"], tokens.paper)).toBeGreaterThanOrEqual(AA_TEXT);
  expect(contrastRatio(tokens["side-ink"], tokens["side-bg"])).toBeGreaterThanOrEqual(AA_TEXT);
  expect(contrastRatio(tokens["side-muted"], tokens["side-bg"])).toBeGreaterThanOrEqual(AA_TEXT);
  expect(contrastRatio(tokens["side-active-ink"], tokens["side-bg"])).toBeGreaterThanOrEqual(
    AA_TEXT,
  );
}

describe("buildThemeTokens: the Ivory theme for every office", () => {
  it("gives the Ivory light tokens: cream page, white panels, burgundy actions", () => {
    const { light } = buildThemeTokens();

    expect(light.canvas).toBe("#faf8f4");
    expect(light.paper).toBe("#ffffff");
    expect(light.ink).toBe("#1f1916");
    expect(light["ink-2"]).toBe("#625750");
    expect(light.accent).toBe("#6e1a26");
    expect(light["accent-hover"]).toBe("#57141e");
    expect(light["accent-ink"]).toBe("#ffffff");
    expect(light.tint).toBe("#f3e6e3");
  });

  it("gives the Ivory dark tokens: warm near-black page, soft burgundy actions", () => {
    const { dark } = buildThemeTokens();

    expect(dark.canvas).toBe("#121110");
    expect(dark.paper).toBe("#1a1817");
    expect(dark.ink).toBe("#f1e8dd");
    expect(dark.accent).toBe("#d98a8f");
    expect(dark["accent-ink"]).toBe("#1d1012");
  });

  it("makes the menu part of the page", () => {
    const { light, dark } = buildThemeTokens();

    expect(light["side-bg"]).toBe(light.canvas);
    expect(light["side-ink"]).toBe(light.ink);
    expect(dark["side-bg"]).toBe(dark.canvas);
  });

  it("draws row lines at ink 15% (light) and 17% (dark), and the title line at ink 55%", () => {
    const { light, dark } = buildThemeTokens();

    expect(light.rule).toBe(mixHex(light.paper, light.ink, 0.15));
    expect(dark.rule).toBe(mixHex(dark.paper, dark.ink, 0.17));
    expect(light["rule-strong"]).toBe(mixHex(light.paper, light.ink, 0.55));
    expect(dark["rule-strong"]).toBe(mixHex(dark.paper, dark.ink, 0.55));
  });

  it("keeps every text colour readable on the panels and on the page itself", () => {
    const { light, dark } = buildThemeTokens();

    for (const tokens of [light, dark]) {
      expectReadable(tokens);
      for (const text of [tokens.ink, tokens["ink-2"], tokens["ink-3"], tokens.accent]) {
        expect(contrastRatio(text, tokens.canvas)).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it("only ever produces six-digit hex tokens", () => {
    const { light, dark } = buildThemeTokens();

    expect(
      [...Object.values(light), ...Object.values(dark)].every((token) =>
        /^#[0-9a-f]{6}$/.test(token),
      ),
    ).toBe(true);
  });
});

describe("office colours are gone (ticket 04)", () => {
  it("takes nothing: light and dark are all there is", () => {
    expect(buildThemeTokens).toHaveLength(0);
    expect(Object.keys(buildThemeTokens()).sort()).toEqual(["dark", "light"]);
  });

  it("gives the same tokens every time", () => {
    expect(buildThemeTokens()).toEqual(buildThemeTokens());
  });

  it.each([
    "deriveOfficeTokens",
    "normaliseThemeConfig",
    "DEFAULT_THEME",
    "THEME_PRESETS",
    "PAGE_BACKGROUNDS",
    "ACCENT_PRESETS",
    "SIDEBAR_PRESETS",
    "DARK_BASES",
  ])("no longer has %s", (name) => {
    expect(themeModule).not.toHaveProperty(name);
  });
});
