import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildThemeTokens, DEFAULT_THEME, THEME_TOKEN_NAMES } from ".";

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
  const defaults = buildThemeTokens(DEFAULT_THEME);

  it("starts with the default Theme's light tokens", () => {
    expect(themedValues(declarations(":root"))).toEqual(defaults.light);
  });

  it("has the default Theme's dark tokens for a dark choice", () => {
    expect(themedValues(declarations(':root[data-theme="dark"]'))).toEqual(defaults.dark);
  });

  it("uses the same dark values when following a dark device", () => {
    expect(declarations(':root:not([data-theme="light"])')).toEqual(
      declarations(':root[data-theme="dark"]'),
    );
  });

  it("defines every token Tailwind maps to a class", () => {
    const defined = declarations(":root");
    const mapped = [...declarations("@theme inline").values()].flatMap((value) =>
      [...value.matchAll(/var\(--([\w-]+)\)/g)].map(([, name = ""]) => name),
    );

    const missing = mapped.filter((name) => name !== "font-public-sans" && !defined.has(name));

    expect(missing).toEqual([]);
  });
});
