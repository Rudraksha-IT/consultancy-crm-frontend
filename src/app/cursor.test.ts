import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** The text of the first rule whose selector list starts with `selector`. */
function ruleOf(selector: string): string {
  const start = css.indexOf(`\n${selector}`);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("}", start));
}

function svgIn(token: string, block: string): string {
  const match = new RegExp(`--${token}:\\s*url\\("data:image/svg\\+xml,([^"]+)"\\)`).exec(block);
  return decodeURIComponent(match?.[1] ?? "");
}

describe("the burgundy arrow (owner, 2026-11-28)", () => {
  const light = ruleOf(":root {");
  const dark = ruleOf(':root[data-theme="dark"] {');

  it("draws the arrow and the hand in the accent, with an edge, in light and in dark", () => {
    for (const block of [light, dark]) {
      const accent = /--accent:\s*([^;]+);/.exec(block)?.[1] ?? "none";
      expect(svgIn("cursor-arrow", block)).toContain(`fill="${accent}"`);
      expect(svgIn("cursor-hand", block)).toContain(`fill="${accent}"`);
    }
    for (const block of [light, dark]) {
      // the computer's own cursor stands in if the picture can't be used
      expect(block).toMatch(/--cursor-arrow:[^;]+\)\s+4 3,\s+default;/);
      expect(block).toMatch(/--cursor-hand:[^;]+\)\s+10 3,\s+pointer;/);
    }
  });

  it("is the arrow everywhere, the hand on what can be clicked, and the text bar in a box", () => {
    expect(ruleOf("html,")).toContain("cursor: var(--cursor-arrow);");
    const hand = ruleOf("a[href],");
    expect(hand).toContain(".cursor-pointer");
    expect(hand).toContain("cursor: var(--cursor-hand);");
    expect(ruleOf("input:not(")).toContain("cursor: text;");
  });

  it("leaves no plain pointer behind in the stylesheet", () => {
    expect(css).not.toMatch(/cursor:\s*pointer;/);
  });
});
