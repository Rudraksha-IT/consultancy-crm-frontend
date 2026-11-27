import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildThemeTokens, THEME_TOKEN_NAMES } from ".";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** The `--name: value` declarations inside the first block that starts with `selector {`. */
function declarations(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block for ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf("\n}", start));
  const pairs = [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(
    ([, name = "", value = ""]) => [name, value.trim()] as const,
  );
  return new Map(pairs);
}

function themedValues(block: Map<string, string>): Record<string, string | undefined> {
  return Object.fromEntries(THEME_TOKEN_NAMES.map((name) => [name, block.get(name)]));
}

describe("globals.css", () => {
  const porcelain = buildThemeTokens();

  it("starts with the Porcelain light tokens", () => {
    expect(themedValues(declarations(":root"))).toEqual(porcelain.light);
  });

  it("has the Porcelain dark tokens for a dark choice", () => {
    expect(themedValues(declarations(':root[data-theme="dark"]'))).toEqual(porcelain.dark);
  });

  it("keeps the status colours, light and dark, and a cool gold", () => {
    expect(declarations(":root").get("good")).toBe("#3f6b3a");
    expect(declarations(":root").get("bad")).toBe("#9b2226");
    expect(declarations(':root[data-theme="dark"]').get("good")).toBe("#8fbf85");
    expect(declarations(":root").get("gold")).toBe("#55708d");
    expect(declarations(':root[data-theme="dark"]').get("gold")).toBe("#9fb6cf");
  });

  it("uses one font, Geist", () => {
    expect(css).toContain("--font-sans: var(--font-geist)");
    expect(css).not.toContain("public-sans");
  });

  it("never follows a dark device: dark only by choice", () => {
    expect(css).not.toContain("prefers-color-scheme");
    expect(css).not.toContain(':root:not([data-theme="light"])');
  });

  it("defines every token Tailwind maps to a class", () => {
    const defined = declarations(":root");
    const mapped = [...declarations("@theme inline").values()].flatMap((value) =>
      [...value.matchAll(/var\(--([\w-]+)\)/g)].map(([, name = ""]) => name),
    );

    const missing = mapped.filter((name) => name !== "font-geist" && !defined.has(name));

    expect(missing).toEqual([]);
  });

  it("draws a sheet: a faint shadow in light, none in dark, and a quieter border in dark", () => {
    expect(declarations(":root").get("raise")).toBe("0 1px 2px rgb(22 32 43 / 0.05)");
    expect(declarations(":root").get("sheet-rule")).toBe("var(--rule)");
    expect(declarations(':root[data-theme="dark"]').get("raise")).toBe("none");
    expect(declarations(':root[data-theme="dark"]').get("sheet-rule")).toBe(
      "color-mix(in srgb, var(--ink) 13%, var(--paper))",
    );
  });

  it("keeps rows 18 from a sheet's sides, 14 on phones", () => {
    expect(declarations(":root").get("size-gutter")).toBe("1.125rem");
    expect(css).toMatch(
      /@media \(width < 40\.0625rem\) \{\s*:root \{[^}]*--size-gutter: 0\.875rem;/,
    );
  });

  it("deepens the five beads of the thread from Lead to Visa, light green to dark green, brighter in dark", () => {
    const mixes = (block: Map<string, string>): (string | undefined)[] =>
      [1, 2, 3, 4, 5].map((bead) => block.get(`bead-${String(bead)}`));
    const mix = (amount: string): string =>
      `color-mix(in srgb, var(--good) ${amount}, var(--paper))`;

    expect(mixes(declarations(":root"))).toEqual([
      mix("30%"),
      mix("47.5%"),
      mix("65%"),
      mix("82.5%"),
      "var(--good)",
    ]);
    expect(mixes(declarations(':root[data-theme="dark"]'))).toEqual([
      mix("44%"),
      mix("58%"),
      mix("72%"),
      mix("86%"),
      "var(--good)",
    ]);
  });
});

describe("one type scale (ticket 21)", () => {
  const SIZES = [12, 13, 14, 15, 16, 18, 20, 24, 28, 32];
  const WEIGHTS = [400, 500, 600];
  // Sizes that are not text: margins, bars, corners, padding.
  const NOT_TEXT = /^--size-(page-margin|topbar|panel-corner|button-pad|gutter|content)/;
  const TEXT_SIZE = /^\s*(--size-[\w-]+|--text-(?:[a-z0-9]+-)*[a-z0-9]+|font-size):\s*([^;]+);/gm;

  function textSizes(): number[] {
    return [...css.matchAll(TEXT_SIZE)]
      .filter(([, name = ""]) => !NOT_TEXT.test(name) && !name.endsWith("-line"))
      .flatMap(([, , value = ""]) => [...value.matchAll(/([\d.]+)rem/g)])
      .map(([, rem = "0"]) => Number(rem) * 16);
  }

  it("holds only the ten sizes", () => {
    const sizes = textSizes();

    expect(sizes.length).toBeGreaterThan(30);
    expect([...new Set(sizes)].filter((size) => !SIZES.includes(size))).toEqual([]);
  });

  it("holds only the three weights", () => {
    const weights = [...css.matchAll(/font-weight:\s*(\d+)/g)].map(([, weight]) => Number(weight));

    expect(weights.length).toBeGreaterThan(5);
    expect([...new Set(weights)].filter((weight) => !WEIGHTS.includes(weight))).toEqual([]);
  });

  it.each([
    ["size-section-title", "1.125rem"],
    ["size-name", "1.125rem"],
    ["size-secondary", "0.9375rem"],
    ["size-head", "0.875rem"],
    ["size-button", "0.9375rem"],
    ["size-email-name", "1.25rem"],
    ["size-uni-name", "1.25rem"],
  ])("sets %s to %s on computers", (name, value) => {
    expect(declarations(":root").get(name)).toBe(value);
  });

  it("balances the lines of titles", () => {
    expect(css).toMatch(/h1,\s*h2,\s*h3 \{\s*text-wrap: balance;/);
  });

  it("lets the page grow on wide screens: 1240, then 1400 from 1600, then 1560 from 2200", () => {
    expect(declarations(":root").get("size-content")).toBe("77.5rem");
    expect(css).toMatch(/@media \(width >= 100rem\) \{\s*:root \{\s*--size-content: 87\.5rem;/);
    expect(css).toMatch(/@media \(width >= 137\.5rem\) \{\s*:root \{\s*--size-content: 97\.5rem;/);
  });
});
