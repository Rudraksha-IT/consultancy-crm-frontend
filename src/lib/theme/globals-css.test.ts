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
  const ivory = buildThemeTokens();

  it("starts with the Ivory light tokens", () => {
    expect(themedValues(declarations(":root"))).toEqual(ivory.light);
  });

  it("has the Ivory dark tokens for a dark choice", () => {
    expect(themedValues(declarations(':root[data-theme="dark"]'))).toEqual(ivory.dark);
  });

  it("has Ivory's own status colours, light and dark", () => {
    expect(declarations(":root").get("good")).toBe("#3f6b3a");
    expect(declarations(":root").get("bad")).toBe("#9b2226");
    expect(declarations(':root[data-theme="dark"]').get("good")).toBe("#8fbf85");
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
});
