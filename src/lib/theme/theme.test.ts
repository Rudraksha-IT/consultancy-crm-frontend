import { contrastRatio, mixHex } from "./colour";
import {
  ACCENT_PRESETS,
  DARK_BASES,
  DARK_SIDEBAR_MODES,
  DEFAULT_THEME,
  PAGE_BACKGROUNDS,
  SIDEBAR_PRESETS,
  THEME_PRESETS,
} from "./options";
import { buildThemeTokens, deriveOfficeTokens, normaliseThemeConfig } from "./theme";
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
  const { light, dark } = deriveOfficeTokens(config);
  expectReadable(light);
  expectReadable(dark);
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
    const { light, dark, isSidebarLight } = buildThemeTokens();

    expect(isSidebarLight).toBe(true);
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

describe("deriveOfficeTokens (the colour editor's preview until ticket 04)", () => {
  it("derives the default Stone and emerald look", () => {
    const { light, dark, isSidebarLight } = deriveOfficeTokens(DEFAULT_THEME);

    expect(light.canvas).toBe("#f1f2ef");
    expect(light.paper).toBe("#ffffff");
    expect(light.accent).toBe("#047857");
    expect(light["accent-ink"]).toBe("#ffffff");
    expect(light["side-bg"]).toBe("#ffffff");
    expect(isSidebarLight).toBe(true);
    expect(dark.canvas).toBe("#1f1f21");
  });

  it("darkens an accent that is too light for white text", () => {
    const { light, isAccentAdjusted } = deriveOfficeTokens({ ...DEFAULT_THEME, accent: "#7dd3fc" });

    expect(isAccentAdjusted).toBe(true);
    expect(light.accent).not.toBe("#7dd3fc");
    expect(contrastRatio("#ffffff", light.accent)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("keeps an accent that is already readable", () => {
    expect(deriveOfficeTokens(DEFAULT_THEME).isAccentAdjusted).toBe(false);
  });

  it("uses white text on a dark sidebar", () => {
    const { light, isSidebarLight } = deriveOfficeTokens({ ...DEFAULT_THEME, sidebar: "#13294b" });

    expect(isSidebarLight).toBe(false);
    expect(light["side-ink"]).toBe("#ffffff");
  });

  it("uses a dark background from the fixed near-black list", () => {
    const { dark } = deriveOfficeTokens({
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
      expectReadable(deriveOfficeTokens({ ...DEFAULT_THEME, dark }).dark);
    }
  });

  it("falls back to the default instead of breaking on an invalid colour", () => {
    const broken = { ...DEFAULT_THEME, sidebar: "white", accent: "#12345" };

    expect(deriveOfficeTokens(broken)).toEqual(deriveOfficeTokens(DEFAULT_THEME));
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
    const { light, dark } = deriveOfficeTokens({
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
