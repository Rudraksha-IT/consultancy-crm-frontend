import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { MOVE } from ".";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function token(name: string): string | undefined {
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
}

function filesUnder(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("one place for durations and easings", () => {
  it("has one easing for arriving and one for leaving, the same in CSS and in code", () => {
    expect(MOVE.arrive).toBe("cubic-bezier(0.2, 0.8, 0.2, 1)");
    expect(MOVE.leave).toBe("cubic-bezier(0.4, 0, 1, 1)");
    expect(token("curve-arrive")).toBe(MOVE.arrive);
    expect(token("curve-leave")).toBe(MOVE.leave);
  });

  it.each(Object.entries(MOVE.ms))("keeps --move-%s equal to the code (%i ms)", (name, ms) => {
    expect(token(`move-${name}`)).toBe(`${String(ms)}ms`);
  });

  it.each(Object.entries(MOVE.step))(
    "keeps --move-step-%s equal to the code (%i ms)",
    (name, ms) => {
      expect(token(`move-step-${name}`)).toBe(`${String(ms)}ms`);
    },
  );

  it("is calm: what opens, closes or slides takes 100 to 320 ms", () => {
    const { wash, ring, spin, ...short } = MOVE.ms;

    expect(Object.values(short).every((ms) => ms >= 100 && ms <= 320)).toBe(true);
    // one turn of the product's mark, over and over while the mouse is on it, at the
    // loading mark's pace (owner, 2026-11-28)
    expect(spin).toBe(2000);
    expect(wash).toBeLessThanOrEqual(1200);
    expect(ring).toBeLessThanOrEqual(1200);
  });

  it("writes no time in the stylesheet outside the tokens, but for the loading mark", () => {
    const withoutTokens = css.replace(/--move-[\w-]+:\s*[^;]+;/g, "");
    const times = [...withoutTokens.matchAll(/(?<![\w.-])(\d*\.?\d+m?s)\b/g)].map(([, t]) => t);

    // the logo loader turns and breathes (2s), slowly with less motion (6s), and follows a pull (60ms)
    expect(times.sort()).toEqual(["2s", "2s", "60ms", "6s"]);
  });

  it("writes no easing curve in the stylesheet outside the tokens, but for the loading mark", () => {
    const curves = [...css.matchAll(/^(.*)cubic-bezier\(/gm)].map(([, before = ""]) => before);

    expect(
      curves.filter(
        (line) => !/--curve-(arrive|leave):/.test(line) && !line.includes("logo-loader"),
      ),
    ).toEqual([]);
  });

  it("lets no component write its own timing", () => {
    const OWN_TIMING =
      /\b(?:duration|delay)-\d|\b(?:duration|delay)-\[|cubic-bezier|\bduration:\s*\d|\b\d+ms\b/;
    const offenders = filesUnder(join(process.cwd(), "src/components")).filter((path) =>
      OWN_TIMING.test(readFileSync(path, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});

describe("the product's mark at the foot of the side menu", () => {
  it("keeps turning while the mouse is on it, never for a finger or with reduce motion on", () => {
    const guard = "@media (hover: hover) and (prefers-reduced-motion: no-preference)";
    const block = css.slice(css.indexOf(guard));

    expect(css).toContain(guard);
    expect(block).toMatch(
      /\[data-spins-on-hover\]:hover\s*\{\s*animation: move-spin var\(--move-spin\) linear infinite;/,
    );
  });
});
