import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The shell's sizes from design-system.md, Sidebar and Spacing (revised 2026-11-14, issue 91; the
 * Journey frame, UI revamp ticket 05).
 */
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const REM = 16;

function tokenPx(name: string): number {
  const match = new RegExp(`--spacing-${name}:\\s*([\\d.]+)rem;`).exec(css);
  if (!match?.[1]) throw new Error(`no --spacing-${name} in globals.css`);
  return Number(match[1]) * REM;
}

describe("shell sizes", () => {
  it("makes the side menu one strip 112 wide, with no wider one to open", () => {
    expect(tokenPx("rail")).toBe(112);
    expect(css).not.toContain("--spacing-sidebar:");
  });

  it("gives each page of the strip 66 of height, its label 13 on a 16 line", () => {
    expect(tokenPx("rail-item")).toBe(66);
    expect(css).toContain("--text-rail: 0.8125rem;");
    expect(css).toContain("--text-rail--line-height: 1rem;");
  });

  it("makes the office's top bar 60 tall on every width", () => {
    expect(tokenPx("office-bar")).toBe(60);
  });

  it("fades the side menu's links over their last 28, where they pass under the product's mark", () => {
    const fade = css.slice(css.indexOf("@utility menu-fade {"));
    expect(fade).toMatch(
      /^[^}]*mask-image: linear-gradient\(to bottom, black calc\(100% - 1\.75rem\), transparent\);/,
    );
  });

  it("makes the slide-out menu 320 wide (capped at 86% of the screen in the Sidebar)", () => {
    expect(tokenPx("drawer")).toBe(320);
  });

  it("keeps 26 on each side of the page content, and 16 on phones", () => {
    expect(css).toContain("--spacing-page: var(--size-page-margin);");
    expect(css).toContain("--size-page-margin: 1.625rem;");
    const phone = css.slice(css.indexOf("@media (width < 40.0625rem)"));
    expect(phone).toMatch(/^[^}]*--size-page-margin: 1rem;/);
  });
});
