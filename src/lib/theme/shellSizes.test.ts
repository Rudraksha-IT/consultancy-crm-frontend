import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The shell's sizes from design-system.md, Sidebar and Spacing (revised 2026-11-14, issue 91). */
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const REM = 16;

function tokenPx(name: string): number {
  const match = new RegExp(`--spacing-${name}:\\s*([\\d.]+)rem;`).exec(css);
  if (!match?.[1]) throw new Error(`no --spacing-${name} in globals.css`);
  return Number(match[1]) * REM;
}

describe("shell sizes", () => {
  it("opens the sidebar 300 wide", () => {
    expect(tokenPx("sidebar")).toBe(300);
  });

  it("collapses the sidebar to an 80 wide strip", () => {
    expect(tokenPx("rail")).toBe(80);
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
