import { contrastRatio } from "./colour";
import {
  ACCENT_PRESETS,
  DARK_BASES,
  DARK_SIDEBAR_MODES,
  DEFAULT_THEME,
  PAGE_BACKGROUNDS,
  SIDEBAR_PRESETS,
  THEME_PRESETS,
} from "./options";
import { buildThemeTokens, normaliseThemeConfig } from "./theme";
import type { ThemeConfig, ThemeTokens } from "./types";

const AA_TEXT = 4.5;
const RANDOM_CASES = 150;

/** A small deterministic generator, so the "random" colours are the same on every run. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function randomHex(next: () => number): string {
  const value = Math.floor(next() * 0x1_00_00_00);
  return `#${value.toString(16).padStart(6, "0")}`;
}

function pick<T>(items: readonly T[], next: () => number): T {
  const item = items[Math.floor(next() * items.length)];
  if (item === undefined) throw new Error("empty list");
  return item;
}

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

function expectReadableInBothModes(config: ThemeConfig): void {
  const { light, dark } = buildThemeTokens(config);
  expectReadable(light);
  expectReadable(dark);
}

describe("buildThemeTokens", () => {
  it("derives the default Stone and emerald look", () => {
    const { light, dark, isSidebarLight } = buildThemeTokens(DEFAULT_THEME);

    expect(light.canvas).toBe("#f1f2ef");
    expect(light.paper).toBe("#ffffff");
    expect(light.accent).toBe("#047857");
    expect(light["accent-ink"]).toBe("#ffffff");
    expect(light["side-bg"]).toBe("#ffffff");
    expect(isSidebarLight).toBe(true);
    expect(dark.canvas).toBe("#1f1f21");
  });

  it("darkens an accent that is too light for white text", () => {
    const { light, isAccentAdjusted } = buildThemeTokens({ ...DEFAULT_THEME, accent: "#7dd3fc" });

    expect(isAccentAdjusted).toBe(true);
    expect(light.accent).not.toBe("#7dd3fc");
    expect(contrastRatio("#ffffff", light.accent)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("keeps an accent that is already readable", () => {
    expect(buildThemeTokens(DEFAULT_THEME).isAccentAdjusted).toBe(false);
  });

  it("uses white text on a dark sidebar", () => {
    const { light, isSidebarLight } = buildThemeTokens({ ...DEFAULT_THEME, sidebar: "#13294b" });

    expect(isSidebarLight).toBe(false);
    expect(light["side-ink"]).toBe("#ffffff");
  });

  it("uses a dark background from the fixed near-black list", () => {
    const { dark } = buildThemeTokens({
      ...DEFAULT_THEME,
      dark: { base: "pure", sidebar: "same", accent: "auto" },
    });

    expect(dark.canvas).toBe("#000000");
    expect(dark["side-bg"]).toBe("#000000");
  });

  it.each(THEME_PRESETS)("keeps text readable for the $name preset", ({ config }) => {
    expectReadableInBothModes(config);
  });

  it.each(SIDEBAR_PRESETS.flatMap((sidebar) => ACCENT_PRESETS.map((accent) => [sidebar, accent])))(
    "keeps text readable for sidebar %o with accent %o",
    (sidebar, accent) => {
      expectReadableInBothModes({ ...DEFAULT_THEME, sidebar: sidebar.hex, accent: accent.hex });
    },
  );

  it("keeps text readable for random colours", () => {
    const next = seededRandom(42);
    for (let index = 0; index < RANDOM_CASES; index += 1) {
      expectReadableInBothModes({
        page: pick(PAGE_BACKGROUNDS, next).name,
        sidebar: randomHex(next),
        accent: randomHex(next),
        dark: {
          base: pick(DARK_BASES, next).name,
          sidebar: pick(DARK_SIDEBAR_MODES, next),
          accent: next() > 0.5 ? "auto" : randomHex(next),
        },
      });
    }
  });

  it("keeps dark mode readable for every background, sidebar and accent combination", () => {
    const accents = ["auto", ...ACCENT_PRESETS.map((accent) => accent.hex)];
    const combinations = DARK_BASES.flatMap((base) =>
      DARK_SIDEBAR_MODES.flatMap((sidebar) =>
        accents.map((accent) => ({ base: base.name, sidebar, accent })),
      ),
    );

    expect(combinations).toHaveLength(520);
    for (const dark of combinations) {
      expectReadable(buildThemeTokens({ ...DEFAULT_THEME, dark }).dark);
    }
  });

  it("falls back to the default instead of breaking on an invalid colour", () => {
    const broken = { ...DEFAULT_THEME, sidebar: "white", accent: "#12345" };

    expect(buildThemeTokens(broken)).toEqual(buildThemeTokens(DEFAULT_THEME));
  });
});

describe("normaliseThemeConfig", () => {
  it("keeps a valid config", () => {
    expect(normaliseThemeConfig(DEFAULT_THEME)).toEqual(DEFAULT_THEME);
  });

  it("returns the default for something that is not a theme", () => {
    expect(normaliseThemeConfig(null)).toEqual(DEFAULT_THEME);
    expect(normaliseThemeConfig("stone")).toEqual(DEFAULT_THEME);
  });

  it("replaces each bad field by its default, and missing dark settings by the fallback", () => {
    expect(normaliseThemeConfig({ page: "purple", sidebar: "#123456", accent: 7 })).toEqual({
      page: "stone",
      sidebar: "#123456",
      accent: "#047857",
      dark: { base: "soft", sidebar: "darker", accent: "auto" },
    });
  });

  it("replaces bad dark settings one by one", () => {
    expect(
      normaliseThemeConfig({
        ...DEFAULT_THEME,
        dark: { base: "navy", sidebar: "same", accent: "#ABCDEF" },
      }).dark,
    ).toEqual({ base: "soft", sidebar: "same", accent: "#abcdef" });
  });
});

describe("Theme values are safe to write into CSS", () => {
  const INJECTIONS = [
    "#047857; background: url(https://evil.example/x)",
    "#047857\n",
    "var(--bad)",
    "expression(alert(1))",
    "red",
    "",
  ];
  const STRICT_HEX = /^#[0-9a-f]{6}$/;

  it.each(INJECTIONS)("replaces %o by the default before it can reach the page", (value) => {
    const config = normaliseThemeConfig({
      page: value,
      sidebar: value,
      accent: value,
      dark: { base: value, sidebar: value, accent: value },
    });

    expect(config).toEqual({
      ...DEFAULT_THEME,
      dark: { base: "soft", sidebar: "darker", accent: "auto" },
    });
  });

  it.each(INJECTIONS)("only ever produces six-digit hex tokens, even from %o", (value) => {
    const { light, dark } = buildThemeTokens({
      ...DEFAULT_THEME,
      sidebar: value,
      accent: value,
      dark: { base: "soft", sidebar: "brand", accent: value },
    });

    expect(
      [...Object.values(light), ...Object.values(dark)].every((token) => STRICT_HEX.test(token)),
    ).toBe(true);
  });
});
