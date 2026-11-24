import { render, screen } from "@testing-library/react";

import type { PullHint } from "@/lib/gestures";
import type { NavItem } from "@/lib/navigation";

import { PullGap } from "./PullGap";

const HOME: NavItem = { label: "Home", href: "/", icon: "home", group: "work" };

function hint(progress: number): PullHint<NavItem> {
  return { edge: "top", page: HOME, isReady: progress >= 1, progress, shift: 120 };
}

function mark(): SVGElement | null {
  return document.querySelector('[data-pull-gap="top"] svg[data-size="pull"]');
}

describe("the logo in the pull gap turns with the pull (list tidy-ups 20)", () => {
  it("shows the logo, not a bar, beside the words", () => {
    render(<PullGap edge="top" hint={hint(0.25)} isLeaving={false} />);

    expect(screen.getByText("Keep pulling to go to Home")).toBeInTheDocument();
    expect(mark()).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector("[data-pull-gap] .rounded-pill")).toBeNull();
  });

  it("turns a quarter at a quarter of the pull, its petals partly open", () => {
    render(<PullGap edge="top" hint={hint(0.25)} isLeaving={false} />);

    expect(mark()?.querySelector("[data-breathe]")).toHaveStyle({
      transform: "rotate(90deg) scale(0.6175)",
    });
  });

  it("has made one full turn, fully open, when letting go will change the page", () => {
    render(<PullGap edge="top" hint={hint(1)} isLeaving={false} />);

    expect(screen.getByText("Release to go to Home")).toBeInTheDocument();
    expect(mark()?.querySelector("[data-breathe]")).toHaveStyle({
      transform: "rotate(360deg) scale(1)",
    });
  });

  it("stands still otherwise: the pull moves it, not a timer", () => {
    render(<PullGap edge="top" hint={hint(0.5)} isLeaving={false} />);

    expect(mark()).toHaveAttribute("data-pull", "");
  });
});
