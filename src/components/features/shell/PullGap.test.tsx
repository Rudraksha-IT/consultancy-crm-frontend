import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";

import { PULL_DISTANCE, pullHint, type PageEdge, type PullHint } from "@/lib/gestures";
import type { NavItem } from "@/lib/navigation";

import { PullGap } from "./PullGap";

const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

const HOME: NavItem = { label: "Home", href: "/", icon: "home", group: "work" };
const TASKS: NavItem = { label: "Tasks", href: "/tasks", icon: "tasks", group: "work" };

/** The gap's hint for a pull this far, as the shell works it out. */
function hint(distance: number, edge: PageEdge = "top"): PullHint<NavItem> {
  const made = pullHint({ edge, distance }, { previous: HOME, next: TASKS });
  if (made === null) throw new Error("This pull has a page to go to.");
  return made;
}

function logo(edge: PageEdge = "top"): HTMLElement {
  const found = document.querySelector<HTMLElement>(
    `[data-pull-gap="${edge}"] svg[data-size="pull"] [data-breathe]`,
  );
  if (found === null) throw new Error("The pull gap shows no logo.");
  return found;
}

function turnOf(element: HTMLElement): number {
  return Number.parseFloat(element.style.getPropertyValue("--pull-turn"));
}

function loaderRules(): string {
  const start = GLOBALS_CSS.indexOf("The logo loader");
  return GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("End of the logo loader", start));
}

describe("the logo in the pull gap (list tidy-ups 20; UI revamp, ticket 19)", () => {
  it("shows the logo, not a bar, beside the words", () => {
    render(<PullGap edge="top" hint={hint(90)} isLeaving={false} />);

    expect(screen.getByText("Keep pulling to go to Home")).toBeInTheDocument();
    expect(logo().closest("svg")).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector("[data-pull-gap] .rounded-pill")).toBeNull();
  });

  it("turns 3 degrees for each pixel of the gap, clockwise when pulled down", () => {
    const pulled = hint(90);
    render(<PullGap edge="top" hint={pulled} isLeaving={false} />);

    expect(logo().style.getPropertyValue("--pull-turn")).toBe(
      `${String(Math.round(pulled.shift * 3))}deg`,
    );
    expect(turnOf(logo())).toBeGreaterThan(0);
  });

  it("turns the other way when the bottom is pulled up", () => {
    render(<PullGap edge="bottom" hint={hint(90, "bottom")} isLeaving={false} />);

    expect(turnOf(logo("bottom"))).toBe(-Math.round(hint(90).shift * 3));
  });

  it("turns back as the gap shrinks, in place: the same logo, never drawn again", () => {
    const view = render(<PullGap edge="top" hint={hint(200)} isLeaving={false} />);
    const first = logo();
    const far = turnOf(first);

    view.rerender(<PullGap edge="top" hint={hint(60)} isLeaving={false} />);

    expect(logo()).toBe(first);
    expect(turnOf(first)).toBeLessThan(far);
    expect(turnOf(first)).toBe(Math.round(hint(60).shift * 3));
  });

  it("grows from a small flower to full size by the point where letting go changes the page", () => {
    const view = render(<PullGap edge="top" hint={hint(PULL_DISTANCE / 4)} isLeaving={false} />);
    expect(logo().style.getPropertyValue("--pull-open")).toBe("0.6175");

    view.rerender(<PullGap edge="top" hint={hint(PULL_DISTANCE)} isLeaving={false} />);

    expect(screen.getByText("Release to go to Home")).toBeInTheDocument();
    expect(logo().style.getPropertyValue("--pull-open")).toBe("1");
  });

  it("is moved by the pull, not by a timer", () => {
    render(<PullGap edge="top" hint={hint(180)} isLeaving={false} />);

    expect(logo().closest("svg")).toHaveAttribute("data-pull", "");
    expect(loaderRules()).toMatch(
      /\.logo-loader\[data-pull\] \.logo-loader-breathe \{[^}]*transform: rotate\(var\(--pull-turn\)\) scale\(var\(--pull-open\)\)/,
    );
  });

  it("stays still with reduced motion: no turning and no growing", () => {
    const reduced = loaderRules().slice(loaderRules().indexOf("prefers-reduced-motion: reduce"));

    expect(reduced).toMatch(
      /\.logo-loader\[data-pull\] \.logo-loader-breathe \{[^}]*transform: none;[^}]*transition: none;/,
    );
  });
});
