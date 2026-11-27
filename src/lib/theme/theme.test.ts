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

describe("buildThemeTokens: the Porcelain theme for every office", () => {
  it("gives the Porcelain light tokens: a cool blue-white page, blue-grey text, burgundy actions", () => {
    const { light } = buildThemeTokens();

    expect(light.canvas).toBe("#f3f6f9");
    expect(light.paper).toBe("#ffffff");
    expect(light.fill).toBe("#eaeff4");
    expect(light["fill-2"]).toBe("#dde4ec");
    expect(light.ink).toBe("#16202b");
    expect(light["ink-2"]).toBe("#4d5b6a");
    expect(light.accent).toBe("#6e1a26");
    expect(light["accent-hover"]).toBe("#57141e");
    expect(light["accent-ink"]).toBe("#ffffff");
    expect(light.tint).toBe("#f3e6e3");
  });

  it("gives the Porcelain dark tokens: cool near-black page, cool text, soft burgundy actions", () => {
    const { dark } = buildThemeTokens();

    expect(dark.canvas).toBe("#0d1115");
    expect(dark.paper).toBe("#141a20");
    expect(dark.ink).toBe("#e3eaf1");
    expect(dark["ink-2"]).toBe("#9aa9b8");
    expect(dark.accent).toBe("#d98a8f");
    expect(dark["accent-ink"]).toBe("#1d1012");
  });

  it("makes the menu part of the page", () => {
    const { light, dark } = buildThemeTokens();

    expect(light["side-bg"]).toBe(light.canvas);
    expect(light["side-ink"]).toBe(light.ink);
    expect(dark["side-bg"]).toBe(dark.canvas);
  });

  it("draws row lines at ink 15% (light) and 17% (dark), with no strong title line (ticket 21)", () => {
    const { light, dark } = buildThemeTokens();

    expect(light.rule).toBe(mixHex(light.paper, light.ink, 0.15));
    expect(dark.rule).toBe(mixHex(dark.paper, dark.ink, 0.17));
    expect(light).not.toHaveProperty("rule-strong");
    expect(dark).not.toHaveProperty("rule-strong");
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
